import type { DOCKER_DATA, TOPOLOGY_DATA } from '@homelab/shared';
import type { FastifyBaseLogger } from 'fastify';
import { mcpClient } from '../clients/mcp-client.js';
import { SERVER_REGISTRY } from '../cluster-config.js';

export async function transformDockerData(logger: FastifyBaseLogger): Promise<{
  data: DOCKER_DATA;
  degraded: string[];
  source: 'real' | 'unavailable';
}> {
  // Container inventory comes from the homelab-data MCP `list_containers` tool
  // (full Docker Engine API detail via per-host read-only socket proxies, with a
  // Metricbeat fallback). It already returns the DOCKER_DATA shape.
  try {
    const raw = (await mcpClient.callTool('list_containers')) as
      | { hosts?: DOCKER_DATA['hosts'] }
      | null;
    const hosts = Array.isArray(raw?.hosts) ? raw!.hosts! : [];
    return { data: { hosts }, degraded: [], source: 'real' };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching container inventory from homelab-data MCP');
    return { data: { hosts: [] }, degraded: ['docker'], source: 'unavailable' };
  }
}

// The agent roster that used to populate `bots` came from the phone-home control
// plane, which was retired in 2026-11. Topology now shows the physical hosts only.
export async function transformTopologyData(): Promise<{
  data: TOPOLOGY_DATA;
  degraded: string[];
  source: 'real';
}> {
  return {
    data: { hosts: SERVER_REGISTRY.map(s => s.id), bots: [] },
    degraded: [],
    source: 'real',
  };
}
