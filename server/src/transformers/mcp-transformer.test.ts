import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { transformDockerData, transformTopologyData } from './mcp-transformer.js';
import { mcpClient } from '../clients/mcp-client.js';
import { metricbeatClient } from '../clients/metricbeat-client.js';
import type { FastifyBaseLogger } from 'fastify';

vi.mock('../clients/mcp-client.js');
vi.mock('../clients/metricbeat-client.js');

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
    it('maps Metricbeat docker containers grouped and sorted by host', async () => {
      vi.mocked(metricbeatClient.getDockerContainers).mockResolvedValue([
        {
          host: 't5610', id: '828f81095303abcdef0123', name: 'context-library-context-server-1',
          image: 'context-library-context-server', status: 'Up 36 minutes', created: '2026-06-14T03:12:03.000Z',
          cpuPct: 0.8, memPct: 1.2, sizeRwBytes: 0, health: 'healthy', ips: ['172.23.0.2'], project: 'context-library',
        },
        {
          host: 't5610', id: 'aa11bb22cc33dd44ee55', name: 'flow-collector',
          image: 'elastiflow/flow-collector:7.23.0', status: 'Exited (0) 2 hours ago', created: '2026-06-10T00:00:00.000Z',
          cpuPct: 0, memPct: 0, sizeRwBytes: 1048576, health: null, ips: [], project: 'elastiflow',
        },
      ]);

      const result = await transformDockerData(mockLogger);

      expect(metricbeatClient.getDockerContainers).toHaveBeenCalled();
      expect(result.source).toBe('real');
      expect(result.degraded).toEqual([]);
      expect(result.data.hosts).toHaveLength(1);

      const host = result.data.hosts[0];
      expect(host.id).toBe('t5610');
      expect(host.engine).toBe('docker');
      expect(host.containers).toHaveLength(2);

      const [c0, c1] = host.containers; // sorted by name
      expect(c0.name).toBe('context-library-context-server-1');
      expect(c0.id).toBe('828f81095303'); // truncated to 12 chars
      expect(c0.image).toBe('context-library-context-server');
      expect(c0.tag).toBe('latest');
      expect(c0.state).toBe('running');
      expect(c0.health).toBe('healthy');
      expect(c0.uptime).toBe('Up 36 minutes');
      expect(c0.cpu).toBe(0.8);
      expect(c0.networks).toEqual(['context-library']);
      expect(c0.size).toBe('—');

      expect(c1.image).toBe('elastiflow/flow-collector');
      expect(c1.tag).toBe('7.23.0');
      expect(c1.state).toBe('exited');
      expect(c1.health).toBe('stopped');
      expect(c1.size).toBe('1 MB');
    });

    it('returns empty hosts (still real) when there are no containers', async () => {
      vi.mocked(metricbeatClient.getDockerContainers).mockResolvedValue([]);

      const result = await transformDockerData(mockLogger);

      expect(result.data).toEqual({ hosts: [] });
      expect(result.degraded).toEqual([]);
      expect(result.source).toBe('real');
    });

    it('degrades to unavailable when the ES query throws', async () => {
      vi.mocked(metricbeatClient.getDockerContainers).mockRejectedValue(new Error('Connection refused'));

      const result = await transformDockerData(mockLogger);

      expect(result.data).toEqual({ hosts: [] });
      expect(result.degraded).toEqual(['docker']);
      expect(result.source).toBe('unavailable');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: expect.any(Error) }),
        expect.stringContaining('Error fetching container inventory from Metricbeat'),
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
