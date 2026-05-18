import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SigNozClient } from './signoz-client.js';
import { config } from '../config.js';

describe('SigNozClient', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('queryRange', () => {
    it('sends correct query parameters', async () => {
      const mockResponse = {
        status: 'success',
        data: {
          resultType: 'matrix',
          result: [],
        },
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });
      global.fetch = fetchMock;

      const client = new SigNozClient();
      await client.queryRange('test_query', 100, 200, '5m');

      const url = new URL(fetchMock.mock.calls[0][0] as string);
      expect(url.searchParams.get('query')).toBe('test_query');
      expect(url.searchParams.get('start')).toBe('100');
      expect(url.searchParams.get('end')).toBe('200');
      expect(url.searchParams.get('step')).toBe('5m');
    });

    it('uses default step parameter', async () => {
      const mockResponse = {
        status: 'success',
        data: { resultType: 'matrix', result: [] },
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });
      global.fetch = fetchMock;

      const client = new SigNozClient();
      await client.queryRange('query', 100, 200);

      const url = new URL(fetchMock.mock.calls[0][0] as string);
      expect(url.searchParams.get('step')).toBe('30m');
    });

    it('throws error on HTTP failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const client = new SigNozClient();

      await expect(client.queryRange('query', 100, 200)).rejects.toThrow(
        /SigNoz query failed.*HTTP 500/
      );
    });

    it('throws error on network failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const client = new SigNozClient();

      await expect(client.queryRange('query', 100, 200)).rejects.toThrow(
        /SigNoz query failed.*Network error/
      );
    });

    it('returns parsed response data', async () => {
      const mockResponse = {
        status: 'success',
        data: {
          resultType: 'matrix',
          result: [
            {
              metric: { hostname: 'test' },
              values: [[100, '0.5'], [200, '0.6']],
            },
          ],
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new SigNozClient();
      const result = await client.queryRange('query', 100, 200);

      expect(result).toEqual(mockResponse);
    });
  });

  describe('query', () => {
    it('sends instant query with correct parameters', async () => {
      const mockResponse = {
        status: 'success',
        data: { resultType: 'vector', result: [] },
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });
      global.fetch = fetchMock;

      const client = new SigNozClient();
      await client.query('instant_query');

      const url = new URL(fetchMock.mock.calls[0][0] as string);
      expect(url.pathname).toContain('/api/v5/query');
      expect(url.searchParams.get('query')).toBe('instant_query');
    });

    it('throws error on HTTP failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const client = new SigNozClient();

      await expect(client.query('query')).rejects.toThrow(
        /SigNoz query failed.*HTTP 404/
      );
    });
  });

  describe('getCpuMetrics', () => {
    it('fetches CPU metrics and returns values', async () => {
      const mockResponse = {
        status: 'success',
        data: {
          resultType: 'matrix',
          result: [
            {
              metric: { hostname: 'test' },
              values: [[100, '0.5'], [200, '0.6']],
            },
          ],
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new SigNozClient();
      const result = await client.getCpuMetrics('test');

      expect(result).toEqual([[100, '0.5'], [200, '0.6']]);
    });

    it('returns empty array when no data available', async () => {
      const mockResponse = {
        status: 'success',
        data: { resultType: 'matrix', result: [] },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new SigNozClient();
      const result = await client.getCpuMetrics('test');

      expect(result).toEqual([]);
    });
  });

  describe('getMemoryMetrics', () => {
    it('fetches memory metrics', async () => {
      const mockResponse = {
        status: 'success',
        data: {
          resultType: 'matrix',
          result: [
            {
              metric: { hostname: 'test' },
              values: [[100, '0.6'], [200, '0.7']],
            },
          ],
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new SigNozClient();
      const result = await client.getMemoryMetrics('test');

      expect(result).toEqual([[100, '0.6'], [200, '0.7']]);
    });
  });

  describe('getDiskMetrics', () => {
    it('fetches disk metrics', async () => {
      const mockResponse = {
        status: 'success',
        data: {
          resultType: 'matrix',
          result: [
            {
              metric: { hostname: 'test' },
              values: [[100, '0.8']],
            },
          ],
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new SigNozClient();
      const result = await client.getDiskMetrics('test');

      expect(result).toEqual([[100, '0.8']]);
    });
  });

  describe('getTemperature', () => {
    it('fetches temperature and formats result', async () => {
      const mockResponse = {
        status: 'success',
        data: {
          resultType: 'vector',
          result: [
            {
              metric: { hostname: 'test' },
              value: [100, '54.7'],
            },
          ],
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new SigNozClient();
      const result = await client.getTemperature('test');

      expect(result).toBe('55°C');
    });

    it('throws error when no temperature data available', async () => {
      const mockResponse = {
        status: 'success',
        data: { resultType: 'vector', result: [] },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new SigNozClient();

      await expect(client.getTemperature('test')).rejects.toThrow(
        'No temperature data available for test'
      );
    });
  });

  describe('getLoadAverage', () => {
    it('fetches load average metrics and formats result', async () => {
      const mockResponse = (value: string) => ({
        status: 'success',
        data: {
          resultType: 'vector',
          result: [
            {
              metric: { hostname: 'test' },
              value: [100, value],
            },
          ],
        },
      });

      const fetchMock = vi.fn()
        .mockResolvedValueOnce({ ok: true, json: async () => mockResponse('1.5') })
        .mockResolvedValueOnce({ ok: true, json: async () => mockResponse('1.8') })
        .mockResolvedValueOnce({ ok: true, json: async () => mockResponse('2.0') });

      global.fetch = fetchMock;

      const client = new SigNozClient();
      const result = await client.getLoadAverage('test');

      expect(result).toBe('1.5 / 1.8 / 2.0');
    });
  });

  describe('getPowerDraw', () => {
    it('fetches power draw and returns numeric value', async () => {
      const mockResponse = {
        status: 'success',
        data: {
          resultType: 'vector',
          result: [
            {
              metric: {},
              value: [100, '412.5'],
            },
          ],
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new SigNozClient();
      const result = await client.getPowerDraw();

      expect(result).toBe(412.5);
    });

    it('throws error when no power draw data available', async () => {
      const mockResponse = {
        status: 'success',
        data: { resultType: 'vector', result: [] },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new SigNozClient();

      await expect(client.getPowerDraw()).rejects.toThrow(
        'No power draw data available'
      );
    });
  });

  describe('getClusterUptime', () => {
    it('calculates uptime in days and hours', async () => {
      const now = Date.now() / 1000;
      const bootTime = now - (127 * 86400 + 4 * 3600); // 127 days 4 hours ago

      const mockResponse = {
        status: 'success',
        data: {
          resultType: 'vector',
          result: [
            {
              metric: {},
              value: [100, String(bootTime)],
            },
          ],
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new SigNozClient();
      const result = await client.getClusterUptime();

      expect(result.days).toBe(127);
      expect(result.hours).toBe(4);
    });

    it('throws error when no uptime data available', async () => {
      const mockResponse = {
        status: 'success',
        data: { resultType: 'vector', result: [] },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new SigNozClient();

      await expect(client.getClusterUptime()).rejects.toThrow(
        'No uptime data available'
      );
    });
  });

  describe('getEgressToday', () => {
    it('fetches egress data and converts to GB', async () => {
      const mockResponse = {
        status: 'success',
        data: {
          resultType: 'matrix',
          result: [
            {
              metric: {},
              values: [
                [100, '10737418240'], // 10 GB in bytes
                [200, '51539607552'], // 48 GB in bytes
              ],
            },
          ],
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new SigNozClient();
      const result = await client.getEgressToday();

      expect(result).toBe(48);
    });

    it('returns 0 when no egress data available', async () => {
      const mockResponse = {
        status: 'success',
        data: { resultType: 'matrix', result: [] },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new SigNozClient();
      const result = await client.getEgressToday();

      expect(result).toBe(0);
    });
  });

  describe('getActiveAlerts', () => {
    it('fetches active alerts and transforms them', async () => {
      const mockResponse = {
        status: 'success',
        data: [
          {
            alert: 'HighCPU',
            labels: {
              alertname: 'HighCPU',
              severity: 'critical',
              hostname: 'nyx',
            },
            annotations: { description: 'CPU is high' },
            state: 'active',
            activeAt: '2024-01-01T00:00:00Z',
          },
          {
            alert: 'LowMemory',
            labels: {
              alertname: 'LowMemory',
              severity: 'warning',
            },
            annotations: { description: 'Memory is low' },
            state: 'active',
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new SigNozClient();
      const result = await client.getActiveAlerts();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'HighCPU',
        severity: 'critical',
        state: 'active',
        labels: {
          alertname: 'HighCPU',
          severity: 'critical',
          hostname: 'nyx',
        },
      });
      expect(result[1]).toEqual({
        name: 'LowMemory',
        severity: 'warning',
        state: 'active',
        labels: {
          alertname: 'LowMemory',
          severity: 'warning',
        },
      });
    });

    it('returns empty array when response status is not success', async () => {
      const mockResponse = {
        status: 'error',
        data: null,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new SigNozClient();
      const result = await client.getActiveAlerts();

      expect(result).toEqual([]);
    });

    it('returns empty array when response data is null', async () => {
      const mockResponse = {
        status: 'success',
        data: null,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new SigNozClient();
      const result = await client.getActiveAlerts();

      expect(result).toEqual([]);
    });

    it('throws error on HTTP failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const client = new SigNozClient();

      await expect(client.getActiveAlerts()).rejects.toThrow(
        /Failed to fetch active alerts.*HTTP 500/
      );
    });

    it('throws error on network failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const client = new SigNozClient();

      await expect(client.getActiveAlerts()).rejects.toThrow(
        /Failed to fetch active alerts.*Network error/
      );
    });
  });

  describe('Header handling', () => {
    it('includes Bearer token when API token is provided', async () => {
      const mockResponse = {
        status: 'success',
        data: { resultType: 'vector', result: [] },
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });
      global.fetch = fetchMock;

      const client = new SigNozClient('http://localhost:4317', 'test-token');
      await client.query('test');

      const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer test-token');
    });

    it('does not include Authorization header when token is empty', async () => {
      const mockResponse = {
        status: 'success',
        data: { resultType: 'vector', result: [] },
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });
      global.fetch = fetchMock;

      const client = new SigNozClient('http://localhost:4317', '');
      await client.query('test');

      const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
    });
  });

  describe('URL handling', () => {
    it('removes trailing slash from base URL', async () => {
      const mockResponse = {
        status: 'success',
        data: { resultType: 'vector', result: [] },
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });
      global.fetch = fetchMock;

      const client = new SigNozClient('http://localhost:4317/', 'token');
      await client.query('test');

      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain('http://localhost:4317/api/v5/query');
      expect(url).not.toContain('http://localhost:4317//api/v5/query');
    });
  });
});
