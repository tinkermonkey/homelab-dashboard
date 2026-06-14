import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import type { LAB_DATA, DOCKER_DATA, TOPOLOGY_DATA, STATUS_DATA, Alert, NETWORK_DATA } from '@homelab/shared';
import { registerRoutes } from './index.js';
import { getCachedData, clearCache } from './cache.js';
import { fetchWithTimeout } from './utils/fetch-with-timeout.js';

// Mock modules
vi.mock('./mock-data.js', () => ({
  getLabData: vi.fn(() => mockLabData),
  getDockerData: vi.fn(() => mockDockerData),
  getTopologyData: vi.fn(() => mockTopologyData),
  getStatusData: vi.fn(() => mockStatusData),
  getActiveAlerts: vi.fn(() => mockAlerts),
}));

vi.mock('./cache.js');
vi.mock('./transformers/metrics-transformer.js');
vi.mock('./transformers/mcp-transformer.js');
vi.mock('./clients/signoz-client.js');
vi.mock('./utils/fetch-with-timeout.js');

vi.mock('./config.js', () => ({
  config: {
    port: 3001,
    host: 'localhost',
    signozUrl: 'http://signoz:4317',
    signozApiToken: '',
    ntopngUrl: 'http://ntopng:3000',
    ntopngToken: '',
    elastiflowUrl: 'http://elastiflow:9200',
    elastiflowUser: 'elastic',
    elastiflowPassword: 'secret',
    phoneHomeUrl: 'http://phone-home:8000',
    phoneHomeChatUrl: 'http://phone-home:8000/chat',
    phoneHomeChatToken: 'test-bearer-token',
    logLevel: 'info',
  },
}));

const mockLabData: LAB_DATA = {
  cluster: {
    name: 'test-cluster',
    location: 'rack-01',
    domain: 'lab.local',
    powerDraw: 412,
    powerAvg: 404,
    uptimeDays: 127,
    uptimeHours: 4,
    egressTodayGB: 48.3,
    egressDelta: -12,
    activeAlerts: 2,
    lastSync: '2 min ago',
  },
  servers: [],
  gateway: {
    isp: 'ISP',
    plan: 'Plan',
    publicIp: '1.1.1.1',
    hostname: 'gw.lab.local',
    geo: 'US',
    status: 'online',
    statusFor: '127d',
    asn: '12345',
    wanIf: 'eth0',
    pingMs: 0,
    pingHist: [],
    jitterMs: 0,
    lossPct: 0,
    lossHist: [],
    downMbps: 0,
    upMbps: 0,
    downHist: [],
    upHist: [],
    egressTodayGB: 0,
    ingressTodayGB: 0,
    egressMonthTB: 0,
    blockedPct: 0,
    dnsResolved: 0,
    dnsBlocked: 0,
    vpnPeers: 0,
    vpnPeersActive: 0,
  },
  apps: [],
  bots: [],
  threadByBot: {},
};

const mockDockerData: DOCKER_DATA = {
  hosts: [],
};

const mockLogEntries = [
  {
    id: 'trace-1',
    timestamp: 1718000000000,
    level: 'INFO' as const,
    op: 'phone-home',
    target: 'phone-home',
    message: 'request handled',
  },
];

const mockStorageData = {
  filesystems: [
    { host: 't5610', mount: '/', usedPct: 42.5, usedBytes: 100, totalBytes: 200, freeBytes: 100 },
  ],
  degraded: [],
  source: 'real' as const,
};

const mockNetworkData: NETWORK_DATA = {
  subsystems: [],
  clients: { total: 0, wired: 0, wireless: 0, topTalkers: [] },
  gateway: { cpuPct: 0, memPct: 0 },
  ipsEvents: [],
  events: [],
};

const mockTopologyData: TOPOLOGY_DATA = {
  hosts: [],
  bots: [],
};

const mockStatusData: STATUS_DATA = {
  cpu: 45,
  ping: 25,
  downMbps: 500,
  upMbps: 100,
  alertCount: 2,
  alertPrimary: 'HighCPU',
};

