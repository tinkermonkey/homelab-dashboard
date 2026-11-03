import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { transformDockerData, transformTopologyData } from './mcp-transformer.js';
import { mcpClient } from '../clients/mcp-client.js';
import type { FastifyBaseLogger } from 'fastify';

vi.mock('../clients/mcp-client.js');

describe('MCP Transformer', () => {
  const mockLogger = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    silent: vi.fn(),
  } as unknown as FastifyBaseLogger;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('transformDockerData', () => {
    it('returns hosts from the list_containers MCP tool', async () => {
      const hosts = [
        {
          id: 't5610', engine: '27.0.3', compose: '3',
          containers: [{
            id: 'c1', name: 'nginx', image: 'nginx', tag: 'latest', state: 'running',
            health: 'healthy', uptime: 'Up 2 hours', ports: ['0.0.0.0:80->80/tcp'],
            mounts: [], networks: ['frontend'], size: '', cpu: 1.2, mem: 3.4,
          }],
          networks: [], volumes: [],
        },
      ];
      vi.mocked(mcpClient.callTool).mockResolvedValue({ hosts, source: 'docker' });

      const result = await transformDockerData(mockLogger);

      expect(mcpClient.callTool).toHaveBeenCalledWith('list_containers');
      expect(result.data).toEqual({ hosts });
      expect(result.degraded).toEqual([]);
      expect(result.source).toBe('real');
    });

    it('returns empty hosts when the tool result has no hosts array', async () => {
      vi.mocked(mcpClient.callTool).mockResolvedValue({ source: 'metricbeat' });

      const result = await transformDockerData(mockLogger);

      expect(result.data).toEqual({ hosts: [] });
      expect(result.degraded).toEqual([]);
      expect(result.source).toBe('real');
    });

    it('degrades to unavailable when the MCP tool call throws', async () => {
      vi.mocked(mcpClient.callTool).mockRejectedValue(new Error('Connection refused'));

      const result = await transformDockerData(mockLogger);

      expect(result.data).toEqual({ hosts: [] });
      expect(result.degraded).toEqual(['docker']);
      expect(result.source).toBe('unavailable');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error) }),
        expect.stringContaining('Error fetching container inventory from homelab-data MCP'),
      );
    });
  });

  describe('transformTopologyData', () => {
    it('returns the registry hosts and no bots, without calling MCP', async () => {
      const result = await transformTopologyData();

      expect(result.source).toBe('real');
      expect(result.degraded).toEqual([]);
      expect(result.data.hosts.length).toBeGreaterThan(0);
      expect(result.data.bots).toEqual([]);
      expect(mcpClient.callTool).not.toHaveBeenCalled();
    });
  });
});
