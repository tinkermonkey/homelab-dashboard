import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SigNozClient } from './signoz-client.js';

describe('SigNozClient', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getActiveAlerts', () => {
    it('fetches active alerts and transforms them', async () => {
      const mockResponse = {
        status: 'success',
        data: [
          {
            labels: { alertname: 'HighCPU', severity: 'critical', hostname: 'nyx' },
            state: 'active',
          },
          {
            labels: { alertname: 'LowMemory', severity: 'warning' },
            state: 'active',
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => mockResponse });

      const client = new SigNozClient();
      const result = await client.getActiveAlerts();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'HighCPU',
        severity: 'critical',
        state: 'active',
        labels: { alertname: 'HighCPU', severity: 'critical', hostname: 'nyx' },
      });
    });

    it('returns empty array when response status is not success', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'error', data: null }),
      });

      const client = new SigNozClient();
      expect(await client.getActiveAlerts()).toEqual([]);
    });

    it('returns empty array when data is null', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'success', data: null }),
      });

      const client = new SigNozClient();
      expect(await client.getActiveAlerts()).toEqual([]);
    });

    it('throws on HTTP error', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' });
      const client = new SigNozClient();
      await expect(client.getActiveAlerts()).rejects.toThrow(/Failed to fetch active alerts.*HTTP 500/);
    });

    it('throws on network failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      const client = new SigNozClient();
      await expect(client.getActiveAlerts()).rejects.toThrow(/Failed to fetch active alerts.*Network error/);
    });

    it('uses SIGNOZ-API-KEY header when token is provided', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'success', data: [] }),
      });
      global.fetch = fetchMock;

      const client = new SigNozClient('http://signoz:4317', 'my-token');
      await client.getActiveAlerts();

      const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
      expect(headers['SIGNOZ-API-KEY']).toBe('my-token');
      expect(headers['Authorization']).toBeUndefined();
    });

    it('omits SIGNOZ-API-KEY when token is empty', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'success', data: [] }),
      });
      global.fetch = fetchMock;

      const client = new SigNozClient('http://signoz:4317', '');
      await client.getActiveAlerts();

      const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
      expect(headers['SIGNOZ-API-KEY']).toBeUndefined();
    });

    it('calls /api/v1/alerts endpoint', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'success', data: [] }),
      });
      global.fetch = fetchMock;

      const client = new SigNozClient('http://signoz:4317', 'tok');
      await client.getActiveAlerts();

      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain('/api/v1/alerts');
    });
  });
});
