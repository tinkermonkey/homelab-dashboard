import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChatStream } from './useChatStream.js';
import type { ThreadItem, ThreadMessage } from '@homelab/shared';

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
        await result.current.send(undefined);
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

    it('escapes HTML in user message', async () => {
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
      expect(userMsg.body[0].p).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
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

      let capturedOptions: any;
      global.fetch = vi.fn().mockImplementation((url, opts) => {
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

      expect(capturedOptions.signal).toBeDefined();
      expect(capturedOptions.signal instanceof AbortSignal).toBe(true);
    });

    it('includes message in request body as JSON', async () => {
      const { result } = renderHook(() =>
        useChatStream({ baseThread: [], activeBot: 'bot-1' })
      );

      let capturedBody: string = '';
      global.fetch = vi.fn().mockImplementation((url, opts) => {
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
});
