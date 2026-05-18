import type { DOCKER_DATA, TOPOLOGY_DATA } from '@homelab/shared';
import { mcpClient } from '../clients/mcp-client.js';
import { getDockerData, getTopologyData } from '../mock-data.js';

function isValidDockerData(data: unknown): data is DOCKER_DATA {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return Array.isArray(obj.hosts) && obj.hosts.every((host: unknown) => {
    if (!host || typeof host !== 'object') return false;
    const h = host as Record<string, unknown>;
    return typeof h.id === 'string' &&
           Array.isArray(h.containers) &&
           Array.isArray(h.networks) &&
           Array.isArray(h.volumes);
  });
}

function isValidTopologyData(data: unknown): data is TOPOLOGY_DATA {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return Array.isArray(obj.hosts) &&
         obj.hosts.every((h: unknown) => typeof h === 'string') &&
         Array.isArray(obj.bots) &&
         obj.bots.every((bot: unknown) => {
           if (!bot || typeof bot !== 'object') return false;
           const b = bot as Record<string, unknown>;
           return typeof b.id === 'string' &&
                  typeof b.label === 'string' &&
                  Array.isArray(b.mcps) &&
                  Array.isArray(b.delegates);
         });
}

export async function transformDockerData(): Promise<{
  data: DOCKER_DATA;
  degraded: string[];
}> {
  const degraded: string[] = [];

  try {
    const result = await mcpClient.getDockerInventory();
    if (!isValidDockerData(result)) {
      throw new Error('Invalid Docker data structure from MCP');
    }
    return { data: result, degraded };
  } catch (error) {
    console.error('Error fetching Docker data from MCP:', error);
    degraded.push('phone-home');
    return { data: getDockerData(), degraded };
  }
}

export async function transformTopologyData(): Promise<{
  data: TOPOLOGY_DATA;
  degraded: string[];
}> {
  const degraded: string[] = [];

  try {
    const result = await mcpClient.getTopologyData();
    if (!isValidTopologyData(result)) {
      throw new Error('Invalid topology data structure from MCP');
    }
    return { data: result, degraded };
  } catch (error) {
    console.error('Error fetching topology data from MCP:', error);
    degraded.push('phone-home');
    return { data: getTopologyData(), degraded };
  }
}
