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
    // list_containers walks each Docker host in turn (15 s timeout per request
    // server-side), so it gets a longer budget than the 15 s default.
    const raw = (await mcpClient.callTool('list_containers', {}, { timeoutMs: 60000 })) as
      | { hosts?: DOCKER_DATA['hosts'] }
      | null;
    const hosts = Array.isArray(raw?.hosts) ? raw!.hosts! : [];
    return { data: { hosts }, degraded: [], source: 'real' };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching container inventory from homelab-data MCP');
    return { data: { hosts: [] }, degraded: ['docker'], source: 'unavailable' };
  }
}

// Topology shows the physical cluster hosts. (It used to add an agent roster
// from the phone-home control plane, retired in 2026-11.)
export async function transformTopologyData(): Promise<{
  data: TOPOLOGY_DATA;
  degraded: string[];
  source: 'real';
}> {
  return {
    data: { hosts: SERVER_REGISTRY.map(s => s.id) },
    degraded: [],
    source: 'real',
  };
}
