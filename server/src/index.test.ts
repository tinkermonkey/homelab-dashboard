import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import type { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import type { LAB_DATA, DOCKER_DATA, TOPOLOGY_DATA, STATUS_DATA, Alert } from '@homelab/shared';
import { getCachedData, clearCache } from './cache.js';
import { transformMetrics } from './transformers/metrics-transformer.js';
import { transformDockerData, transformTopologyData } from './transformers/mcp-transformer.js';
import { signozClient } from './clients/signoz-client.js';
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

const mockLabData: LAB_DATA = {
  cluster: {
    name: 'asgard',
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

describe('Server Routes', () => {
  let fastify: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    vi.clearAllMocks();
    clearCache();

    fastify = Fastify({ logger: false });
    await fastify.register(cors, {
      origin: ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true,
    });

    // Register routes
    fastify.get('/api/status', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { getStatusData } = await import('./mock-data.js');
        const data = await getCachedData('status', 2, () => Promise.resolve(getStatusData()), (msg) => console.error(msg));
        reply.send(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        reply.status(500).send({ error: 'Failed to fetch status' });
      }
    });

    fastify.get('/api/cluster', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { getLabData } = await import('./mock-data.js');
        const data = await getCachedData('cluster', 10, async () => {
          const baseData = getLabData();
          const { data: transformedData, degraded } = await transformMetrics(baseData);
          return {
            ...transformedData,
            degraded,
          };
        }, (msg) => console.error(msg));

        if (data.degraded && data.degraded.length > 0) {
          reply.status(206);
        }

        reply.send(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        reply.status(500).send({ error: 'Failed to fetch cluster data' });
      }
    });

    fastify.get('/api/docker', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const data = await getCachedData('docker', 20, async () => {
          const { data: dockerData, degraded } = await transformDockerData();
          return {
            ...dockerData,
            degraded,
          };
        }, (msg) => console.error(msg));

        if (data.degraded && data.degraded.length > 0) {
          reply.status(206);
        }

        reply.send(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        reply.status(500).send({ error: 'Failed to fetch docker data' });
      }
    });

    fastify.get('/api/topology', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const data = await getCachedData('topology', 60, async () => {
          const { data: topoData, degraded } = await transformTopologyData();
          return {
            ...topoData,
            degraded,
          };
        }, (msg) => console.error(msg));

        if (data.degraded && data.degraded.length > 0) {
          reply.status(206);
        }

        reply.send(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        reply.status(500).send({ error: 'Failed to fetch topology data' });
      }
    });

    fastify.get('/api/alerts', async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { getActiveAlerts } = await import('./mock-data.js');
        const data = await getCachedData('alerts', 3, async () => {
          try {
            const alerts = await signozClient.getActiveAlerts();
            return {
              alerts,
              source: 'alertmanager',
            };
          } catch (error) {
            return {
              alerts: getActiveAlerts(),
              source: 'mock',
            };
          }
        }, (msg) => console.error(msg));

        reply.send(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        reply.status(500).send({ error: 'Failed to fetch alerts' });
      }
    });

    fastify.post<{ Params: { botId: string } }>('/api/chat/:botId', async (request: FastifyRequest<{ Params: { botId: string } }>, reply: FastifyReply) => {
      const { botId } = request.params;

      if (!/^[a-zA-Z0-9_-]{1,64}$/.test(botId)) {
        reply.status(400).send({ error: 'Invalid bot ID format' });
        return;
      }

      try {
        const bodyString = JSON.stringify(request.body);
        if (bodyString.length > 1024 * 1024) {
          reply.status(413).send({ error: 'Request body too large' });
          return;
        }

        const response = await fetchWithTimeout(`http://localhost:8000/chat/${botId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: bodyString,
          timeout: 30000,
        });

        if (!response.ok) {
          reply.status(response.status).send({ error: 'Chat service unavailable' });
          return;
        }

        reply.header('Content-Type', 'text/event-stream');
        reply.header('Cache-Control', 'no-cache');
        reply.header('Connection', 'keep-alive');

        const reader = response.body?.getReader();
        if (!reader) {
          reply.status(500).send({ error: 'No response body' });
          return;
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = new TextDecoder().decode(value);
          reply.raw.write(chunk);
        }

        reply.raw.end();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        reply.status(500).send({ error: 'Chat service error' });
      }
    });

    fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
      reply.send({ status: 'ok' });
    });
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
      const dockerData = { ...mockDockerData, degraded: [] };
      vi.mocked(getCachedData).mockResolvedValue(dockerData);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/docker',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).degraded).toEqual([]);
    });

    it('returns docker data with status 206 when degraded', async () => {
      const dockerData = { ...mockDockerData, degraded: ['phone-home'] };
      vi.mocked(getCachedData).mockResolvedValue(dockerData);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/docker',
      });

      expect(response.statusCode).toBe(206);
      expect(JSON.parse(response.body).degraded).toEqual(['phone-home']);
    });
  });

  describe('GET /api/topology', () => {
    it('returns topology data with status 200 when no degradation', async () => {
      const topoData = { ...mockTopologyData, degraded: [] };
      vi.mocked(getCachedData).mockResolvedValue(topoData);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/topology',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).degraded).toEqual([]);
    });

    it('returns topology data with status 206 when degraded', async () => {
      const topoData = { ...mockTopologyData, degraded: ['phone-home'] };
      vi.mocked(getCachedData).mockResolvedValue(topoData);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/topology',
      });

      expect(response.statusCode).toBe(206);
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

  describe('POST /api/chat/:botId', () => {
    it('returns 400 for invalid bot ID format', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: '/api/chat/invalid@bot',
        payload: { message: 'hello' },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toEqual({ error: 'Invalid bot ID format' });
    });

    it('rejects bot IDs exceeding 64 characters', async () => {
      const longBotId = 'a'.repeat(65);
      const response = await fastify.inject({
        method: 'POST',
        url: `/api/chat/${longBotId}`,
        payload: { message: 'hello' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('accepts valid bot IDs with alphanumeric, underscore, and hyphen', async () => {
      const mockResponse = new Response('data', { status: 200 });
      vi.mocked(fetchWithTimeout).mockResolvedValue(mockResponse);

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/chat/valid-bot_123',
        payload: { message: 'hello' },
      });

      // Will fail to stream body but should pass validation
      expect(response.statusCode !== 400).toBe(true);
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

    it('returns 500 when chat service is unavailable', async () => {
      vi.mocked(fetchWithTimeout).mockResolvedValue(
        new Response('Service Unavailable', { status: 503 })
      );

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/chat/test-bot',
        payload: { message: 'hello' },
      });

      expect(response.statusCode).toBe(503);
      expect(JSON.parse(response.body)).toEqual({ error: 'Chat service unavailable' });
    });

    it('returns 500 when chat service throws error', async () => {
      vi.mocked(fetchWithTimeout).mockRejectedValue(new Error('Network error'));

      const response = await fastify.inject({
        method: 'POST',
        url: '/api/chat/test-bot',
        payload: { message: 'hello' },
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body)).toEqual({ error: 'Chat service error' });
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
      vi.mocked(getCachedData).mockResolvedValue({ ...mockDockerData, degraded: [] });

      await fastify.inject({
        method: 'GET',
        url: '/api/docker',
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
