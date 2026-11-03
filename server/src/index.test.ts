import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import type { LAB_DATA, DOCKER_DATA, TOPOLOGY_DATA, STATUS_DATA, Alert, NETWORK_DATA } from '@homelab/shared';
import { registerRoutes } from './index.js';
import { getCachedData, clearCache } from './cache.js';

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
    homelabDataMcpUrl: 'http://t5610:3220/mcp/',
    homelabDataMcpToken: 'test-bearer-token',
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
    op: 'homelab-data',
    target: 'homelab-data',
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
      const dockerData = { ...mockDockerData, degraded: ['docker'], source: 'mock' };
      vi.mocked(getCachedData).mockResolvedValue(dockerData);

      const response = await fastify.inject({
        method: 'GET',
        url: '/api/docker',
      });

      expect(response.statusCode).toBe(206);
      expect(JSON.parse(response.body).degraded).toEqual(['docker']);
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
      const topoData = { ...mockTopologyData, degraded: ['topology'], source: 'mock' };
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

  describe('retired chat routes', () => {
    it.each([
      ['GET', '/api/threads'],
      ['POST', '/api/threads'],
      ['GET', '/api/threads/thread-1'],
      ['POST', '/api/chat/thread-1'],
    ] as const)('%s %s is gone (404)', async (method, url) => {
      const response = await fastify.inject({ method, url, payload: method === 'POST' ? {} : undefined });
      expect(response.statusCode).toBe(404);
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
