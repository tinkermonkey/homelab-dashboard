import { config } from '../config.js';
import { fetchWithTimeout } from '../utils/fetch-with-timeout.js';

// phone-home REST API: POST /v1/servers/{server}/tools/{tool}
// Docs: ../../../phone-home/docs/openapi.json
interface InvokeResponse {
  server: string;
  tool: string;
  is_error: boolean;
  content: Array<Record<string, unknown>>;
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

      // Prefer structured_content when available, fall back to raw content array
      return data.structured_content ?? data.content;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`MCP tool call failed (${server}/${tool}): ${message}`);
    }
  }

  async getDockerInventory(): Promise<unknown> {
    return this.callTool('homelab-data', 'list_containers');
  }

  async getTopologyData(): Promise<unknown> {
    return this.callTool('homelab-data', 'list_bots');
  }

  async listContainers(): Promise<unknown> {
    return this.callTool('homelab-data', 'list_containers');
  }
}

export const mcpClient = new MCPClient();
