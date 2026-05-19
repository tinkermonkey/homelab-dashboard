import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MetricbeatClient } from './metricbeat-client.js';

const successAgg = (buckets: Array<{ key: number; value: number | null }>) => ({
  aggregations: {
    over_time: {
      buckets: buckets.map((b) => ({
        key: b.key,
        doc_count: 1,
        value: { value: b.value },
      })),
    },
  },
});

describe('MetricbeatClient', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getCpuHistory', () => {
    it('returns percentage array from norm.pct values', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => successAgg([{ key: 1000, value: 0.25 }, { key: 2000, value: 0.5 }]),
      });

      const client = new MetricbeatClient('http://es:9200', 'elastic', 'pass');
      const result = await client.getCpuHistory('t5610');

      expect(result).toEqual([25, 50]);
    });

    it('treats null bucket values as 0', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => successAgg([{ key: 1000, value: null }]),
      });

      const client = new MetricbeatClient('http://es:9200', 'elastic', 'pass');
      const result = await client.getCpuHistory('t5610');
      expect(result).toEqual([0]);
    });

    it('queries metricbeat-* index with cpu metricset', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => successAgg([]),
      });
      global.fetch = fetchMock;

      const client = new MetricbeatClient('http://es:9200', 'elastic', 'pass');
      await client.getCpuHistory('t5610');

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toContain('metricbeat-*');
      const body = JSON.parse(opts.body);
      expect(body.query.bool.must).toContainEqual({ match: { 'metricset.name': 'cpu' } });
      expect(body.query.bool.must).toContainEqual({ match: { 'host.name': 't5610' } });
      expect(body.aggs.over_time.aggs.value.avg.field).toBe('system.cpu.total.norm.pct');
    });

    it('sends Basic auth header', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => successAgg([]),
      });
      global.fetch = fetchMock;

      const client = new MetricbeatClient('http://es:9200', 'elastic', 'secret');
      await client.getCpuHistory('t5610');

      const [, opts] = fetchMock.mock.calls[0];
      expect(opts.headers['Authorization']).toMatch(/^Basic /);
    });

    it('throws on HTTP error', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized' });
      const client = new MetricbeatClient('http://es:9200', 'elastic', 'pass');
      await expect(client.getCpuHistory('t5610')).rejects.toThrow(/HTTP 401/);
    });
  });

  describe('getMemoryHistory', () => {
    it('queries with memory metricset and correct field', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => successAgg([{ key: 1000, value: 0.6 }]),
      });
      global.fetch = fetchMock;

      const client = new MetricbeatClient('http://es:9200', 'elastic', 'pass');
      const result = await client.getMemoryHistory('petit-cochon');

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.query.bool.must).toContainEqual({ match: { 'metricset.name': 'memory' } });
      expect(body.aggs.over_time.aggs.value.avg.field).toBe('system.memory.actual.used.pct');
      expect(result).toEqual([60]);
    });
  });

  describe('getDiskHistory', () => {
    it('queries with filesystem metricset and mount_point filter', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => successAgg([{ key: 1000, value: 0.45 }]),
      });
      global.fetch = fetchMock;

      const client = new MetricbeatClient('http://es:9200', 'elastic', 'pass');
      await client.getDiskHistory('hp7052');

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.query.bool.must).toContainEqual({ match: { 'metricset.name': 'filesystem' } });
      expect(body.query.bool.must).toContainEqual({ match: { 'system.filesystem.mount_point': '/' } });
      expect(body.aggs.over_time.aggs.value.avg.field).toBe('system.filesystem.used.pct');
    });
  });

  describe('getLoadAverage', () => {
    it('returns formatted load string from latest doc', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          hits: {
            hits: [{
              _source: {
                system: { load: { '1': 1.5, '5': 1.2, '15': 0.9 } },
              },
            }],
          },
        }),
      });

      const client = new MetricbeatClient('http://es:9200', 'elastic', 'pass');
      const result = await client.getLoadAverage('t5610');
      expect(result).toBe('1.5 / 1.2 / 0.9');
    });

    it('throws when no data returned', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ hits: { hits: [] } }),
      });

      const client = new MetricbeatClient('http://es:9200', 'elastic', 'pass');
      await expect(client.getLoadAverage('t5610')).rejects.toThrow(/No load data/);
    });
  });
});
