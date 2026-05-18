import { config } from '../config.js';
import { fetchWithTimeout } from '../utils/fetch-with-timeout.js';

interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export class MCPClient {
  private baseUrl: string;

  constructor(baseUrl: string = config.phoneHomeMcpUrl) {
    this.baseUrl = baseUrl;
  }

  async call(method: string, params?: Record<string, unknown>): Promise<unknown> {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: `${method}-${Date.now()}`,
      method,
      params,
    };

    try {
      const response = await fetchWithTimeout(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        timeout: 15000,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as MCPResponse;

      if (data.error) {
        throw new Error(`MCP Error: ${data.error.message}`);
      }

      return data.result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`MCP call failed (${method}): ${message}`);
    }
  }

  // Fetch Docker inventory data
  async getDockerInventory(): Promise<unknown> {
    return this.callTool('DOCKER_DATA');
  }

  // Fetch bot topology data
  async getTopologyData(): Promise<unknown> {
    return this.callTool('TOPOLOGY_DATA');
  }

  // Fetch list of running containers across the cluster
  async listContainers(): Promise<unknown> {
    return this.callTool('list_containers');
  }

  private async callTool(toolName: string, params?: Record<string, unknown>): Promise<unknown> {
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: `${toolName}-${Date.now()}`,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: params || {},
      },
    };

    try {
      const response = await fetchWithTimeout(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        timeout: 15000,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as MCPResponse;

      if (data.error) {
        throw new Error(`MCP Error: ${data.error.message}`);
      }

      return data.result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`MCP tool call failed (${toolName}): ${message}`);
    }
  }
}

export const mcpClient = new MCPClient();
