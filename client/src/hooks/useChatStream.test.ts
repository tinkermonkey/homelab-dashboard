import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChatStream } from './useChatStream.js';
import type { ThreadItem, ThreadMessage } from '@homelab/shared';

function createMockReadableStream(chunks: string[], cancelFn?: ReturnType<typeof vi.fn>) {
  let chunkIndex = 0;
  const cancel = cancelFn || vi.fn().mockResolvedValue(undefined);

  return {
    getReader: vi.fn(() => ({
      read: vi.fn(async () => {
        if (chunkIndex >= chunks.length) {
          return { done: true, value: undefined };
        }
        const chunk = chunks[chunkIndex];
        chunkIndex++;
        const encoder = new TextEncoder();
        return {
          done: false,
          value: encoder.encode(chunk),
        };
      }),
      cancel,
    })),
    _cancel: cancel,
  };
}

describe('useChatStream hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('initializes with baseThread and empty draft', () => {
      const baseThread: ThreadItem[] = [
        {
          kind: 'msg',
          who: 'user',
          name: 'you',
          when: '10:30',
          body: [{ p: 'hello' }],
        },
      ];

      const { result } = renderHook(() =>
        useChatStream({ baseThread, activeBot: 'bot-1' })
      );

      expect(result.current.thread).toEqual(baseThread);
      expect(result.current.draft).toBe('');
    });

    it('initializes with empty thread when no baseThread provided', () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      expect(result.current.thread).toEqual([]);
    });
  });

  describe('draft management', () => {
    it('updates draft text via setDraft', () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      act(() => {
        result.current.setDraft('hello world');
      });

      expect(result.current.draft).toBe('hello world');
    });
  });

  describe('sending messages', () => {
    it('ignores empty or whitespace-only messages', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      const fetchMock = vi.fn();
      global.fetch = fetchMock;

      await act(async () => {
        await result.current.send('');
        await result.current.send('   ');
        await result.current.send();
      });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.current.thread).toEqual([]);
    });

    it('adds user message to thread before sending', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: null,
      });

      await act(async () => {
        await result.current.send('hello bot');
      });

      expect(result.current.thread.length).toBeGreaterThan(0);
      const userMsg = result.current.thread.find(m => m.kind === 'msg' && m.who === 'user') as ThreadMessage;
      expect(userMsg).toBeDefined();
      expect(userMsg.body[0].p).toBe('hello bot');
    });

    it('stores raw user message without escaping (sanitization at render time)', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: null,
      });

      await act(async () => {
        await result.current.send('<script>alert("xss")</script>');
      });

      const userMsg = result.current.thread.find(m => m.kind === 'msg' && m.who === 'user') as ThreadMessage;
      expect(userMsg.body[0].p).toBe('<script>alert("xss")</script>');
    });

    it('sends request to correct endpoint', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: null,
      });
      global.fetch = fetchMock;

      await act(async () => {
        await result.current.send('test');
      });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/chat/bot-1',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ message: 'test' }),
        })
      );
    });

    it('sends request with Content-Type header', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: null,
      });
      global.fetch = fetchMock;

      await act(async () => {
        await result.current.send('test');
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });
  });

  describe('error handling', () => {
    it('sends request even when fetch fails', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = fetchMock;

      await act(async () => {
        await result.current.send('test');
      });

      expect(fetchMock).toHaveBeenCalled();
      const errorMsg = result.current.thread.find(m => m.kind === 'msg' && m.who === 'bot-1') as ThreadMessage;
      expect(errorMsg).toBeDefined();
      expect(errorMsg.body[0].p).toContain('Connection error:');
    });

    it('includes user message even when response fails', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await act(async () => {
        await result.current.send('test');
      });

      const userMsg = result.current.thread.find(m => m.kind === 'msg' && m.who === 'user') as ThreadMessage;
      expect(userMsg).toBeDefined();
      expect(userMsg.body[0].p).toBe('test');
    });
  });

  describe('multi-bot support', () => {
    it('maintains separate message threads per bot', async () => {
      const { result, rerender } = renderHook(
        ({ botId }: { botId: string }) =>
          useChatStream({ baseThread: [], activeBot: botId }),
        {
          initialProps: { botId: 'bot-1' },
        }
      );

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: null,
      });

      await act(async () => {
        await result.current.send('message for bot 1');
      });

      const bot1MsgCount = result.current.thread.length;

      rerender({ botId: 'bot-2' });

      await act(async () => {
        await result.current.send('message for bot 2');
      });

      const bot2MsgCount = result.current.thread.length;

      expect(bot1MsgCount).toBeGreaterThan(0);
      expect(bot2MsgCount).toBeGreaterThan(0);
    });
  });

  describe('timestamp formatting', () => {
    it('formats current time with hours and minutes', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: null,
      });

      const mockDate = new Date('2025-06-15T14:30:00');
      vi.setSystemTime(mockDate);

      await act(async () => {
        await result.current.send('test');
      });

      const userMsg = result.current.thread.find(m => m.kind === 'msg' && m.who === 'user') as ThreadMessage;
      expect(userMsg.when).toMatch(/^\d{2}:\d{2}$/);
    });

    it('pads hour and minute with zeros', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: null,
      });

      const mockDate = new Date('2025-06-15T09:05:00');
      vi.setSystemTime(mockDate);

      await act(async () => {
        await result.current.send('test');
      });

      const userMsg = result.current.thread.find(m => m.kind === 'msg' && m.who === 'user') as ThreadMessage;
      expect(userMsg.when).toBe('09:05');
    });
  });

  describe('SSE parsing basics', () => {
    it('sends request with AbortController signal', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      let capturedOptions: RequestInit | undefined;
      global.fetch = vi.fn().mockImplementation((_url, opts) => {
        capturedOptions = opts;
        return Promise.resolve({
          ok: true,
          status: 200,
          body: null,
        });
      });

      await act(async () => {
        await result.current.send('test');
      });

      expect(capturedOptions?.signal).toBeDefined();
      expect(capturedOptions?.signal instanceof AbortSignal).toBe(true);
    });

    it('includes message in request body as JSON', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      let capturedBody: string = '';
      global.fetch = vi.fn().mockImplementation((_url, opts) => {
        capturedBody = opts.body;
        return Promise.resolve({
          ok: true,
          status: 200,
          body: null,
        });
      });

      await act(async () => {
        await result.current.send('test message');
      });

      expect(JSON.parse(capturedBody)).toEqual({ message: 'test message' });
    });
  });

  describe('HTTP error responses', () => {
    it('handles non-ok HTTP status with JSON error detail', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: vi.fn().mockResolvedValue(JSON.stringify({ error: 'Database connection failed' })),
      });

      await act(async () => {
        await result.current.send('test');
      });

      const errorMsg = result.current.thread.find(
        m => m.kind === 'msg' && m.who === 'bot-1'
      ) as ThreadMessage;
      expect(errorMsg).toBeDefined();
      expect(errorMsg.body[0].p).toContain('Database connection failed');
    });

    it('handles non-ok HTTP status with plain text error', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: vi.fn().mockResolvedValue('Service temporarily unavailable'),
      });

      await act(async () => {
        await result.current.send('test');
      });

      const errorMsg = result.current.thread.find(
        m => m.kind === 'msg' && m.who === 'bot-1'
      ) as ThreadMessage;
      expect(errorMsg).toBeDefined();
      expect(errorMsg.body[0].p).toContain('Service temporarily unavailable');
    });

    it('falls back to status text when error body is not parseable', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: vi.fn().mockResolvedValue('<html>Invalid</html>'),
      });

      await act(async () => {
        await result.current.send('test');
      });

      const errorMsg = result.current.thread.find(
        m => m.kind === 'msg' && m.who === 'bot-1'
      ) as ThreadMessage;
      expect(errorMsg).toBeDefined();
      expect(errorMsg.body[0].p).toContain('Bad Request');
    });

    it('falls back to status code when no error detail available', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: '',
        text: vi.fn().mockResolvedValue(''),
      });

      await act(async () => {
        await result.current.send('test');
      });

      const errorMsg = result.current.thread.find(
        m => m.kind === 'msg' && m.who === 'bot-1'
      ) as ThreadMessage;
      expect(errorMsg).toBeDefined();
      expect(errorMsg.body[0].p).toContain('HTTP 429');
    });

    it('extracts error message from JSON response', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: vi.fn().mockResolvedValue(JSON.stringify({ message: 'Invalid API key' })),
      });

      await act(async () => {
        await result.current.send('test');
      });

      const errorMsg = result.current.thread.find(
        m => m.kind === 'msg' && m.who === 'bot-1'
      ) as ThreadMessage;
      expect(errorMsg).toBeDefined();
      expect(errorMsg.body[0].p).toContain('Invalid API key');
    });

    it('ignores long error responses (assumes HTML)', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      const longHtml = '<html>' + 'x'.repeat(500) + '</html>';
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: vi.fn().mockResolvedValue(longHtml),
      });

      await act(async () => {
        await result.current.send('test');
      });

      const errorMsg = result.current.thread.find(
        m => m.kind === 'msg' && m.who === 'bot-1'
      ) as ThreadMessage;
      expect(errorMsg).toBeDefined();
      expect(errorMsg.body[0].p).toContain('Internal Server Error');
    });
  });

  describe('SSE stream parsing - reader loop', () => {
    it('parses single complete SSE message', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      const mockBody = createMockReadableStream([
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      ]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: mockBody,
      });

      await act(async () => {
        await result.current.send('test');
      });

      const botMsgs = result.current.thread.filter(m => m.kind === 'msg' && m.who === 'bot-1');
      expect(botMsgs.length).toBeGreaterThan(0);
      const lastMsg = botMsgs[botMsgs.length - 1] as ThreadMessage;
      expect(lastMsg.body[0].p).toContain('Hello');
    });

    it('accumulates multiple SSE chunks into single message', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      const mockBody = createMockReadableStream([
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      ]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: mockBody,
      });

      await act(async () => {
        await result.current.send('test');
      });

      const botMsgs = result.current.thread.filter(m => m.kind === 'msg' && m.who === 'bot-1');
      const lastMsg = botMsgs[botMsgs.length - 1] as ThreadMessage;
      expect(lastMsg.body[0].p).toBe('Hello world');
    });

    it('ignores [DONE] sentinel', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      const mockBody = createMockReadableStream([
        'data: {"choices":[{"delta":{"content":"Start"}}]}\n\n',
        'data: [DONE]\n\n',
      ]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: mockBody,
      });

      await act(async () => {
        await result.current.send('test');
      });

      const botMsgs = result.current.thread.filter(m => m.kind === 'msg' && m.who === 'bot-1');
      const lastMsg = botMsgs[botMsgs.length - 1] as ThreadMessage;
      expect(lastMsg.body[0].p).toBe('Start');
    });

    it('handles partial lines that span multiple chunks', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      const mockBody = createMockReadableStream([
        'data: {"choices":[{"delta":{"conte',
        'nt":"Hello"}}]}\n\n',
      ]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: mockBody,
      });

      await act(async () => {
        await result.current.send('test');
      });

      const botMsgs = result.current.thread.filter(m => m.kind === 'msg' && m.who === 'bot-1');
      const lastMsg = botMsgs[botMsgs.length - 1] as ThreadMessage;
      expect(lastMsg.body[0].p).toContain('Hello');
    });

    it('creates new message when no previous message exists', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      const mockBody = createMockReadableStream([
        'data: {"choices":[{"delta":{"content":"First chunk"}}]}\n\n',
      ]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: mockBody,
      });

      await act(async () => {
        await result.current.send('test');
      });

      const botMsgs = result.current.thread.filter(m => m.kind === 'msg' && m.who === 'bot-1');
      expect(botMsgs.length).toBe(1);
      const msg = botMsgs[0] as ThreadMessage;
      expect(msg.body[0].p).toBe('First chunk');
    });

    it('appends to existing message when last message in stream is from bot', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      const mockBody = createMockReadableStream([
        'data: {"choices":[{"delta":{"content":"hello"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      ]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: mockBody,
      });

      await act(async () => {
        await result.current.send('test');
      });

      const botMsgs = result.current.thread.filter(m => m.kind === 'msg' && m.who === 'bot-1');
      const lastMsg = botMsgs[botMsgs.length - 1] as ThreadMessage;
      expect(lastMsg.body[0].p).toBe('hello world');
    });

    it('creates new message when last message is from user', async () => {
      const baseThread: ThreadItem[] = [
        {
          kind: 'msg',
          who: 'user',
          name: 'you',
          when: '10:00',
          body: [{ p: 'user message' }],
        },
      ];

      const { result } = renderHook(() =>
        useChatStream({ baseThread, activeBot: 'bot-1' })
      );

      const mockBody = createMockReadableStream([
        'data: {"choices":[{"delta":{"content":"bot response"}}]}\n\n',
      ]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: mockBody,
      });

      await act(async () => {
        await result.current.send('test');
      });

      const botMsgs = result.current.thread.filter(m => m.kind === 'msg' && m.who === 'bot-1');
      expect(botMsgs.length).toBe(1);
      const msg = botMsgs[0] as ThreadMessage;
      expect(msg.body[0].p).toBe('bot response');
    });

    it('does not process lines without data: prefix', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      const mockBody = createMockReadableStream([
        'event: message\n',
        'data: {"choices":[{"delta":{"content":"valid"}}]}\n\n',
      ]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: mockBody,
      });

      await act(async () => {
        await result.current.send('test');
      });

      const botMsgs = result.current.thread.filter(m => m.kind === 'msg' && m.who === 'bot-1');
      const lastMsg = botMsgs[botMsgs.length - 1] as ThreadMessage;
      expect(lastMsg.body[0].p).toBe('valid');
    });
  });

  describe('SSE error handling - in-stream errors', () => {
    it('handles error objects in SSE data', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      const mockBody = createMockReadableStream([
        'data: {"error":"API rate limit exceeded"}\n\n',
      ]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: mockBody,
      });

      await act(async () => {
        await result.current.send('test');
      });

      const errorMsg = result.current.thread.find(
        m => m.kind === 'msg' && m.who === 'bot-1' && m.body[0].p.includes('Error')
      ) as ThreadMessage;
      expect(errorMsg).toBeDefined();
      expect(errorMsg.body[0].p).toContain('API rate limit exceeded');
    });

    it('shows parse error only once per stream', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      const mockBody = createMockReadableStream([
        'data: {invalid json\n\n',
        'data: also invalid\n\n',
        'data: {"choices":[{"delta":{"content":"valid"}}]}\n\n',
      ]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: mockBody,
      });

      await act(async () => {
        await result.current.send('test');
      });

      const parseErrorMsgs = result.current.thread.filter(
        m => m.kind === 'msg' && m.who === 'bot-1' && m.body[0].p.includes('Malformed')
      );
      expect(parseErrorMsgs.length).toBe(1);
    });

    it('continues processing after malformed JSON', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      const mockBody = createMockReadableStream([
        'data: {invalid json\n\n',
        'data: {"choices":[{"delta":{"content":"recovered"}}]}\n\n',
      ]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: mockBody,
      });

      await act(async () => {
        await result.current.send('test');
      });

      const msgs = result.current.thread.filter(m => m.kind === 'msg' && m.who === 'bot-1');
      const hasRecoveredMsg = msgs.some(m => m.body[0].p.includes('recovered'));
      expect(hasRecoveredMsg).toBe(true);
    });

    it('handles empty data payload', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      const mockBody = createMockReadableStream([
        'data: \n\n',
        'data: {"choices":[{"delta":{"content":"message"}}]}\n\n',
      ]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: mockBody,
      });

      await act(async () => {
        await result.current.send('test');
      });

      const botMsgs = result.current.thread.filter(m => m.kind === 'msg' && m.who === 'bot-1');
      const lastMsg = botMsgs[botMsgs.length - 1] as ThreadMessage;
      expect(lastMsg.body[0].p).toContain('message');
    });

    it('ignores delta objects without content field', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      const mockBody = createMockReadableStream([
        'data: {"choices":[{"delta":{"role":"assistant"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"actual content"}}]}\n\n',
      ]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: mockBody,
      });

      await act(async () => {
        await result.current.send('test');
      });

      const botMsgs = result.current.thread.filter(m => m.kind === 'msg' && m.who === 'bot-1');
      expect(botMsgs.length).toBe(1);
      const msg = botMsgs[0] as ThreadMessage;
      expect(msg.body[0].p).toBe('actual content');
    });
  });

  describe('AbortError handling', () => {
    it('does not show error message when stream is aborted', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      const abortError = new Error('Stream aborted');
      abortError.name = 'AbortError';

      global.fetch = vi.fn().mockRejectedValue(abortError);

      await act(async () => {
        await result.current.send('test');
      });

      const errorMsgs = result.current.thread.filter(
        m => m.kind === 'msg' && m.who === 'bot-1' && m.body[0].p.includes('Connection error')
      );
      expect(errorMsgs.length).toBe(0);
    });

    it('shows error message for non-abort errors', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      const error = new Error('Network timeout');
      global.fetch = vi.fn().mockRejectedValue(error);

      await act(async () => {
        await result.current.send('test');
      });

      const errorMsg = result.current.thread.find(
        m => m.kind === 'msg' && m.who === 'bot-1' && m.body[0].p.includes('Connection error')
      ) as ThreadMessage;
      expect(errorMsg).toBeDefined();
      expect(errorMsg.body[0].p).toContain('Network timeout');
    });
  });

  describe('stream lifecycle - reader and abort cleanup', () => {
    it('clears reader reference after stream completes', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      const mockBody = createMockReadableStream([
        'data: {"choices":[{"delta":{"content":"test"}}]}\n\n',
      ]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: mockBody,
      });

      await act(async () => {
        await result.current.send('test');
      });

      expect(mockBody._cancel).toHaveBeenCalled();
    });

    it('clears abort controller after stream completes', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      const mockBody = createMockReadableStream([
        'data: {"choices":[{"delta":{"content":"test"}}]}\n\n',
      ]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: mockBody,
      });

      await act(async () => {
        await result.current.send('test');
      });

      expect(mockBody._cancel).toHaveBeenCalled();
    });
  });

  describe('text decoder stream=true behavior', () => {
    it('handles multi-byte UTF-8 characters split across chunks', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      const encoder = new TextEncoder();

      // Construct raw bytes with emoji split across chunks
      const firstPart = 'data: {"choices":[{"delta":{"content":"Hello ';
      const firstPartBytes = encoder.encode(firstPart);
      const emojiBytes = encoder.encode('🌍'); // 4 bytes: F0 9F 8C 8D
      const lastPart = '"}}]}\n\n';
      const lastPartBytes = encoder.encode(lastPart);

      // Split emoji in half: first chunk gets first 2 bytes of emoji
      const chunk1 = new Uint8Array([...firstPartBytes, ...emojiBytes.slice(0, 2)]);
      // Second chunk gets remaining 2 bytes of emoji plus the rest
      const chunk2 = new Uint8Array([...emojiBytes.slice(2), ...lastPartBytes]);

      // Custom mock that returns pre-split byte arrays (not re-encoded)
      let chunkIndex = 0;
      const chunks = [chunk1, chunk2];
      const mockBody = {
        getReader: vi.fn(() => ({
          read: vi.fn(async () => {
            if (chunkIndex >= chunks.length) {
              return { done: true, value: undefined };
            }
            return {
              done: false,
              value: chunks[chunkIndex++],
            };
          }),
          cancel: vi.fn().mockResolvedValue(undefined),
        })),
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: mockBody,
      });

      await act(async () => {
        await result.current.send('test');
      });

      const botMsgs = result.current.thread.filter(m => m.kind === 'msg' && m.who === 'bot-1');
      const lastMsg = botMsgs[botMsgs.length - 1] as ThreadMessage;
      expect(lastMsg.body[0].p).toContain('Hello 🌍');
    });
  });
});
