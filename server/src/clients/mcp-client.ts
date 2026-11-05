import { config } from '../config.js';

// Minimal MCP Streamable HTTP client for homelab-data-mcp (phone-home repo,
// servers/homelab-data-mcp). It only calls tools: initialize once, keep the
// session id, then send tools/call. FastMCP answers each POST with either JSON
// or a short SSE stream that ends after the response.

const PROTOCOL_VERSION = '2025-06-18';
const DEFAULT_TIMEOUT_MS = 15000;

export interface CallOptions {
  // Deadline for the whole call, including the time the tool takes to run.
  timeoutMs?: number;
}

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

interface Session {
  id: string | null;
  protocolVersion: string;
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
  // The handshake behind the current session. Concurrent callers share it.
  private session: Promise<Session> | null = null;

  constructor(url: string = config.homelabDataMcpUrl, token: string = config.homelabDataMcpToken) {
    this.url = url;
    this.token = token;
  }

  private headers(session: Session | null): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...(session?.id ? { 'Mcp-Session-Id': session.id } : {}),
      ...(session ? { 'Mcp-Protocol-Version': session.protocolVersion } : {}),
    };
  }

  // POST one JSON-RPC message. The deadline covers reading the body too: FastMCP
  // sends SSE headers at once and the result only when the tool finishes.
  private async send<T>(
    message: Record<string, unknown>,
    session: Session | null,
    timeoutMs: number,
    read: (response: Response) => Promise<T>,
  ): Promise<T> {
    const signal = AbortSignal.timeout(timeoutMs);
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: this.headers(session),
        body: JSON.stringify(message),
        signal,
      });
      if (!response.ok) {
        await response.body?.cancel().catch(() => {});
        // The server forgets sessions on restart and answers 404 for the old id.
        if (response.status === 404 && session?.id) {
          throw new SessionExpiredError('MCP session expired');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await read(response);
    } catch (error) {
      if (signal.aborted) {
        throw new Error(`${String(message.method)} timed out after ${timeoutMs} ms`, { cause: error });
      }
      throw error;
    }
  }

  // Send a JSON-RPC request and return its result.
  private request(
    method: string,
    params: Record<string, unknown>,
    session: Session | null,
    timeoutMs: number,
  ): Promise<{ result: unknown; response: Response }> {
    const id = this.nextId++;
    return this.send({ jsonrpc: '2.0', id, method, params }, session, timeoutMs, async response => {
      const contentType = response.headers.get('content-type') ?? '';
      const text = await response.text();
      const messages = contentType.includes('text/event-stream')
        ? parseSseMessages(text)
        : [JSON.parse(text) as JsonRpcResponse];
      const reply = messages.find(m => m.id === id);
      if (!reply) {
        throw new Error(`No response to ${method}`);
      }
      if (reply.error) {
        throw new Error(`${method}: ${reply.error.message}`);
      }
      return { result: reply.result, response };
    });
  }

  private async handshake(): Promise<Session> {
    const { result, response } = await this.request('initialize', {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: 'homelab-dashboard', version: '1.0.0' },
    }, null, DEFAULT_TIMEOUT_MS);
    const session: Session = {
      id: response.headers.get('mcp-session-id'),
      protocolVersion: (result as { protocolVersion?: string } | undefined)?.protocolVersion ?? PROTOCOL_VERSION,
    };
    await this.send({ jsonrpc: '2.0', method: 'notifications/initialized' }, session, DEFAULT_TIMEOUT_MS,
      async response => { await response.body?.cancel().catch(() => {}); });
    return session;
  }

  // A failed handshake is forgotten, so the next call tries again.
  private ensureSession(): Promise<Session> {
    if (!this.session) {
      const pending = this.handshake();
      this.session = pending;
      pending.catch(() => {
        if (this.session === pending) this.session = null;
      });
    }
    return this.session;
  }

  private async callToolOnce(tool: string, args: Record<string, unknown>, timeoutMs: number): Promise<ToolResult> {
    const pending = this.ensureSession();
    const session = await pending;
    try {
      const { result } = await this.request('tools/call', { name: tool, arguments: args }, session, timeoutMs);
      return (result ?? {}) as ToolResult;
    } catch (error) {
      // Only the first caller to see the expiry drops the session; the others
      // then join the handshake it starts instead of starting their own.
      if (error instanceof SessionExpiredError && this.session === pending) {
        this.session = null;
      }
      throw error;
    }
  }

  async callTool(tool: string, args: Record<string, unknown> = {}, options: CallOptions = {}): Promise<unknown> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    try {
      let result: ToolResult;
      try {
        result = await this.callToolOnce(tool, args, timeoutMs);
      } catch (error) {
        if (!(error instanceof SessionExpiredError)) throw error;
        result = await this.callToolOnce(tool, args, timeoutMs);
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
