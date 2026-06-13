import { config } from '../config.js';
import { fetchWithTimeout } from '../utils/fetch-with-timeout.js';

// phone-home REST API — docs: ../../../phone-home/docs/openapi.json
// In this architecture, MCP servers ARE agents: GET /v1/servers is the source of truth
// for "what agents are online."

export interface McpServer {
  name: string;
  url: string;
  healthy: boolean;
  tool_count: number | null;
  error: string | null;
}

interface ServerListResponse {
  servers: McpServer[];
}

interface InvokeResponse {
  server: string;
  tool: string;
  is_error: boolean;
  content: Array<{ type?: string; text?: string; [key: string]: unknown }>;
  structured_content?: Record<string, unknown> | null;
}

export class MCPClient {
  private baseUrl: string;
  private token: string;

  constructor(
    baseUrl: string = config.phoneHomeUrl,
    token: string = config.phoneHomeChatToken
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    };
  }

  async getServers(): Promise<McpServer[]> {
    const url = `${this.baseUrl}/v1/servers`;
    const response = await fetchWithTimeout(url, {
      headers: this.getHeaders(),
      timeout: 10000,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = (await response.json()) as ServerListResponse;
    return data.servers;
  }

  async callTool(server: string, tool: string, args: Record<string, unknown> = {}): Promise<unknown> {
    const url = `${this.baseUrl}/v1/servers/${encodeURIComponent(server)}/tools/${encodeURIComponent(tool)}`;

    try {
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ arguments: args }),
        timeout: 15000,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as InvokeResponse;

      if (data.is_error) {
        const msg = data.content.map(c => c.text ?? JSON.stringify(c)).join(' ');
        throw new Error(`Tool error: ${msg}`);
      }

      if (data.structured_content != null) {
        return data.structured_content;
      }

      // Single text item: try JSON parse (agents without structured_content return JSON strings)
      if (data.content.length === 1 && data.content[0].type === 'text' && data.content[0].text) {
        try {
          return JSON.parse(data.content[0].text);
        } catch {
          return data.content[0].text;
        }
      }

      return data.content;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`MCP tool call failed (${server}/${tool}): ${message}`, { cause: error });
    }
  }

  async getAgentStatus(serverName: string): Promise<string> {
    const result = await this.callTool(serverName, 'get_status');
    if (result && typeof result === 'object' && !Array.isArray(result)) {
      const state = (result as Record<string, unknown>).state;
      if (typeof state === 'string') return state;
    }
    return 'idle';
  }
}

export const mcpClient = new MCPClient();
