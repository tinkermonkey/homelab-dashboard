import React, { useRef } from 'react';
import type { Bot, ThreadItem } from '@homelab/shared';
import DOMPurify from 'dompurify';
import {
  ChatContainer,
  ChatMessage as HeimdallChatMessage,
  ChatComposer as HeimdallChatComposer,
  ChatDivider,
  ChatSuggestions,
  type ToolBlockData,
  type ThinkingBlockData,
  type BotTab,
} from '@tinkermonkey/heimdall-ui';
import { useChatStream } from '../../hooks/useChatStream';

interface ChatRailProps {
  bots: Bot[];
  threadByBot: Record<string, ThreadItem[]>;
  activeBot: string;
  onActiveBotChange: (botId: string) => void;
}

function normalizeToolStatus(status: string): 'running' | 'success' | 'error' {
  if (status === 'running') return 'running';
  if (status === 'completed' || status === 'ok') return 'success';
  return 'error';
}

export const ChatRail: React.FC<ChatRailProps> = ({
  bots,
  threadByBot,
  activeBot,
  onActiveBotChange,
}) => {
  const baseThread = threadByBot[activeBot] || [];
  const { thread, send, draft, setDraft } = useChatStream({
    baseThread,
    activeBot,
  });

  const threadRef = useRef<HTMLDivElement>(null);
  const activeBotObj = bots.find(b => b.id === activeBot);

  const botTabs: BotTab[] = bots.map(b => ({
    id: b.id,
    label: b.label,
    role: b.role,
    status: b.status === 'busy' ? 'busy' : b.status === 'idle' ? 'idle' : 'healthy',
  }));

  const composer = (
    <HeimdallChatComposer
      value={draft}
      onChange={setDraft}
      onSubmit={(text) => send(text).catch(console.error)}
      placeholder={`Ask ${activeBotObj?.label || 'bot'} to do something…`}
      scopeLabel={`talking to ${activeBotObj?.label || 'bot'}`}
    />
  );

  return (
    <ChatContainer
      bots={botTabs}
      activeBotId={activeBot}
      onBotChange={onActiveBotChange}
      autoScroll={true}
      composer={composer}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '380px',
        backgroundColor: 'rgb(var(--shell-bg-2))',
        borderLeft: '1px solid rgb(var(--shell-border))',
        color: 'rgb(var(--shell-fg-1))',
      }}
    >
      <div
        ref={threadRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px 14px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          minHeight: 0,
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgb(var(--shell-border-2)) transparent',
        }}
      >
        {thread.map((m, i) => {
          if (m.kind === 'divider') {
            return <ChatDivider key={i} label={m.label} />;
          }

          const isUser = m.who === 'user';
          const bot = bots.find(b => b.id === m.who);
          const av = isUser ? (m.name || 'me').slice(0, 2).toUpperCase() : (bot ? bot.avatar : '?');
          const name = isUser ? (m.name || 'you') : (bot?.label || m.who);
          const badge = isUser ? undefined : (bot?.role || undefined);

          // Build tool block data if present
          let toolBlockData: ToolBlockData | undefined;
          if (m.tool) {
            toolBlockData = {
              name: m.tool.name,
              status: normalizeToolStatus(m.tool.status),
              output: m.tool.lines.map(line => ({
                key: line.k,
                value: line.v,
              })),
            };
          }

          // Build thinking block data if present
          let thinkingBlockData: ThinkingBlockData | undefined;
          if (m.thinking) {
            thinkingBlockData = {
              content: m.thinking.content,
            };
          }

          // Build body content with DOMPurify sanitization
          const bodyContent = (
            <div
              style={{
                fontSize: '12.5px',
                lineHeight: 1.55,
                color: isUser ? 'rgb(var(--shell-fg-2))' : 'rgb(var(--shell-fg-1))',
              }}
            >
              {m.body.map((b, idx) => (
                <p
                  key={idx}
                  style={{
                    margin: idx === m.body.length - 1 ? 0 : '0 0 6px',
                  }}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(b.p) }}
                />
              ))}
              {m.suggestions && (
                <ChatSuggestions
                  suggestions={m.suggestions.map(sg => sg.t)}
                  onSelect={(text) => send(text).catch(console.error)}
                  style={{
                    marginTop: '8px',
                  }}
                />
              )}
            </div>
          );

          return (
            <HeimdallChatMessage
              key={i}
              role={isUser ? 'user' : 'bot'}
              senderName={name}
              timestamp={m.when}
              avatar={av}
              badge={badge}
              body={bodyContent}
              toolBlock={toolBlockData}
              thinkingBlock={thinkingBlockData}
              style={{
                display: 'grid',
                gridTemplateColumns: '22px 1fr',
                gap: '10px',
                alignItems: 'start',
              }}
            />
          );
        })}
      </div>
    </ChatContainer>
  );
};
