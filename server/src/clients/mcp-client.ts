import { config } from '../config.js';
import { fetchWithTimeout } from '../utils/fetch-with-timeout.js';

// Minimal MCP Streamable HTTP client for homelab-data-mcp (phone-home repo,
// servers/homelab-data-mcp). It only calls tools: initialize once, keep the
// session id, then send tools/call. FastMCP answers each POST with either JSON
// or a short SSE stream that ends after the response.

const PROTOCOL_VERSION = '2025-06-18';
const CALL_TIMEOUT_MS = 15000;

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id?: number | string | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface ToolResult {
  isError?: boolean;
  content?: Array<{ type?: string; text?: string; [key: string]: unknown }>;
  structuredContent?: Record<string, unknown> | null;
}

class SessionExpiredError extends Error {}

// Pull JSON-RPC messages out of an SSE body: each event's `data:` lines joined.
export function parseSseMessages(body: string): JsonRpcResponse[] {
  const messages: JsonRpcResponse[] = [];
  for (const event of body.split(/\r?\n\r?\n/)) {
    const data = event
      .split(/\r?\n/)
      .filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).replace(/^ /, ''))
      .join('\n');
    if (!data) continue;
    try {
      messages.push(JSON.parse(data) as JsonRpcResponse);
    } catch {
      // Not JSON (e.g. a keep-alive) — skip it.
    }
  }
  return messages;
}

export class MCPClient {
  private url: string;
  private token: string;
  private nextId = 1;
  private sessionId: string | null = null;
  private protocolVersion: string | null = null;
  private session: Promise<void> | null = null;

  constructor(url: string = config.homelabDataMcpUrl, token: string = config.homelabDataMcpToken) {
    this.url = url;
    this.token = token;
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...(this.sessionId ? { 'Mcp-Session-Id': this.sessionId } : {}),
      ...(this.protocolVersion ? { 'Mcp-Protocol-Version': this.protocolVersion } : {}),
    };
  }

  private async post(message: Record<string, unknown>): Promise<Response> {
    return fetchWithTimeout(this.url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(message),
      timeout: CALL_TIMEOUT_MS,
    });
  }

  // Send a JSON-RPC request and return its result.
  private async request(method: string, params: Record<string, unknown>): Promise<{ result: unknown; response: Response }> {
    const id = this.nextId++;
    const response = await this.post({ jsonrpc: '2.0', id, method, params });

    // The server forgets sessions on restart and answers 404 for the old id.
    if (response.status === 404 && this.sessionId) {
      throw new SessionExpiredError('MCP session expired');
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    const messages = contentType.includes('text/event-stream')
      ? parseSseMessages(await response.text())
      : [(await response.json()) as JsonRpcResponse];
    const reply = messages.find(m => m.id === id);
    if (!reply) {
      throw new Error(`No response to ${method}`);
    }
    if (reply.error) {
      throw new Error(`${method}: ${reply.error.message}`);
    }
    return { result: reply.result, response };
  }

  private async initialize(): Promise<void> {
    this.sessionId = null;
    this.protocolVersion = null;
    const { result, response } = await this.request('initialize', {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: 'homelab-dashboard', version: '1.0.0' },
    });
    this.sessionId = response.headers.get('mcp-session-id');
    this.protocolVersion = (result as { protocolVersion?: string } | undefined)?.protocolVersion ?? PROTOCOL_VERSION;

    const ack = await this.post({ jsonrpc: '2.0', method: 'notifications/initialized' });
    if (!ack.ok) {
      throw new Error(`initialized notification rejected: HTTP ${ack.status}`);
    }
  }

  // One handshake shared by concurrent callers; a failed one is retried next call.
  private ensureSession(): Promise<void> {
    if (!this.session) {
      this.session = this.initialize().catch(err => {
        this.session = null;
        throw err;
      });
    }
    return this.session;
  }

  private async callToolOnce(tool: string, args: Record<string, unknown>): Promise<ToolResult> {
    await this.ensureSession();
    const { result } = await this.request('tools/call', { name: tool, arguments: args });
    return (result ?? {}) as ToolResult;
  }

  async callTool(tool: string, args: Record<string, unknown> = {}): Promise<unknown> {
    try {
      let result: ToolResult;
      try {
        result = await this.callToolOnce(tool, args);
      } catch (error) {
        if (!(error instanceof SessionExpiredError)) throw error;
        this.session = null;
        result = await this.callToolOnce(tool, args);
      }

      const content = result.content ?? [];
      if (result.isError) {
        const msg = content.map(c => c.text ?? JSON.stringify(c)).join(' ');
        throw new Error(`Tool error: ${msg}`);
      }

      if (result.structuredContent != null) {
        return result.structuredContent;
      }

      // Single text item: try JSON parse (tools without structured output return JSON strings)
      if (content.length === 1 && content[0].type === 'text' && content[0].text) {
        try {
          return JSON.parse(content[0].text);
        } catch {
          return content[0].text;
        }
      }

      return content;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`MCP tool call failed (${tool}): ${message}`, { cause: error });
    }
  }
}

export const mcpClient = new MCPClient();
