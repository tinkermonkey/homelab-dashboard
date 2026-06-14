import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ElastiFlowClient } from './elastiflow-client.js';
import { SERVER_REGISTRY } from '../cluster-config.js';

const successAgg = (buckets: Array<{ key: number; value: number | null }>) => ({
  aggregations: {
    over_time: {
      buckets: buckets.map((b) => ({ key: b.key, bytes: { value: b.value } })),
    },
  },
});

describe('ElastiFlowClient', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getHostThroughput', () => {
    it('returns [] for an unknown host id (not in the registry)', async () => {
      const fetchMock = vi.fn();
      global.fetch = fetchMock;

      const client = new ElastiFlowClient('http://es:9200', 'elastic', 'pass');
      const result = await client.getHostThroughput('does-not-exist');

      expect(result).toEqual([]);
      // No query should be issued when the id has no mapped IP.
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each([
      ['t5610', '192.168.0.117'],
      ['petit-cochon', '192.168.0.245'],
      ['hp7052', '192.168.0.72'],
    ])('matches flows by LAN IP for real registry id %s', async (id, ip) => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => successAgg([]),
      });
      global.fetch = fetchMock;

      const client = new ElastiFlowClient('http://es:9200', 'elastic', 'pass');
      await client.getHostThroughput(id);

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toContain('elastiflow-flow-ecs-*');
      const body = JSON.parse(opts.body);
      // Should query both source and destination IP for the host's real LAN IP.
      expect(body.query.bool.should).toContainEqual({ term: { 'source.ip': ip } });
      expect(body.query.bool.should).toContainEqual({ term: { 'destination.ip': ip } });
    });

    it('derives its IP map from SERVER_REGISTRY (no legacy demo ids)', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => successAgg([]),
      });
      global.fetch = fetchMock;

      const client = new ElastiFlowClient('http://es:9200', 'elastic', 'pass');

      // Legacy demo ids must no longer resolve to an IP.
      for (const legacy of ['nyx', 'helios', 'aether']) {
        expect(await client.getHostThroughput(legacy)).toEqual([]);
      }
      expect(fetchMock).not.toHaveBeenCalled();

      // Every real registry id must resolve and issue a query.
      for (const spec of SERVER_REGISTRY) {
        await client.getHostThroughput(spec.id);
      }
      expect(fetchMock).toHaveBeenCalledTimes(SERVER_REGISTRY.length);
    });

    it('converts bucket bytes into Mbps averages (last 48 buckets)', async () => {
      // bytes / (30*60 s) / 125000 = Mbps. 22_500_000_000 / 1800 / 125000 = 100 Mbps.
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => successAgg([{ key: 1000, value: 22_500_000_000 }, { key: 2000, value: 0 }]),
      });

      const client = new ElastiFlowClient('http://es:9200', 'elastic', 'pass');
      const result = await client.getHostThroughput('t5610');

      expect(result).toEqual([100, 0]);
    });

    it('treats null bucket values as 0', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => successAgg([{ key: 1000, value: null }]),
      });

      const client = new ElastiFlowClient('http://es:9200', 'elastic', 'pass');
      const result = await client.getHostThroughput('t5610');
      expect(result).toEqual([0]);
    });

    it('sends Basic auth header when credentials are configured', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => successAgg([]),
      });
      global.fetch = fetchMock;

      const client = new ElastiFlowClient('http://es:9200', 'elastic', 'secret');
      await client.getHostThroughput('t5610');

      const [, opts] = fetchMock.mock.calls[0];
      expect(opts.headers['Authorization']).toMatch(/^Basic /);
    });

    it('throws a wrapped error on HTTP failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized' });

      const client = new ElastiFlowClient('http://es:9200', 'elastic', 'pass');
      await expect(client.getHostThroughput('t5610')).rejects.toThrow(/ElastiFlow query failed/);
    });
  });
});
