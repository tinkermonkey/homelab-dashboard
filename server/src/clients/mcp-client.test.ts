import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MCPClient } from './mcp-client.js';

describe('MCPClient', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const successResponse = (result: unknown) => ({
    ok: true,
    json: async () => ({
      server: 'homelab-data',
      tool: 'test_tool',
      is_error: false,
      content: [],
      structured_content: result,
    }),
  });

  describe('callTool', () => {
    it('returns structured_content on success', async () => {
      global.fetch = vi.fn().mockResolvedValue(successResponse({ data: 'test' }));

      const client = new MCPClient('http://localhost:8000', 'my-token');
      const result = await client.callTool('homelab-data', 'my_tool');

      expect(result).toEqual({ data: 'test' });
    });

    it('builds correct REST URL', async () => {
      const fetchMock = vi.fn().mockResolvedValue(successResponse(null));
      global.fetch = fetchMock;

      const client = new MCPClient('http://localhost:8000', 'tok');
      await client.callTool('my-server', 'my-tool', { foo: 'bar' });

      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe('http://localhost:8000/v1/servers/my-server/tools/my-tool');
      expect(JSON.parse(opts.body)).toEqual({ arguments: { foo: 'bar' } });
    });

    it('sends bearer auth header', async () => {
      const fetchMock = vi.fn().mockResolvedValue(successResponse(null));
      global.fetch = fetchMock;

      const client = new MCPClient('http://localhost:8000', 'secret-token');
      await client.callTool('s', 't');

      const [, opts] = fetchMock.mock.calls[0];
      expect(opts.headers['Authorization']).toBe('Bearer secret-token');
    });

    it('omits auth header when no token configured', async () => {
      const fetchMock = vi.fn().mockResolvedValue(successResponse(null));
      global.fetch = fetchMock;

      const client = new MCPClient('http://localhost:8000', '');
      await client.callTool('s', 't');

      const [, opts] = fetchMock.mock.calls[0];
      expect(opts.headers['Authorization']).toBeUndefined();
    });

    it('falls back to content array when structured_content is null', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          server: 's', tool: 't', is_error: false,
          content: [{ text: 'hello' }],
          structured_content: null,
        }),
      });

      const client = new MCPClient();
      const result = await client.callTool('s', 't');
      expect(result).toEqual([{ text: 'hello' }]);
    });

    it('throws when is_error is true', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          server: 's', tool: 't', is_error: true,
          content: [{ text: 'something went wrong' }],
        }),
      });

      const client = new MCPClient();
      await expect(client.callTool('s', 't')).rejects.toThrow(/Tool error.*something went wrong/);
    });

    it('throws on HTTP error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false, status: 401, statusText: 'Unauthorized',
      });

      const client = new MCPClient();
      await expect(client.callTool('s', 't')).rejects.toThrow(/HTTP 401/);
    });

    it('throws on network failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const client = new MCPClient();
      await expect(client.callTool('s', 't')).rejects.toThrow(/Connection refused/);
    });

    it('wraps non-Error throws', async () => {
      global.fetch = vi.fn().mockRejectedValue('string error');

      const client = new MCPClient();
      await expect(client.callTool('s', 't')).rejects.toThrow(/Unknown error/);
    });

    it('handles HTTP 500 errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false, status: 500, statusText: 'Internal Server Error',
      });

      const client = new MCPClient();
      await expect(client.callTool('s', 't')).rejects.toThrow(/HTTP 500/);
    });
  });

  describe('convenience methods', () => {
    it('getDockerInventory calls homelab-data/list_containers', async () => {
      const fetchMock = vi.fn().mockResolvedValue(successResponse([]));
      global.fetch = fetchMock;

      const client = new MCPClient('http://localhost:8000', 'tok');
      await client.getDockerInventory();

      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain('/v1/servers/homelab-data/tools/list_containers');
    });

    it('listContainers calls homelab-data/list_containers', async () => {
      const fetchMock = vi.fn().mockResolvedValue(successResponse([]));
      global.fetch = fetchMock;

      const client = new MCPClient('http://localhost:8000', 'tok');
      await client.listContainers();

      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain('/v1/servers/homelab-data/tools/list_containers');
    });

    it('getTopologyData calls homelab-data/list_bots', async () => {
      const fetchMock = vi.fn().mockResolvedValue(successResponse([]));
      global.fetch = fetchMock;

      const client = new MCPClient('http://localhost:8000', 'tok');
      await client.getTopologyData();

      const [url] = fetchMock.mock.calls[0];
      expect(url).toContain('/v1/servers/homelab-data/tools/list_bots');
    });
  });
});
