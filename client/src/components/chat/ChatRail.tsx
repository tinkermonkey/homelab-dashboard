import React, { useEffect, useRef } from 'react';
import type { Bot, ThreadItem, ThreadMessage } from '@homelab/shared';
import DOMPurify from 'dompurify';
import { Icon } from '../shared/Icon';
import { useChatStream } from '../../hooks/useChatStream';

interface ChatRailProps {
  bots: Bot[];
  threadByBot: Record<string, ThreadItem[]>;
  activeBot: string;
  onActiveBotChange: (botId: string) => void;
  onClose?: () => void;
}

// ── Bot message sub-component ─────────────────────────────────────────
interface BotMessageProps {
  msg: ThreadMessage;
  bots: Bot[];
  onSuggestionClick: (text: string) => void;
}

const BotMessage: React.FC<BotMessageProps> = ({ msg, bots, onSuggestionClick }) => {
  const isUser = msg.who === 'user';
  const bot = isUser ? null : bots.find(b => b.id === msg.who);
  const av = isUser
    ? (msg.name || 'me').slice(0, 2).toUpperCase()
    : (bot ? bot.avatar : '?').slice(0, 2).toUpperCase();
  const name = isUser ? (msg.name || 'you') : (bot?.label || msg.who);
  const badge = !isUser ? (bot?.role || undefined) : undefined;

  return (
    <div className={`bc-msg${isUser ? ' user' : ''}`}>
      <span
        className="av bot-avatar"
        data-id={isUser ? undefined : bot?.id}
        title={name}
      >
        {av}
      </span>
      <div className="bc-content">
        <div className="bc-meta">
          <span className="who">{name}</span>
          {badge && <span className="badge">{badge}</span>}
          <span className="when">{msg.when}</span>
        </div>
        <div className="bc-body">
          {msg.body.map((b, i) => (
            <p
              key={i}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(b.p) }}
            />
          ))}
        </div>
        {msg.thinking && (
          <details className="bc-thinking">
            <summary>thinking…</summary>
            <pre>{msg.thinking.content}</pre>
          </details>
        )}
        {msg.tool && (
          <div className={`bc-tool ${msg.tool.status}`}>
            <div className="bc-tool-name">⚙ {msg.tool.name}</div>
            {msg.tool.lines.map((ln, i) => (
              <div key={i} className="bc-tool-line">
                {ln.k && <span className="bc-tool-key">{ln.k}</span>}
                <span className="bc-tool-val">{ln.v}</span>
              </div>
            ))}
          </div>
        )}
        {msg.suggestions && msg.suggestions.length > 0 && (
          <div className="bc-sugs">
            {msg.suggestions.map((sg, i) => (
              <button key={i} className="bc-sug" onClick={() => onSuggestionClick(sg.t)}>
                {sg.t}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── ChatRail ──────────────────────────────────────────────────────────
export const ChatRail: React.FC<ChatRailProps> = ({
  bots,
  threadByBot,
  activeBot,
  onActiveBotChange,
  onClose,
}) => {
  const baseThread = threadByBot[activeBot] || [];
  const { thread, send, draft, setDraft } = useChatStream({ baseThread, activeBot });
  const threadRef = useRef<HTMLDivElement>(null);
  const activeBotObj = bots.find(b => b.id === activeBot);

  // Auto-scroll on new messages
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [thread.length]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (draft.trim()) {
        send(draft).catch(console.error);
      }
    }
  };

  return (
    <aside className="bot-console">
      {/* Header */}
      <header className="bc-head">
        <span className="pulse emerald sm" />
        <div className="info">
          <div className="t">Bot console</div>
          <div className="s">{bots.length} bots · one-click delegate · ⌘⏎</div>
        </div>
        <div className="actions">
          <button className="bc-ico" title="History" aria-label="History">
            <Icon name="history" size={13} />
          </button>
          <button className="bc-ico" title="Settings" aria-label="Settings">
            <Icon name="settings" size={13} />
          </button>
          {onClose && (
            <button className="bc-ico" title="Close" aria-label="Close bot console" onClick={onClose}>
              <Icon name="x" size={13} />
            </button>
          )}
        </div>
      </header>

      {/* Bot tabs */}
      <div className="bc-tabs">
        {bots.map(b => (
          <button
            key={b.id}
            className={`bc-tab${b.id === activeBot ? ' active' : ''}`}
            onClick={() => onActiveBotChange(b.id)}
            title={b.desc}
          >
            <span
              className="bot-avatar"
              data-id={b.id}
              style={{ width: 16, height: 16, fontSize: 8, borderRadius: 4 }}
            >
              {b.avatar.slice(0, 2).toUpperCase()}
            </span>
            <span>{b.label}</span>
            {b.status === 'busy' && <span className="pulse cyan xs" />}
          </button>
        ))}
      </div>

      {/* Thread */}
      <div className="bc-thread" ref={threadRef}>
        {thread.map((m, i) => {
          if (m.kind === 'divider') {
            return (
              <div key={i} className="bc-divider">
                <span>{m.label}</span>
              </div>
            );
          }
          return (
            <BotMessage
              key={i}
              msg={m}
              bots={bots}
              onSuggestionClick={(text) => send(text).catch(console.error)}
            />
          );
        })}
      </div>

      {/* Composer */}
      <div className="bc-composer">
        <div className="bc-composer-tools">
          <span className="scope">talking to <b>{activeBotObj?.label ?? activeBot}</b></span>
          <span className="pill">context</span>
          <span className="pill">/cmd</span>
        </div>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Ask ${activeBotObj?.label ?? 'bot'} to do something…`}
          rows={3}
          aria-label="Message"
        />
        <div className="bc-composer-foot">
          <span>
            <kbd>⏎</kbd> send&nbsp;&nbsp;<kbd>⇧⏎</kbd> newline
          </span>
          <button
            className="send-btn"
            onClick={() => { if (draft.trim()) send(draft).catch(console.error); }}
            disabled={!draft.trim()}
            aria-label="Send message"
          >
            <Icon name="send" size={12} />
            &nbsp;send
          </button>
        </div>
      </div>
    </aside>
  );
};
