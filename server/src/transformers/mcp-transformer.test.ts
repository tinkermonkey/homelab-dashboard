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

      expect(mcpClient.callTool).toHaveBeenCalledWith('homelab-data', 'list_containers');
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
    const mockServers = [
      { name: 't5610', url: 'http://100.104.222.123:3210/mcp/', healthy: true, tool_count: 7, error: null },
      { name: 'signoz-analyst', url: 'http://signoz-analyst:3221/mcp/', healthy: true, tool_count: 5, error: null },
      { name: 'homelab-data', url: 'http://homelab-data-mcp:3220/mcp/', healthy: true, tool_count: 19, error: null },
    ];

    it('returns bots from /v1/servers excluding homelab-data', async () => {
      vi.mocked(mcpClient.getServers).mockResolvedValue(mockServers);
      vi.mocked(mcpClient.getAgentStatus).mockResolvedValue('idle');

      const result = await transformTopologyData(mockLogger);

      expect(result.source).toBe('real');
      expect(result.degraded).toEqual([]);
      // homelab-data is excluded from bots
      expect(result.data.bots.map(b => b.id)).not.toContain('homelab-data');
      expect(result.data.bots.map(b => b.id)).toContain('t5610');
      expect(result.data.bots.map(b => b.id)).toContain('signoz-analyst');
    });

    it('uses SERVER_REGISTRY for hosts regardless of MCP servers', async () => {
      vi.mocked(mcpClient.getServers).mockResolvedValue(mockServers);
      vi.mocked(mcpClient.getAgentStatus).mockResolvedValue('idle');

      const result = await transformTopologyData(mockLogger);

      // Hosts come from SERVER_REGISTRY (t5610, petit-cochon, hp7052)
      expect(result.data.hosts).toContain('t5610');
      expect(result.data.hosts).toContain('petit-cochon');
      expect(result.data.hosts).toContain('hp7052');
    });

    it('maps running agent state to busy bot status', async () => {
      vi.mocked(mcpClient.getServers).mockResolvedValue([mockServers[0]]);
      vi.mocked(mcpClient.getAgentStatus).mockResolvedValue('running');

      const result = await transformTopologyData(mockLogger);
      expect(result.data.bots[0].status).toBe('busy');
    });

    it('maps idle agent state to idle bot status', async () => {
      vi.mocked(mcpClient.getServers).mockResolvedValue([mockServers[0]]);
      vi.mocked(mcpClient.getAgentStatus).mockResolvedValue('idle');

      const result = await transformTopologyData(mockLogger);
      expect(result.data.bots[0].status).toBe('idle');
    });

    it('maps done agent state to ok bot status', async () => {
      vi.mocked(mcpClient.getServers).mockResolvedValue([mockServers[0]]);
      vi.mocked(mcpClient.getAgentStatus).mockResolvedValue('done');

      const result = await transformTopologyData(mockLogger);
      expect(result.data.bots[0].status).toBe('ok');
    });

    it('uses known metadata for recognized agents', async () => {
      vi.mocked(mcpClient.getServers).mockResolvedValue([mockServers[0]]); // t5610
      vi.mocked(mcpClient.getAgentStatus).mockResolvedValue('idle');

      const result = await transformTopologyData(mockLogger);
      const bot = result.data.bots[0];
      expect(bot.label).toBe('T5610');
      expect(bot.avatar).toBe('T5');
      expect(bot.role).toBe('Compute host');
    });

    it('falls back to server name for unknown agents', async () => {
      vi.mocked(mcpClient.getServers).mockResolvedValue([
        { name: 'unknown-agent', url: 'http://unknown:3210/mcp/', healthy: true, tool_count: 3, error: null },
      ]);
      vi.mocked(mcpClient.getAgentStatus).mockResolvedValue('idle');

      const result = await transformTopologyData(mockLogger);
      const bot = result.data.bots[0];
      expect(bot.id).toBe('unknown-agent');
      expect(bot.label).toBe('unknown-agent');
    });

    it('continues when individual getAgentStatus calls fail', async () => {
      vi.mocked(mcpClient.getServers).mockResolvedValue([mockServers[0], mockServers[1]]);
      vi.mocked(mcpClient.getAgentStatus)
        .mockResolvedValueOnce('running')
        .mockRejectedValueOnce(new Error('timeout'));

      const result = await transformTopologyData(mockLogger);
      expect(result.data.bots).toHaveLength(2);
      expect(result.data.bots[0].status).toBe('busy');
      // failed status fetch defaults to idle
      expect(result.data.bots[1].status).toBe('idle');
    });

    it('degrades and returns host-only fallback when getServers fails', async () => {
      vi.mocked(mcpClient.getServers).mockRejectedValue(new Error('Connection refused'));

      const result = await transformTopologyData(mockLogger);

      expect(result.source).toBe('unavailable');
      expect(result.degraded).toContain('phone-home');
      expect(result.data.bots).toEqual([]);
      expect(result.data.hosts.length).toBeGreaterThan(0);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error) }),
        expect.stringContaining('Error fetching topology from phone-home')
      );
    });
  });
});