const mockAlerts: Alert[] = [
  {
    name: 'HighCPU',
    severity: 'critical',
    state: 'active',
    labels: { alertname: 'HighCPU' },
  },
];

// Build a streaming-capable mock Response for the chat proxy (uses global fetch).
function streamingChatResponse(chunks: string[] = [], status = 200) {
  const reads = chunks.map((c) => ({ done: false, value: new TextEncoder().encode(c) }));
  reads.push({ done: true } as never);
  let i = 0;
  return {
    ok: status >= 200 && status < 300,
    status,
    body: {
      getReader: () => ({
        read: vi.fn(async () => (i < reads.length ? reads[i++] : { done: true })),
        cancel: vi.fn(async () => {}),
      }),
    },
  } as unknown as Response;
}

describe('Server Routes', () => {
  let fastify: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    vi.clearAllMocks();
    clearCache();

    // Chat proxy uses global fetch (not fetchWithTimeout); default to a benign stream.
    global.fetch = vi.fn().mockResolvedValue(streamingChatResponse(['data: test\n\n']));

    fastify = Fastify({ logger: false });
    await fastify.register(cors, {
      origin: ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true,
    });

    // Register the actual routes from index.ts
    await registerRoutes(fastify);
  });

  afterEach(async () => {
    await fastify.close();
    vi.clearAllMocks();
  });

  describe('GET /api/status', () => {
    it('returns status data', async () => {
      vi.mocked(getCachedData).mockResolvedValue(mockStatusData);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/status',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(mockStatusData);
    });

    it('returns 500 when cache fails', async () => {
      vi.mocked(getCachedData).mockRejectedValue(new Error('Cache error'));

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/status',
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body)).toEqual({ error: 'Failed to fetch status' });
    });
  });

  describe('GET /api/cluster', () => {
    it('returns cluster data with status 200 when no degradation', async () => {
      const clusterData = { ...mockLabData, degraded: [] };
      vi.mocked(getCachedData).mockResolvedValue(clusterData);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/cluster',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).degraded).toEqual([]);
    });

    it('returns cluster data with status 206 when degraded', async () => {
      const clusterData = { ...mockLabData, degraded: ['signoz'] };
      vi.mocked(getCachedData).mockResolvedValue(clusterData);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/cluster',
      });

      expect(response.statusCode).toBe(206);
      expect(JSON.parse(response.body).degraded).toEqual(['signoz']);
    });

    it('returns 500 when cache fails', async () => {
      vi.mocked(getCachedData).mockRejectedValue(new Error('Cache error'));

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/cluster',
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body)).toEqual({ error: 'Failed to fetch cluster data' });
    });
  });

  describe('GET /api/docker', () => {
    it('returns docker data with status 200 when no degradation', async () => {
      const dockerData = { ...mockDockerData, degraded: [], source: 'real' };
      vi.mocked(getCachedData).mockResolvedValue(dockerData);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/docker',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).degraded).toEqual([]);
      expect(JSON.parse(response.body).source).toBe('real');
    });

    it('returns docker data with status 206 when degraded', async () => {
      const dockerData = { ...mockDockerData, degraded: ['phone-home'], source: 'mock' };
      vi.mocked(getCachedData).mockResolvedValue(dockerData);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/docker',
      });

      expect(response.statusCode).toBe(206);
      expect(JSON.parse(response.body).degraded).toEqual(['phone-home']);
      expect(JSON.parse(response.body).source).toBe('mock');
    });
  });

  describe('GET /api/topology', () => {
    it('returns topology data with status 200 when no degradation', async () => {
      const topoData = { ...mockTopologyData, degraded: [], source: 'real' };
      vi.mocked(getCachedData).mockResolvedValue(topoData);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/topology',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).degraded).toEqual([]);
      expect(JSON.parse(response.body).source).toBe('real');
    });

    it('returns topology data with status 206 when degraded', async () => {
      const topoData = { ...mockTopologyData, degraded: ['phone-home'], source: 'mock' };
      vi.mocked(getCachedData).mockResolvedValue(topoData);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/topology',
      });

      expect(response.statusCode).toBe(206);
      expect(JSON.parse(response.body).source).toBe('mock');
    });
  });

  describe('GET /api/network', () => {
    it('returns network data with status 200 when no degradation', async () => {
      const networkData = { ...mockNetworkData, degraded: [], source: 'real' as const };
      vi.mocked(getCachedData).mockResolvedValue(networkData);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/network',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).degraded).toEqual([]);
      expect(JSON.parse(response.body).source).toBe('real');
    });

    it('returns network data with status 206 when degraded', async () => {
      const networkData = { ...mockNetworkData, degraded: ['udm-health'], source: 'unavailable' as const };
      vi.mocked(getCachedData).mockResolvedValue(networkData);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/network',
      });

      expect(response.statusCode).toBe(206);
      expect(JSON.parse(response.body).degraded).toEqual(['udm-health']);
      expect(JSON.parse(response.body).source).toBe('unavailable');
    });

    it('returns 500 when cache fails', async () => {
      vi.mocked(getCachedData).mockRejectedValue(new Error('Cache error'));

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/network',
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body)).toEqual({ error: 'Failed to fetch network data' });
    });
  });

  describe('GET /api/alerts', () => {
    it('returns alerts from alertmanager when available', async () => {
      const alertData = { alerts: mockAlerts, source: 'alertmanager' };
      vi.mocked(getCachedData).mockResolvedValue(alertData);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/alerts',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.alerts).toEqual(mockAlerts);
      expect(body.source).toBe('alertmanager');
    });

    it('falls back to mock alerts when alertmanager fails', async () => {
      const alertData = { alerts: mockAlerts, source: 'mock' };
      vi.mocked(getCachedData).mockResolvedValue(alertData);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/alerts',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.source).toBe('mock');
    });

    it('returns 500 when cache fails', async () => {
      vi.mocked(getCachedData).mockRejectedValue(new Error('Cache error'));

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/alerts',
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body)).toEqual({ error: 'Failed to fetch alerts' });
    });
  });

  describe('POST /api/chat/:threadId', () => {
    it('returns 400 for invalid thread ID format', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/chat/invalid@bot',
        payload: { message: 'hello' },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toEqual({ error: 'Invalid thread ID format' });
    });

    it('rejects thread IDs exceeding 64 characters', async () => {
      const longThreadId = 'a'.repeat(65);
      const response = await fastify.inject({
        method: 'POST',
        url: `/api/chat/${longThreadId}`,
        payload: { message: 'hello' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('accepts valid thread IDs with alphanumeric, underscore, and hyphen', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/chat/valid-bot_123',
        payload: { message: 'hello' },
      });

      // Thread ID validation should pass (not return 400)
      expect(response.statusCode).not.toBe(400);
    });

    it('returns 400 when message is missing', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/chat/test-bot',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toEqual({ error: 'Message is required' });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns 400 when message is blank/whitespace', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/chat/test-bot',
        payload: { message: '   ' },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toEqual({ error: 'Message is required' });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns 413 for oversized request body', async () => {
      const largePayload = { message: 'x'.repeat(1024 * 1024 + 1) };
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/chat/test-bot',
        payload: largePayload,
      });

      expect(response.statusCode).toBe(413);
      const body = JSON.parse(response.body);
      // Fastify returns its own error format for payload size
      expect(body.statusCode).toBe(413);
      expect(body.message).toContain('too large');
    });

    it('returns upstream status when chat service is unavailable', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response('Service Unavailable', { status: 503 })
      );

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/chat/test-bot',
        payload: { message: 'hello' },
      });

      expect(response.statusCode).toBe(503);
      expect(JSON.parse(response.body)).toEqual({ error: 'Service Unavailable' });
    });

    it('returns 500 when chat service throws error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/chat/test-bot',
        payload: { message: 'hello' },
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body)).toEqual({ error: 'Chat service error' });
    });

    it('calls global fetch (not fetchWithTimeout) for the chat upstream', async () => {
      await fastify.inject({
        method: 'POST',
        url: '/api/chat/test-bot',
        payload: { message: 'hello' },
      });

      expect(global.fetch).toHaveBeenCalled();
      expect(fetchWithTimeout).not.toHaveBeenCalled();
    });

    it('sends Bearer token in Authorization header when token is configured', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/chat/test-bot',
        payload: { message: 'hello' },
      });

      expect(response.statusCode).toBe(200);
      expect(global.fetch).toHaveBeenCalled();
      const call = vi.mocked(global.fetch).mock.calls.at(-1)!;
      const init = call[1] as RequestInit;
      expect(init.headers).toEqual(
        expect.objectContaining({
          Authorization: 'Bearer test-bearer-token',
        })
      );
    });

    it('successfully streams chat responses from phone-home', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/chat/test-bot',
        payload: { message: 'hello' },
      });

      expect(response.statusCode).toBe(200);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('targets config.phoneHomeChatUrl (no id appended to URL)', async () => {
      await fastify.inject({
        method: 'POST',
        url: '/api/chat/my-custom-bot',
        payload: { message: 'test' },
      });

      expect(global.fetch).toHaveBeenCalled();
      const call = vi.mocked(global.fetch).mock.calls[0];
      expect(call[0]).toBe('http://phone-home:8000/chat');
    });

    it('reshapes the body into a phone-home chat-completions request', async () => {
      await fastify.inject({
        method: 'POST',
        url: '/api/chat/my-thread',
        payload: { message: 'test message' },
      });

      expect(global.fetch).toHaveBeenCalled();
      const call = vi.mocked(global.fetch).mock.calls[0];
      const init = call[1] as RequestInit;
      expect(JSON.parse(init.body as string)).toEqual({
        model: 'claude',
        stream: true,
        user: 'my-thread',
        messages: [{ role: 'user', content: 'test message' }],
      });
    });

    it('omits Authorization header when token is not configured', async () => {
      // Override config to have empty token for this specific test
      const configModule = await import('./config.js');
      const mutableConfig = configModule.config as unknown as Record<string, string>;
      const originalToken = mutableConfig.phoneHomeChatToken;
      mutableConfig.phoneHomeChatToken = '';

      try {
        await fastify.inject({
          method: 'POST',
          url: '/api/chat/test-bot',
          payload: { message: 'test' },
        });

        expect(global.fetch).toHaveBeenCalled();
        const call = vi.mocked(global.fetch).mock.calls[0];
        const init = call[1] as RequestInit;
        const headers = init.headers as Record<string, string> | undefined;
        expect(headers?.Authorization).toBeUndefined();
      } finally {
        mutableConfig.phoneHomeChatToken = originalToken;
      }
    });

    it('handles response with no body gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: null,
      } as unknown as Response);

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/chat/test-bot',
        payload: { message: 'hello' },
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body)).toEqual({ error: 'No response body' });
    });

    it('handles empty thread ID', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/chat/',
        payload: { message: 'hello' },
      });

      // Empty thread ID is matched by route but fails validation, returns 400
      expect(response.statusCode).toBe(400);
    });

    it('accepts thread IDs with only valid characters', async () => {
      const validIds = ['bot', 'bot_123', 'bot-test', 'bot123test', 'BOT_TEST_123'];

      for (const threadId of validIds) {
        global.fetch = vi.fn().mockResolvedValue(streamingChatResponse());

        const response = await fastify.inject({
          method: 'POST',
          url: `/api/chat/${threadId}`,
          payload: { message: 'test' },
        });

        expect(response.statusCode).not.toBe(400);
      }
    });

    it('returns 4xx status from upstream when service returns 4xx', async () => {
      global.fetch = vi.fn().mockResolvedValue(new Response('Bad Request', { status: 400 }));

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/chat/test-bot',
        payload: { message: 'hello' },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toEqual({ error: 'Bad Request' });
    });

    it('returns 5xx status from upstream when service returns 5xx', async () => {
      global.fetch = vi.fn().mockResolvedValue(new Response('Internal Server Error', { status: 500 }));

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/chat/test-bot',
        payload: { message: 'hello' },
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body)).toEqual({ error: 'Internal Server Error' });
    });
  });

  describe('GET /api/logs', () => {
    it('returns log entries from the signoz source', async () => {
      vi.mocked(getCachedData).mockResolvedValue({ entries: mockLogEntries, source: 'signoz' });

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/logs',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.source).toBe('signoz');
      expect(body.entries).toEqual(mockLogEntries);
    });

    it('returns empty entries with unavailable source on error', async () => {
      vi.mocked(getCachedData).mockRejectedValue(new Error('MCP down'));

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/logs',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ entries: [], source: 'unavailable' });
    });

    it('uses a 10s cache TTL', async () => {
      vi.mocked(getCachedData).mockResolvedValue({ entries: [], source: 'signoz' });

      await fastify.inject({ method: 'GET', url: '/api/logs' });

      expect(vi.mocked(getCachedData).mock.calls[0][1]).toBe(10);
    });
  });

  describe('GET /api/storage', () => {
    it('returns filesystems with status 200 when not degraded', async () => {
      vi.mocked(getCachedData).mockResolvedValue(mockStorageData);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/storage',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.filesystems).toEqual(mockStorageData.filesystems);
      expect(body.source).toBe('real');
    });

    it('returns 206 when storage data is degraded', async () => {
      vi.mocked(getCachedData).mockResolvedValue({
        ...mockStorageData,
        degraded: ['metricbeat'],
      });

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/storage',
      });

      expect(response.statusCode).toBe(206);
      expect(JSON.parse(response.body).degraded).toEqual(['metricbeat']);
    });

    it('returns empty filesystems with unavailable source on error', async () => {
      vi.mocked(getCachedData).mockRejectedValue(new Error('metricbeat down'));

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/storage',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ filesystems: [], source: 'unavailable' });
    });

    it('uses a 30s cache TTL', async () => {
      vi.mocked(getCachedData).mockResolvedValue(mockStorageData);

      await fastify.inject({ method: 'GET', url: '/api/storage' });

      expect(vi.mocked(getCachedData).mock.calls[0][1]).toBe(30);
    });
  });

  describe('GET /api/threads', () => {
    it('returns the threads roster from phone-home', async () => {
      const roster = { threads: [{ id: 'thread-1', title: 'First' }] };
      vi.mocked(fetchWithTimeout).mockResolvedValue(
        new Response(JSON.stringify(roster), { status: 200 })
      );

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/threads',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(roster);
      // Proxies the phone-home REST API via fetchWithTimeout.
      const call = vi.mocked(fetchWithTimeout).mock.calls[0];
      expect(call[0]).toBe('http://phone-home:8000/v1/threads');
    });

    it('falls back to an empty roster when phone-home returns non-ok', async () => {
      vi.mocked(fetchWithTimeout).mockResolvedValue(
        new Response('nope', { status: 503 })
      );

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/threads',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ threads: [] });
    });

    it('falls back to an empty roster when phone-home is unreachable', async () => {
      vi.mocked(fetchWithTimeout).mockRejectedValue(new Error('ECONNREFUSED'));

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/threads',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ threads: [] });
    });
  });

  describe('POST /api/threads', () => {
    it('creates a thread via phone-home and returns the result', async () => {
      const created = { id: 'thread-42' };
      vi.mocked(fetchWithTimeout).mockResolvedValue(
        new Response(JSON.stringify(created), { status: 200 })
      );

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/threads',
        payload: { title: 'New thread' },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(created);
      const call = vi.mocked(fetchWithTimeout).mock.calls[0];
      expect(call[0]).toBe('http://phone-home:8000/v1/threads');
      expect(call[1]?.method).toBe('POST');
    });

    it('propagates the upstream status when thread creation fails', async () => {
      vi.mocked(fetchWithTimeout).mockResolvedValue(
        new Response('bad', { status: 422 })
      );

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/threads',
        payload: { title: 'x' },
      });

      expect(response.statusCode).toBe(422);
      expect(JSON.parse(response.body)).toEqual({ error: 'Failed to create thread' });
    });
  });

  describe('GET /api/threads/:id', () => {
    it('returns 400 for an invalid thread id', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/threads/bad@id',
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toEqual({ error: 'Invalid thread id' });
    });

    it('returns the thread detail from phone-home', async () => {
      const detail = { id: 'thread-1', messages: [] };
      vi.mocked(fetchWithTimeout).mockResolvedValue(
        new Response(JSON.stringify(detail), { status: 200 })
      );

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/threads/thread-1',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual(detail);
      const call = vi.mocked(fetchWithTimeout).mock.calls[0];
      expect(call[0]).toBe('http://phone-home:8000/v1/threads/thread-1');
    });

    it('propagates the upstream status when the thread is not found', async () => {
      vi.mocked(fetchWithTimeout).mockResolvedValue(
        new Response('missing', { status: 404 })
      );

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/threads/thread-x',
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body)).toEqual({ error: 'Thread not found' });
    });
  });

  describe('GET /health', () => {
    it('returns 200 with ok status', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ status: 'ok' });
    });
  });

  describe('Cache behavior', () => {
    it('passes correct cache TTL for status endpoint', async () => {
      vi.mocked(getCachedData).mockResolvedValue(mockStatusData);

      await fastify.inject({
        method: 'GET',
        url: '/api/status',
      });

      expect(vi.mocked(getCachedData).mock.calls[0][1]).toBe(2);
    });

    it('passes correct cache TTL for cluster endpoint', async () => {
      vi.mocked(getCachedData).mockResolvedValue({ ...mockLabData, degraded: [] });

      await fastify.inject({
        method: 'GET',
        url: '/api/cluster',
      });

      expect(vi.mocked(getCachedData).mock.calls[0][1]).toBe(10);
    });

    it('passes correct cache TTL for docker endpoint', async () => {
      vi.mocked(getCachedData).mockResolvedValue({ ...mockDockerData, degraded: [], source: 'real' });

      await fastify.inject({
        method: 'GET',
        url: '/api/docker',
      });

      expect(vi.mocked(getCachedData).mock.calls[0][1]).toBe(20);
    });

    it('passes correct cache TTL for network endpoint', async () => {
      vi.mocked(getCachedData).mockResolvedValue({ ...mockNetworkData, degraded: [], source: 'real' as const });

      await fastify.inject({
        method: 'GET',
        url: '/api/network',
      });

      expect(vi.mocked(getCachedData).mock.calls[0][1]).toBe(20);
    });

    it('passes correct cache TTL for alerts endpoint', async () => {
      vi.mocked(getCachedData).mockResolvedValue({ alerts: mockAlerts, source: 'mock' });

      await fastify.inject({
        method: 'GET',
        url: '/api/alerts',
      });

      expect(vi.mocked(getCachedData).mock.calls[0][1]).toBe(3);
    });
  });

  describe('Degradation signaling', () => {
    it('returns 206 when multiple services are degraded', async () => {
      const clusterData = {
        ...mockLabData,
        degraded: ['signoz', 'ntopng', 'elastiflow']
      };
      vi.mocked(getCachedData).mockResolvedValue(clusterData);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/cluster',
      });

      expect(response.statusCode).toBe(206);
      expect(JSON.parse(response.body).degraded).toHaveLength(3);
    });

    it('returns 200 when no services are degraded', async () => {
      const clusterData = { ...mockLabData, degraded: [] };
      vi.mocked(getCachedData).mockResolvedValue(clusterData);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/cluster',
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
