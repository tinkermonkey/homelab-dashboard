import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MCPClient } from './mcp-client.js';
import { config } from '../config.js';

describe('MCPClient', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('call method', () => {
    it('successfully calls MCP method with result', async () => {
      const mockResponse = {
        jsonrpc: '2.0' as const,
        id: 1,
        result: { data: 'test' },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new MCPClient();
      const result = await client.call('test_method');

      expect(result).toEqual({ data: 'test' });
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('sends correct request structure', async () => {
      const mockResponse = {
        jsonrpc: '2.0' as const,
        id: 1,
        result: null,
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });
      global.fetch = fetchMock;

      const client = new MCPClient('http://localhost:8000/mcp');
      await client.call('test_method', { param1: 'value1' });

      const callArgs = fetchMock.mock.calls[0];
      expect(callArgs[0]).toBe('http://localhost:8000/mcp');
      expect(callArgs[1]).toBeDefined();

      const requestBody = JSON.parse(callArgs[1].body);
      expect(requestBody.jsonrpc).toBe('2.0');
      expect(requestBody.method).toBe('test_method');
      expect(requestBody.params).toEqual({ param1: 'value1' });
    });

    it('throws error when response is not ok', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const client = new MCPClient();

      await expect(client.call('missing_method')).rejects.toThrow(
        /MCP call failed \(missing_method\).*HTTP 404/
      );
    });

    it('throws error when MCP response contains error', async () => {
      const mockResponse = {
        jsonrpc: '2.0' as const,
        id: 1,
        error: {
          code: -32600,
          message: 'Invalid Request',
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const client = new MCPClient();

      await expect(client.call('bad_method')).rejects.toThrow(
        /MCP call failed \(bad_method\).*MCP Error: Invalid Request/
      );
    });

    it('throws error when fetch fails', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const client = new MCPClient();

      await expect(client.call('unreachable_method')).rejects.toThrow(
        /MCP call failed \(unreachable_method\)/
      );
    });

    it('throws error with helpful message for timeout', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('fetch failed'));

      const client = new MCPClient();

      await expect(client.call('slow_method')).rejects.toThrow(
        'MCP call failed (slow_method)'
      );
    });

    it('handles response with no body', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
        }),
      });

      const client = new MCPClient();
      const result = await client.call('method_with_no_result');

      expect(result).toBeUndefined();
    });

    it('constructs unique IDs for each call', async () => {
      const mockResponse = {
        jsonrpc: '2.0' as const,
        result: null,
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });
      global.fetch = fetchMock;

      const client = new MCPClient();
      await client.call('method1');
      await client.call('method2');

      const call1Body = JSON.parse(fetchMock.mock.calls[0][1].body);
      const call2Body = JSON.parse(fetchMock.mock.calls[1][1].body);

      expect(call1Body.id).toContain('method1');
      expect(call2Body.id).toContain('method2');
      expect(call1Body.id).not.toBe(call2Body.id);
    });

    it('uses custom base URL', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ jsonrpc: '2.0', id: 1, result: null }),
      });
      global.fetch = fetchMock;

      const customUrl = 'http://custom-endpoint:9000/mcp';
      const client = new MCPClient(customUrl);
      await client.call('test');

      expect(fetchMock.mock.calls[0][0]).toBe(customUrl);
    });
  });

  describe('Error scenarios', () => {
    it('preserves original error message in stack', async () => {
      global.fetch = vi.fn().mockRejectedValue(
        new Error('Connection refused')
      );

      const client = new MCPClient();

      try {
        await client.call('test');
        expect.fail('Should have thrown');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain('Connection refused');
      }
    });

    it('handles non-Error thrown objects', async () => {
      global.fetch = vi.fn().mockRejectedValue('string error');

      const client = new MCPClient();

      await expect(client.call('test')).rejects.toThrow(
        /MCP call failed \(test\): Unknown error/
      );
    });

    it('handles HTTP 500 errors with proper messaging', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const client = new MCPClient();

      await expect(client.call('failing_method')).rejects.toThrow(
        /HTTP 500/
      );
    });
  });
});
