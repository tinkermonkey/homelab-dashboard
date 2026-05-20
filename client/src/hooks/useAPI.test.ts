import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchJSON } from './useAPI.js';

describe('useAPI - fetchJSON', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('successful responses', () => {
    it('returns data for 200 response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ servers: [] }),
      });

      const result = await fetchJSON<{ servers: unknown[] }>('/api/cluster');

      expect(result.data).toEqual({ servers: [] });
      expect(result.degraded).toBeUndefined();
    });

    it('handles 206 partial content response with degraded flag', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 206,
        json: async () => ({
          servers: [],
          degraded: ['signoz', 'ntopng'],
        }),
      });

      const result = await fetchJSON<{ servers: unknown[]; degraded: string[] }>('/api/cluster');

      expect(result.data).toEqual({
        servers: [],
        degraded: ['signoz', 'ntopng'],
      });
      expect(result.degraded).toEqual(['signoz', 'ntopng']);
    });

    it('parses JSON response correctly', async () => {
      const mockData = {
        id: 'test',
        value: 123,
        nested: { key: 'value' },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const result = await fetchJSON<typeof mockData>('/api/test');

      expect(result.data).toEqual(mockData);
    });

    it('passes URL to fetch', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });
      global.fetch = fetchMock;

      await fetchJSON<Record<string, never>>('/api/custom/path');

      expect(fetchMock).toHaveBeenCalledWith('/api/custom/path');
    });
  });

  describe('error responses', () => {
    it('throws error for 404 response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Map([['content-type', 'text/plain']]),
        text: async () => '',
      });

      await expect(fetchJSON<unknown>('/api/notfound')).rejects.toThrow('API error 404');
    });

    it('throws error for 500 response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Map([['content-type', 'text/plain']]),
        text: async () => '',
      });

      await expect(fetchJSON<unknown>('/api/error')).rejects.toThrow('API error 500');
    });

    it('throws error for 401 response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Map([['content-type', 'text/plain']]),
        text: async () => '',
      });

      await expect(fetchJSON<unknown>('/api/protected')).rejects.toThrow('API error 401');
    });

    it('extracts JSON error message and preserves status code', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ error: 'Invalid request body' }),
      });

      await expect(fetchJSON<unknown>('/api/test')).rejects.toThrow(
        'API error 400: Invalid request body'
      );
    });

    it('extracts plain-text error message and preserves status code', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        headers: new Map([['content-type', 'text/plain']]),
        text: async () => 'Bad Gateway - upstream service unavailable',
      });

      await expect(fetchJSON<unknown>('/api/test')).rejects.toThrow(
        'API error 502: Bad Gateway - upstream service unavailable'
      );
    });

    it('truncates long plain-text error messages to 100 characters', async () => {
      const longError = 'A'.repeat(150);
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Map([['content-type', 'text/plain']]),
        text: async () => longError,
      });

      await expect(fetchJSON<unknown>('/api/test')).rejects.toThrow(
        `API error 500: ${longError.slice(0, 100)}`
      );
    });

    it('falls back to default message when error body parsing fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => {
          throw new Error('Invalid JSON');
        },
        text: async () => {
          throw new Error('Cannot read text');
        },
      });

      await expect(fetchJSON<unknown>('/api/test')).rejects.toThrow('API error 500');
    });

    it('does not throw for 206 status (partial content)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 206,
        json: async () => ({ data: 'partial', degraded: ['source'] }),
      });

      const result = await fetchJSON<{ data: string; degraded: string[] }>('/api/partial');

      expect(result.degraded).toEqual(['source']);
    });

    it('throws error when fetch itself fails', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(fetchJSON<unknown>('/api/test')).rejects.toThrow('Network error');
    });

    it('throws error with status code for various HTTP errors', async () => {
      const statusCodes = [400, 403, 502, 503, 504];

      for (const status of statusCodes) {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status,
          headers: new Map([['content-type', 'text/plain']]),
          text: async () => '',
        });

        await expect(fetchJSON<unknown>('/api/test')).rejects.toThrow(`API error ${status}`);
      }
    });
  });

  describe('degraded data handling', () => {
    it('includes degraded array from 206 response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 206,
        json: async () => ({
          servers: [{ id: 'nyx', cpu: 50 }],
          degraded: ['signoz'],
        }),
      });

      const result = await fetchJSON<{ servers: unknown[]; degraded: string[] }>('/api/cluster');

      expect(result.data.servers).toBeDefined();
      expect(result.degraded).toEqual(['signoz']);
    });

    it('sets degraded to undefined for 200 response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ servers: [] }),
      });

      const result = await fetchJSON<{ servers: unknown[] }>('/api/cluster');

      expect(result.degraded).toBeUndefined();
    });

    it('preserves multiple degraded sources', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 206,
        json: async () => ({
          data: {},
          degraded: ['signoz', 'ntopng', 'elastiflow'],
        }),
      });

      const result = await fetchJSON<{ data: Record<string, never>; degraded: string[] }>('/api/cluster');

      expect(result.degraded).toEqual(['signoz', 'ntopng', 'elastiflow']);
    });

    it('handles empty degraded array', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 206,
        json: async () => ({
          data: {},
          degraded: [],
        }),
      });

      const result = await fetchJSON<{ data: Record<string, never>; degraded: string[] }>('/api/cluster');

      expect(result.degraded).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('handles large JSON responses', async () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({ id: i }));

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => largeArray,
      });

      const result = await fetchJSON<Array<{ id: number }>>('/api/large');

      expect(result.data).toHaveLength(10000);
    });

    it('handles response with null data', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => null,
      });

      const result = await fetchJSON<null>('/api/null');

      expect(result.data).toBeNull();
    });

    it('handles response with boolean value', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => true,
      });

      const result = await fetchJSON<boolean>('/api/bool');

      expect(result.data).toBe(true);
    });

    it('handles response with numeric value', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => 42,
      });

      const result = await fetchJSON<number>('/api/number');

      expect(result.data).toBe(42);
    });
  });

});
