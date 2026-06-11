import React from 'react';
import DOMPurify from 'dompurify';
import type { Bot, ThreadItem } from '@homelab/shared';
import {
  Icon,
  ChatContainer,
  ChatMessage,
  ChatComposer,
  ChatSuggestions,
  ChatDivider,
  type BotTab,
} from '@tinkermonkey/heimdall-ui';
import { useChatStream } from '../../hooks/useChatStream';

interface BotConsoleProps {
  bots: Bot[];
  threadByBot: Record<string, ThreadItem[]>;
  activeBot: string;
  onActiveBotChange: (botId: string) => void;
  onClose?: () => void;
}

function mapBotStatus(status: Bot['status']): BotTab['status'] {
  if (status === 'ok') return 'healthy';
  if (status === 'busy') return 'busy';
  return 'idle';
}

function mapToolStatus(status: string): 'running' | 'success' | 'error' {
  if (status === 'running') return 'running';
  if (status === 'error' || status === 'failed') return 'error';
  return 'success';
}

export const BotConsole: React.FC<BotConsoleProps> = ({
  bots,
  threadByBot,
  activeBot,
  onActiveBotChange,
  onClose,
}) => {
  const baseThread = threadByBot[activeBot] || [];
  const { thread, send, draft, setDraft } = useChatStream({ baseThread, activeBot });
  const activeBotObj = bots.find(b => b.id === activeBot);
  const [sendError, setSendError] = React.useState<string | null>(null);

  const handleSend = (value: string) => {
    setSendError(null);
    send(value).catch((err: unknown) => {
      setSendError(err instanceof Error ? err.message : 'Failed to send message.');
    });
  };

  const botTabs: BotTab[] = bots.map(b => ({
    id: b.id,
    label: b.label,
    role: b.role,
    status: mapBotStatus(b.status),
  }));

  const composer = (
    <>
      {sendError && (
        <div style={{ padding: '6px 12px', fontSize: 12, color: '#F43F5E', background: 'rgba(244,63,94,0.1)', borderTop: '1px solid rgba(244,63,94,0.25)' }}>
          {sendError}
        </div>
      )}
      <ChatComposer
        value={draft}
        onChange={setDraft}
        onSubmit={handleSend}
        scopeLabel={activeBotObj?.label ?? activeBot}
        placeholder={`Ask ${activeBotObj?.label ?? 'bot'} to do something…`}
      />
    </>
  );

  return (
    <aside className="lab-chat">
      <header className="lab-chat__head">
        <span className="pulse emerald sm" />
        <div className="t">Bot console</div>
        <button className="bc-ico" title="Settings" aria-label="Settings">
          <Icon name="settings" size={13} />
        </button>
        {onClose && (
          <button className="bc-ico" title="Close" aria-label="Close bot console" onClick={onClose}>
            <Icon name="x" size={13} />
          </button>
        )}
      </header>
      <ChatContainer
        bots={botTabs}
        activeBotId={activeBot}
        onBotChange={onActiveBotChange}
        composer={composer}
      >
        {thread.map((item, i) => {
          if (item.kind === 'divider') {
            return <ChatDivider key={i} label={item.label} />;
          }

          const isUser = item.who === 'user';
          const bot = isUser ? null : bots.find(b => b.id === item.who);

          return (
            <React.Fragment key={i}>
              <ChatMessage
                role={isUser ? 'user' : 'bot'}
                senderName={isUser ? (item.name ?? 'you') : (bot?.label ?? item.who)}
                timestamp={item.when}
                avatar={isUser ? undefined : (bot?.avatar ?? item.who.slice(0, 2).toUpperCase())}
                badge={!isUser ? bot?.role : undefined}
                body={
                  <div>
                    {item.body.map((b, j) => (
                      <p key={j} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(b.p) }} />
                    ))}
                  </div>
                }
                toolBlock={item.tool ? {
                  name: item.tool.name,
                  status: mapToolStatus(item.tool.status),
                  output: item.tool.lines.map(l => ({ key: l.k, value: l.v })),
                } : undefined}
                thinkingBlock={item.thinking}
              />
              {item.suggestions && item.suggestions.length > 0 && (
                <ChatSuggestions
                  suggestions={item.suggestions.map(s => s.t)}
                  onSelect={handleSend}
                />
              )}
            </React.Fragment>
          );
        })}
      </ChatContainer>
    </aside>
  );
};
