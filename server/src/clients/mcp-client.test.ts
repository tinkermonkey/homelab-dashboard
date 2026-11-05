import { describe, it, expect, vi, afterEach } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { MCPClient, parseSseMessages } from './mcp-client.js';

const realFetch = globalThis.fetch;

const URL_ = 'http://t5610:3220/mcp/';

type ToolResult = {
  isError?: boolean;
  content?: Array<Record<string, unknown>>;
  structuredContent?: Record<string, unknown> | null;
};

const sse = (message: unknown) =>
  new Response(`event: message\r\ndata: ${JSON.stringify(message)}\r\n\r\n`, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });

const json = (message: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(message), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

// A fake homelab-data-mcp: hands out session ids, accepts the initialized
// notification, and answers tools/call with `toolResult` over SSE.
function fakeServer(toolResult: ToolResult | ((name: string) => ToolResult), opts: { sessionId?: string } = {}) {
  const sessionId = opts.sessionId ?? 'sess-1';
  return vi.fn(async (_url: unknown, init?: RequestInit) => {
    const msg = JSON.parse(init!.body as string);
    if (msg.method === 'initialize') {
      return new Response(
        `event: message\ndata: ${JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { protocolVersion: '2025-06-18', capabilities: {}, serverInfo: { name: 'homelab-data', version: '1' } } })}\n\n`,
        { status: 200, headers: { 'Content-Type': 'text/event-stream', 'mcp-session-id': sessionId } },
      );
    }
    if (msg.method === 'notifications/initialized') {
      return new Response(null, { status: 202 });
    }
    if (msg.method === 'tools/call') {
      const result = typeof toolResult === 'function' ? toolResult(msg.params.name) : toolResult;
      return sse({ jsonrpc: '2.0', id: msg.id, result });
    }
    throw new Error(`unexpected method ${msg.method}`);
  });
}

const bodies = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls.map(([, init]) => JSON.parse((init as RequestInit).body as string));

describe('MCPClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = realFetch;
  });

  describe('callTool', () => {
    it('initializes a session, then calls the tool with its arguments', async () => {
      const fetchMock = fakeServer({ structuredContent: { data: 'test' }, content: [] });
      globalThis.fetch = fetchMock;

      const client = new MCPClient(URL_, 'tok');
      const result = await client.callTool('my_tool', { foo: 'bar' });

      expect(result).toEqual({ data: 'test' });
      const sent = bodies(fetchMock);
      expect(sent.map(m => m.method)).toEqual(['initialize', 'notifications/initialized', 'tools/call']);
      expect(sent[2].params).toEqual({ name: 'my_tool', arguments: { foo: 'bar' } });
      expect(fetchMock.mock.calls.every(([url]) => url === URL_)).toBe(true);
    });

    it('sends bearer auth, Accept for JSON and SSE, and the session id after initialize', async () => {
      const fetchMock = fakeServer({ structuredContent: {} }, { sessionId: 'abc' });
      globalThis.fetch = fetchMock;

      await new MCPClient(URL_, 'secret-token').callTool('t');

      const headers = fetchMock.mock.calls.map(([, init]) => (init as RequestInit).headers as Record<string, string>);
      expect(headers.every(h => h['Authorization'] === 'Bearer secret-token')).toBe(true);
      expect(headers[0]['Accept']).toBe('application/json, text/event-stream');
      expect(headers[0]['Mcp-Session-Id']).toBeUndefined();
      expect(headers[2]['Mcp-Session-Id']).toBe('abc');
      expect(headers[2]['Mcp-Protocol-Version']).toBe('2025-06-18');
    });

    it('omits auth header when no token configured', async () => {
      const fetchMock = fakeServer({ structuredContent: {} });
      globalThis.fetch = fetchMock;

      await new MCPClient(URL_, '').callTool('t');

      const [, init] = fetchMock.mock.calls[0];
      expect(((init as RequestInit).headers as Record<string, string>)['Authorization']).toBeUndefined();
    });

    it('reuses one session across calls, including concurrent ones', async () => {
      const fetchMock = fakeServer({ structuredContent: {} });
      globalThis.fetch = fetchMock;

      const client = new MCPClient(URL_, 'tok');
      await Promise.all([client.callTool('a'), client.callTool('b')]);
      await client.callTool('c');

      expect(bodies(fetchMock).filter(m => m.method === 'initialize')).toHaveLength(1);
      expect(bodies(fetchMock).filter(m => m.method === 'tools/call')).toHaveLength(3);
    });

    it('re-initializes once when the server forgets the session (404)', async () => {
      const server = fakeServer({ structuredContent: { ok: true } });
      let expired = false;
      const fetchMock = vi.fn(async (url: unknown, init?: RequestInit) => {
        const msg = JSON.parse(init!.body as string);
        if (msg.method === 'tools/call' && !expired) {
          expired = true;
          return new Response('session not found', { status: 404 });
        }
        return server(url, init);
      });
      globalThis.fetch = fetchMock;

      const client = new MCPClient(URL_, 'tok');
      await expect(client.callTool('t')).resolves.toEqual({ ok: true });
      expect(bodies(fetchMock).filter(m => m.method === 'initialize')).toHaveLength(2);
    });

    it('recovers every concurrent call after a server restart with one handshake', async () => {
      // Sessions live in the server; a restart forgets them all and the old id gets 404.
      let generation = 1;
      const live = new Set<string>();
      const tick = () => new Promise(r => setTimeout(r, 2));
      const fetchMock = vi.fn(async (_url: unknown, init?: RequestInit) => {
        await tick();
        const msg = JSON.parse(init!.body as string);
        const sent = (init!.headers as Record<string, string>)['Mcp-Session-Id'];
        if (msg.method === 'initialize') {
          const id = `gen-${generation}`;
          live.add(id);
          return new Response(
            `data: ${JSON.stringify({ jsonrpc: '2.0', id: msg.id, result: { protocolVersion: '2025-06-18' } })}\n\n`,
            { status: 200, headers: { 'Content-Type': 'text/event-stream', 'mcp-session-id': id } },
          );
        }
        if (!sent || !live.has(sent)) return new Response('Session not found', { status: 404 });
        if (msg.method === 'notifications/initialized') return new Response(null, { status: 202 });
        return sse({ jsonrpc: '2.0', id: msg.id, result: { structuredContent: { session: sent } } });
      });
      globalThis.fetch = fetchMock;

      const client = new MCPClient(URL_, 'tok');
      await expect(client.callTool('t')).resolves.toEqual({ session: 'gen-1' });

      generation = 2;
      live.clear();
      const after = await Promise.all([1, 2, 3].map(() => client.callTool('list_containers')));

      expect(after).toEqual([{ session: 'gen-2' }, { session: 'gen-2' }, { session: 'gen-2' }]);
      expect(bodies(fetchMock).filter(m => m.method === 'initialize')).toHaveLength(2);
    });

    it('cancels the body of an error response', async () => {
      const cancelled = vi.fn();
      const body = new ReadableStream({ cancel: cancelled });
      globalThis.fetch = vi.fn().mockResolvedValue(new Response(body, { status: 500, statusText: 'Internal Server Error' }));

      await expect(new MCPClient(URL_, 't').callTool('t')).rejects.toThrow(/HTTP 500/);
      expect(cancelled).toHaveBeenCalled();
    });

    it('accepts a plain JSON response instead of SSE', async () => {
      globalThis.fetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
        const msg = JSON.parse(init!.body as string);
        if (msg.method === 'notifications/initialized') return new Response(null, { status: 202 });
        const result = msg.method === 'initialize' ? { protocolVersion: '2025-06-18' } : { structuredContent: { via: 'json' } };
        return json({ jsonrpc: '2.0', id: msg.id, result }, { 'mcp-session-id': 's' });
      });

      await expect(new MCPClient(URL_, 'tok').callTool('t')).resolves.toEqual({ via: 'json' });
    });

    it('falls back to content array when structuredContent is absent and no type field', async () => {
      globalThis.fetch = fakeServer({ content: [{ text: 'hello' }] });
      await expect(new MCPClient(URL_, 't').callTool('t')).resolves.toEqual([{ text: 'hello' }]);
    });

    it('JSON-parses a single text content item when structuredContent is absent', async () => {
      globalThis.fetch = fakeServer({ content: [{ type: 'text', text: '{"state":"idle"}' }], structuredContent: null });
      await expect(new MCPClient(URL_, 't').callTool('t')).resolves.toEqual({ state: 'idle' });
    });

    it('returns raw string when single text item is not valid JSON', async () => {
      globalThis.fetch = fakeServer({ content: [{ type: 'text', text: 'not json' }] });
      await expect(new MCPClient(URL_, 't').callTool('t')).resolves.toBe('not json');
    });

    it('throws when the tool result has isError', async () => {
      globalThis.fetch = fakeServer({ isError: true, content: [{ type: 'text', text: 'something went wrong' }] });
      await expect(new MCPClient(URL_, 't').callTool('t')).rejects.toThrow(/Tool error.*something went wrong/);
    });

    it('throws on a JSON-RPC error', async () => {
      const server = fakeServer({});
      globalThis.fetch = vi.fn(async (url: unknown, init?: RequestInit) => {
        const msg = JSON.parse(init!.body as string);
        if (msg.method === 'tools/call') {
          return sse({ jsonrpc: '2.0', id: msg.id, error: { code: -32602, message: 'Unknown tool: nope' } });
        }
        return server(url, init);
      });
      await expect(new MCPClient(URL_, 't').callTool('nope')).rejects.toThrow(/MCP tool call failed \(nope\).*Unknown tool/);
    });

    it('throws on HTTP error and retries the handshake next time', async () => {
      const fetchMock = vi.fn().mockResolvedValueOnce(new Response('no', { status: 401, statusText: 'Unauthorized' }));
      globalThis.fetch = fetchMock;

      const client = new MCPClient(URL_, 'bad');
      await expect(client.callTool('t')).rejects.toThrow(/HTTP 401/);

      fetchMock.mockImplementation(fakeServer({ structuredContent: { ok: 1 } }));
      await expect(client.callTool('t')).resolves.toEqual({ ok: 1 });
    });

    it('throws on network failure', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));
      await expect(new MCPClient(URL_, 't').callTool('t')).rejects.toThrow(/Connection refused/);
    });

    it('wraps non-Error throws', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue('string error');
      await expect(new MCPClient(URL_, 't').callTool('t')).rejects.toThrow(/Unknown error/);
    });
  });

  // Real fetch against a local server that sends SSE headers at once and the
  // tool result after `delayMs`, the way FastMCP does for a slow tool.
  describe('timeouts', () => {
    let server: Server;

    async function slowServer(delayMs: number): Promise<string> {
      server = createServer((req, res) => {
        let raw = '';
        req.on('data', chunk => { raw += chunk; });
        req.on('end', () => {
          const msg = JSON.parse(raw);
          if (msg.method === 'notifications/initialized') {
            res.writeHead(202).end();
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/event-stream', 'mcp-session-id': 's1' });
          res.flushHeaders();
          const result = msg.method === 'initialize' ? { protocolVersion: '2025-06-18' } : { structuredContent: { done: true } };
          const wait = msg.method === 'tools/call' ? delayMs : 0;
          const timer = setTimeout(() => res.end(`data: ${JSON.stringify({ jsonrpc: '2.0', id: msg.id, result })}\n\n`), wait);
          res.on('close', () => clearTimeout(timer));
        });
      });
      await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
      return `http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp/`;
    }

    afterEach(async () => {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    });

    it('times out while the tool is still running, after the headers arrived', async () => {
      const url = await slowServer(5000);
      const started = Date.now();
      await expect(new MCPClient(url, 't').callTool('slow', {}, { timeoutMs: 200 }))
        .rejects.toThrow(/MCP tool call failed \(slow\): tools\/call timed out after 200 ms/);
      expect(Date.now() - started).toBeLessThan(2000);
    });

    it('waits for a slow tool within a longer budget', async () => {
      const url = await slowServer(300);
      await expect(new MCPClient(url, 't').callTool('slow', {}, { timeoutMs: 2000 })).resolves.toEqual({ done: true });
    });
  });

  describe('parseSseMessages', () => {
    it('joins multi-line data and skips non-JSON events', () => {
      const body = 'event: ping\ndata: keepalive\n\nevent: message\ndata: {"jsonrpc":"2.0",\ndata: "id":3}\n\n';
      expect(parseSseMessages(body)).toEqual([{ jsonrpc: '2.0', id: 3 }]);
    });
  });
});
