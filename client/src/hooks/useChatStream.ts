import { useState, useRef, useCallback, useEffect } from 'react';
import type { ThreadItem, ThreadMessage } from '@homelab/shared';

interface UseChatStreamOptions {
  baseThread: ThreadItem[];
  activeBot: string;
}

interface UseChatStreamReturn {
  thread: ThreadItem[];
  send: (text?: string) => Promise<void>;
  draft: string;
  setDraft: (draft: string) => void;
}

export const useChatStream = ({ baseThread, activeBot }: UseChatStreamOptions): UseChatStreamReturn => {
  const [draft, setDraft] = useState('');
  const [extraMsgs, setExtraMsgs] = useState<Record<string, ThreadItem[]>>({});
  const streamAbortRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  const thread = [...baseThread, ...(extraMsgs[activeBot] || [])];

  // Cancel any in-flight stream when bot changes
  useEffect(() => {
    return () => {
      if (streamAbortRef.current) {
        streamAbortRef.current.abort();
        streamAbortRef.current = null;
      }
      if (readerRef.current) {
        readerRef.current.cancel().catch(() => {
          // Ignore errors from cancel
        });
        readerRef.current = null;
      }
    };
  }, [activeBot]);

  const send = useCallback(
    async (text?: string) => {
      const t = text?.trim() || '';
      if (!t) return;

      const now = new Date();
      const when = now
        .getHours()
        .toString()
        .padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

      const userMsg: ThreadMessage = {
        kind: 'msg',
        who: 'user',
        name: 'you',
        when,
        body: [{ p: t }],
      };

      // Add user message to thread
      setExtraMsgs(prev => ({
        ...prev,
        [activeBot]: [...(prev[activeBot] || []), userMsg],
      }));
      setDraft('');

      // Stream bot response via SSE
      try {
        streamAbortRef.current = new AbortController();
        const response = await fetch(`/api/chat/${activeBot}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: t }),
          signal: streamAbortRef.current.signal,
        });

        if (!response.ok) {
          let errorDetail = response.statusText || 'Unknown error';
          try {
            const errorBody = await response.text();
            const parsed = JSON.parse(errorBody);
            errorDetail = parsed.error || parsed.message || errorDetail;
          } catch {
            // If we can't parse the body, use statusText (may be empty on HTTP/2)
            if (!errorDetail) {
              errorDetail = `HTTP ${response.status}`;
            }
          }
          const errorMsg: ThreadMessage = {
            kind: 'msg',
            who: activeBot,
            when,
            body: [{ p: `Error: ${errorDetail}` }],
          };
          setExtraMsgs(prev => ({
            ...prev,
            [activeBot]: [...(prev[activeBot] || []), errorMsg],
          }));
          return;
        }

        let accumulated = '';
        const reader = response.body?.getReader();
        if (!reader) {
          const errorMsg: ThreadMessage = {
            kind: 'msg',
            who: activeBot,
            when,
            body: [{ p: 'Error: No response body from service' }],
          };
          setExtraMsgs(prev => ({
            ...prev,
            [activeBot]: [...(prev[activeBot] || []), errorMsg],
          }));
          return;
        }
        readerRef.current = reader;

        const decoder = new TextDecoder();
        let parseErrorShown = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;

          // Parse SSE format: "data: {json}\n\n"
          const lines = accumulated.split('\n');
          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i];
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6);
              if (jsonStr === '[DONE]') {
                continue;
              }
              let parsed;
              try {
                parsed = JSON.parse(jsonStr);
              } catch {
                // Only show parse error once per stream to avoid flooding the UI
                if (!parseErrorShown) {
                  parseErrorShown = true;
                  const parseMsg: ThreadMessage = {
                    kind: 'msg',
                    who: activeBot,
                    when,
                    body: [{ p: 'Error: Malformed response from service' }],
                  };
                  setExtraMsgs(prev => ({
                    ...prev,
                    [activeBot]: [...(prev[activeBot] || []), parseMsg],
                  }));
                }
                continue; // Skip this line since we can't parse it
              }
              if (parsed.error) {
                const errorMsg: ThreadMessage = {
                  kind: 'msg',
                  who: activeBot,
                  when,
                  body: [{ p: `Error: ${parsed.error}` }],
                };
                setExtraMsgs(prev => ({
                  ...prev,
                  [activeBot]: [...(prev[activeBot] || []), errorMsg],
                }));
              } else if (parsed.choices?.[0]?.delta?.content) {
                // SSE streaming chunk received
                const content = parsed.choices[0].delta.content;
                setExtraMsgs(prev => {
                  const botMsgs = prev[activeBot] || [];
                  const lastMsg = botMsgs[botMsgs.length - 1];

                  if (lastMsg && lastMsg.kind === 'msg' && lastMsg.who === activeBot && lastMsg.body[0]) {
                    // Append to existing bot message
                    return {
                      ...prev,
                      [activeBot]: [
                        ...botMsgs.slice(0, -1),
                        {
                          ...lastMsg,
                          body: [{ p: lastMsg.body[0].p + content }],
                        },
                      ],
                    };
                  } else {
                    // Create new bot message with first chunk
                    const botMsg: ThreadMessage = {
                      kind: 'msg',
                      who: activeBot,
                      when,
                      body: [{ p: content }],
                    };
                    return {
                      ...prev,
                      [activeBot]: [...botMsgs, botMsg],
                    };
                  }
                });
              }
            }
          }

          // Keep the last incomplete line in accumulated
          accumulated = lines[lines.length - 1];
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Stream was cancelled due to bot switch, don't add error message
          return;
        }

        const errorMsg: ThreadMessage = {
          kind: 'msg',
          who: activeBot,
          when,
          body: [{ p: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}` }],
        };
        setExtraMsgs(prev => ({
          ...prev,
          [activeBot]: [...(prev[activeBot] || []), errorMsg],
        }));
      } finally {
        streamAbortRef.current = null;
        if (readerRef.current) {
          readerRef.current.cancel().catch(() => {
            // Ignore errors from cancel
          });
          readerRef.current = null;
        }
      }
    },
    [activeBot],
  );

  return {
    thread,
    send,
    draft,
    setDraft,
  };
};
