import type { DOCKER_DATA, TOPOLOGY_DATA } from '@homelab/shared';
import { mcpClient } from '../clients/mcp-client.js';
import { getDockerData, getTopologyData } from '../mock-data.js';

export async function transformDockerData(): Promise<{
  data: DOCKER_DATA;
  degraded: string[];
}> {
  const degraded: string[] = [];

  try {
    const result = await mcpClient.getDockerInventory();
    return { data: result as DOCKER_DATA, degraded };
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
    return { data: result as TOPOLOGY_DATA, degraded };
  } catch (error) {
    console.error('Error fetching topology data from MCP:', error);
    degraded.push('phone-home');
    return { data: getTopologyData(), degraded };
  }
}
