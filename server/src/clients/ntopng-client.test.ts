import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NtopngClient } from './ntopng-client.js';
import { fetchWithTimeout } from '../utils/fetch-with-timeout.js';

vi.mock('../utils/fetch-with-timeout.js');

describe('NtopngClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getHeaders()', () => {
    it('returns Authorization header with Token scheme when token is provided', async () => {
      const mockResponse = new Response(
        JSON.stringify({
          rc: 0,
          rc_str: 'OK',
          rsp: {
            download_upload_chart: { download: [100], upload: [50] },
          },
        }),
        { status: 200 }
      );
      vi.mocked(fetchWithTimeout).mockResolvedValue(mockResponse);

      const client = new NtopngClient('http://ntopng:3000', 'my-ntopng-token');
      await client.getWanInterfaceStats();

      expect(fetchWithTimeout).toHaveBeenCalled();
      const headers = vi.mocked(fetchWithTimeout).mock.calls[0][1]?.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Token my-ntopng-token');
    });

    it('omits Authorization header when token is empty', async () => {
      const mockResponse = new Response(
        JSON.stringify({
          rc: 0,
          rc_str: 'OK',
          rsp: {
            download_upload_chart: { download: [100], upload: [50] },
          },
        }),
        { status: 200 }
      );
      vi.mocked(fetchWithTimeout).mockResolvedValue(mockResponse);

      const client = new NtopngClient('http://ntopng:3000', '');
      await client.getWanInterfaceStats();

      expect(fetchWithTimeout).toHaveBeenCalled();
      const headers = vi.mocked(fetchWithTimeout).mock.calls[0][1]?.headers as Record<string, string>;
      expect(headers['Authorization']).toBeUndefined();
    });
  });

  describe('getWanInterfaceStats()', () => {
    it('fetches and transforms WAN interface stats correctly', async () => {
      const mockResponse = new Response(
        JSON.stringify({
          rc: 0,
          rc_str: 'OK',
          rsp: {
            download_upload_chart: {
              download: [500, 600, 700],
              upload: [200, 250, 300],
            },
          },
        }),
        { status: 200 }
      );
      vi.mocked(fetchWithTimeout).mockResolvedValue(mockResponse);

      const client = new NtopngClient('http://ntopng:3000', 'token');
      const stats = await client.getWanInterfaceStats();

      expect(stats.downMbps).toBe(0.7);
      expect(stats.upMbps).toBe(0.3);
      expect(stats.downHist).toEqual([500, 600, 700]);
      expect(stats.upHist).toEqual([200, 250, 300]);
    });

    it('handles missing chart data gracefully', async () => {
      const mockResponse = new Response(
        JSON.stringify({
          rc: 0,
          rc_str: 'OK',
          rsp: {},
        }),
        { status: 200 }
      );
      vi.mocked(fetchWithTimeout).mockResolvedValue(mockResponse);

      const client = new NtopngClient('http://ntopng:3000', 'token');
      const stats = await client.getWanInterfaceStats();

      expect(stats.downMbps).toBe(0);
      expect(stats.upMbps).toBe(0);
      expect(stats.downHist).toEqual([]);
      expect(stats.upHist).toEqual([]);
    });

    it('throws error on HTTP error', async () => {
      const mockResponse = new Response('Unauthorized', { status: 401 });
      vi.mocked(fetchWithTimeout).mockResolvedValue(mockResponse);

      const client = new NtopngClient('http://ntopng:3000', 'bad-token');
      await expect(client.getWanInterfaceStats()).rejects.toThrow(/ntopng request failed.*HTTP 401/);
    });

    it('throws error on network failure', async () => {
      vi.mocked(fetchWithTimeout).mockRejectedValue(new Error('Connection timeout'));

      const client = new NtopngClient('http://ntopng:3000', 'token');
      await expect(client.getWanInterfaceStats()).rejects.toThrow(/ntopng request failed.*Connection timeout/);
    });

    it('calls correct ntopng API endpoint with ifid parameter', async () => {
      const mockResponse = new Response(
        JSON.stringify({
          rc: 0,
          rc_str: 'OK',
          rsp: {
            download_upload_chart: { download: [100], upload: [50] },
          },
        }),
        { status: 200 }
      );
      vi.mocked(fetchWithTimeout).mockResolvedValue(mockResponse);

      const client = new NtopngClient('http://ntopng:3000', 'token');
      await client.getWanInterfaceStats();

      expect(fetchWithTimeout).toHaveBeenCalled();
      const url = vi.mocked(fetchWithTimeout).mock.calls[0][0] as string;
      expect(url).toContain('/lua/rest/v2/get/interface/data.lua');
      expect(url).toContain('ifid=2');
    });

    it('trims trailing slash from baseUrl', () => {
      const client = new NtopngClient('http://ntopng:3000/', 'token');
      // The baseUrl should be normalized - we can't directly access it, so we test indirectly
      // by verifying the fetch URL doesn't have double slashes
      const mockResponse = new Response(
        JSON.stringify({
          rc: 0,
          rc_str: 'OK',
          rsp: {
            download_upload_chart: { download: [100], upload: [50] },
          },
        }),
        { status: 200 }
      );
      vi.mocked(fetchWithTimeout).mockResolvedValue(mockResponse);

      client.getWanInterfaceStats().catch(() => {});

      const url = vi.mocked(fetchWithTimeout).mock.calls[0][0] as string;
      expect(url).not.toContain('//lua');
    });
  });
});
