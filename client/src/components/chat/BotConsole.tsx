import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import type { ThreadItem, ThreadMessage, ThreadDetailMessage } from '@homelab/shared';
import {
  Icon,
  ChatContainer,
  ChatMessage,
  ChatComposer,
  ChatDivider,
  type BotTab,
} from '@tinkermonkey/heimdall-ui';
import { useQueryClient } from '@tanstack/react-query';
import { useThreads, useThread } from '../../hooks/useAPI';
import { usePersistedState } from '../../utils/localStorage';
import { useChatStream } from '../../hooks/useChatStream';

interface BotConsoleProps {
  onClose?: () => void;
}

function avatarFor(label: string): string {
  const parts = label.split(/[-_\s]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return label.slice(0, 2).toUpperCase();
}

// Map persisted phone-home transcript messages onto the dashboard thread shape.
function messagesToThread(
  messages: ThreadDetailMessage[] | undefined,
  agentLabel: string,
): ThreadItem[] {
  return (messages ?? []).map((m): ThreadMessage => ({
    kind: 'msg',
    who: m.role === 'user' ? 'user' : 'assistant',
    name: m.role === 'user' ? 'you' : agentLabel,
    when: '',
    body: [{ p: m.content ?? '' }],
  }));
}

/**
 * Thread-centric bot console. Tabs are phone-home conversation threads; the
 * control plane delegates to agent nodes, and the working agent is shown
 * read-only via each thread's `agent` field. Sending a message streams a reply
 * from POST /v1/chat/completions (proxied by /api/chat/:threadId).
 */
export const BotConsole: React.FC<BotConsoleProps> = ({ onClose }) => {
  const queryClient = useQueryClient();
  const { data: threadsData } = useThreads();
  const threads = useMemo(() => threadsData?.threads ?? [], [threadsData]);

  const [activeThreadId, setActiveThreadId] = usePersistedState('activeThread', '');

  // Fall back to the most-recently-active thread when nothing valid is selected.
  const effectiveId = useMemo(() => {
    if (activeThreadId && threads.some(t => t.id === activeThreadId)) return activeThreadId;
    return threads[0]?.id ?? '';
  }, [activeThreadId, threads]);

  const activeThread = threads.find(t => t.id === effectiveId);
  const agentLabel = activeThread?.agent || 'control plane';

  const { data: detail } = useThread(effectiveId || null);
  const baseThread = useMemo(
    () => messagesToThread(detail?.messages, agentLabel),
    [detail, agentLabel],
  );

  const { thread, send, draft, setDraft } = useChatStream({ baseThread, activeBot: effectiveId });

  const [sendError, setSendError] = React.useState<{ id: string; message: string } | null>(null);
  const displayedError = sendError?.id === effectiveId ? sendError.message : null;

  const handleSend = (value: string) => {
    if (!effectiveId) {
      setSendError({ id: '', message: 'Create a conversation first.' });
      return;
    }
    setSendError(null);
    send(value).catch((err: unknown) => {
      setSendError({
        id: effectiveId,
        message: err instanceof Error ? err.message : 'Failed to send message.',
      });
    });
  };

  const createThread = async () => {
    try {
      const res = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) return;
      const created = await res.json();
      await queryClient.invalidateQueries({ queryKey: ['threads'] });
      if (created?.id) setActiveThreadId(created.id);
    } catch {
      // Roster refreshes on its own poll; nothing else to do.
    }
  };

  const botTabs: BotTab[] = threads.map(t => {
    const title = t.title?.trim();
    return {
      id: t.id,
      label: title ? (title.length > 30 ? `${title.slice(0, 30)}…` : title) : 'New thread',
      role: t.agent || '—',
      status: t.state === 'running' ? 'busy' : 'idle',
    };
  });

  const composer = (
    <>
      {displayedError && (
        <div style={{ padding: '6px 12px', fontSize: 12, color: '#F43F5E', background: 'rgba(244,63,94,0.1)', borderTop: '1px solid rgba(244,63,94,0.25)' }}>
          {displayedError}
        </div>
      )}
      <ChatComposer
        value={draft}
        onChange={setDraft}
        onSubmit={handleSend}
        scopeLabel={agentLabel}
        placeholder={effectiveId ? 'Message the control plane…' : 'Start a conversation to begin…'}
      />
    </>
  );

  return (
    <aside className="lab-chat">
      <header className="lab-chat__head">
        <span className="pulse emerald sm" />
        <div className="t">Bot console</div>
        <button className="bc-ico" title="New conversation" aria-label="New conversation" onClick={createThread}>
          <span style={{ fontSize: 16, lineHeight: 1, fontWeight: 600 }}>+</span>
        </button>
        {onClose && (
          <button className="bc-ico" title="Close" aria-label="Close bot console" onClick={onClose}>
            <Icon name="x" size={13} />
          </button>
        )}
      </header>
      <ChatContainer
        bots={botTabs}
        activeBotId={effectiveId}
        onBotChange={setActiveThreadId}
        composer={composer}
      >
        {threads.length === 0 ? (
          <div style={{ padding: 16, fontSize: 13, color: 'rgb(var(--canvas-fg-3))' }}>
            No conversations yet. Use the + button above to start chatting with the control plane.
          </div>
        ) : (
          thread.map((item, i) => {
            if (item.kind === 'divider') {
              return <ChatDivider key={i} label={item.label} />;
            }

            const isUser = item.who === 'user';
            return (
              <ChatMessage
                key={i}
                role={isUser ? 'user' : 'bot'}
                senderName={isUser ? (item.name ?? 'you') : agentLabel}
                timestamp={item.when}
                avatar={isUser ? undefined : avatarFor(agentLabel)}
                badge={!isUser && activeThread?.agent ? activeThread.agent : undefined}
                body={
                  <div>
                    {item.body.map((b, j) => (
                      <p key={j} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(b.p) }} />
                    ))}
                  </div>
                }
                thinkingBlock={item.thinking}
              />
            );
          })
        )}
      </ChatContainer>
    </aside>
  );
};
