import React, { useEffect, useRef, useState } from 'react';
import type { Bot, ThreadItem, ThreadMessage } from '@homelab/shared';
import DOMPurify from 'dompurify';
import { Icon } from '../shared/Icon';
import './ChatRail.css';

interface ChatRailProps {
  bots: Bot[];
  threadByBot: Record<string, ThreadItem[]>;
  activeBot: string;
  onActiveBotChange: (botId: string) => void;
  onClose?: () => void;
}

const ToolBlock: React.FC<{ tool: ThreadMessage['tool'] }> = ({ tool }) => {
  if (!tool) return null;

  return (
    <div className="chat-tool-block">
      <div className="tb-head">
        <Icon name="zap" size={10} />
        <span>{tool.name}</span>
        <span className="ok">{tool.status}</span>
      </div>
      <div className="tb-body">
        {tool.lines.map((line, i) => (
          <div key={i}>
            {line.k && <span className="k">{line.k.padEnd(11, ' ')}</span>}
            <span className="v">{line.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChatMessage: React.FC<{
  m: ThreadItem;
  bots: Bot[];
  onSuggestedText?: (text: string) => Promise<void>;
}> = ({ m, bots, onSuggestedText }) => {
  if (m.kind === 'divider') {
    return <div className="chat-divider">{m.label}</div>;
  }

  const isUser = m.who === 'user';
  const bot = bots.find(b => b.id === m.who);
  const av = isUser ? (m.name || 'me').slice(0, 2).toUpperCase() : (bot ? bot.avatar : '?');
  const name = isUser ? (m.name || 'you') : (bot?.label || m.who);
  const badge = isUser ? null : (bot ? bot.role : null);

  return (
    <div className={'chat-msg ' + (isUser ? 'user' : 'bot')} data-bot={m.who}>
      <div className="av">{av}</div>
      <div style={{ minWidth: 0 }}>
        <div className="meta">
          <span className="name">{name}</span>
          {badge && <span className="badge">{badge}</span>}
          <span className="when">{m.when}</span>
        </div>
        <div className="body">
          {m.body.map((b, i) => (
            <p key={i} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(b.p) }} />
          ))}
          {m.tool && <ToolBlock tool={m.tool} />}
          {m.suggestions && (
            <div className="chat-suggestions">
              {m.suggestions.map((sg, i) => (
                <button
                  key={i}
                  className="sg"
                  onClick={() => onSuggestedText?.(sg.t).catch(console.error)}
                >
                  <Icon name="arrow" size={9} />
                  {sg.t}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ChatRail: React.FC<ChatRailProps> = ({
  bots,
  threadByBot,
  activeBot,
  onActiveBotChange,
  onClose,
}) => {
  const [draft, setDraft] = useState('');
  const [extraMsgs, setExtraMsgs] = useState<Record<string, ThreadItem[]>>({});
  const threadRef = useRef<HTMLDivElement>(null);

  const baseThread = threadByBot[activeBot] || [];
  const thread = [...baseThread, ...(extraMsgs[activeBot] || [])];
  const activeBotObj = bots.find(b => b.id === activeBot);

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [activeBot, extraMsgs]);

  const send = async (text?: string) => {
    const t = (text != null ? text : draft).trim();
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
      body: [{ p: escapeHtml(t) }],
    };

    // Add user message to thread
    setExtraMsgs(prev => ({
      ...prev,
      [activeBot]: [...(prev[activeBot] || []), userMsg],
    }));
    setDraft('');

    // Stream bot response via SSE
    try {
      const response = await fetch(`/api/chat/${activeBot}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: t }),
      });

      if (!response.ok) {
        const errorMsg: ThreadMessage = {
          kind: 'msg',
          who: activeBot,
          when,
          body: [{ p: `Error: ${response.statusText}` }],
        };
        setExtraMsgs(prev => ({
          ...prev,
          [activeBot]: [...(prev[activeBot] || []), errorMsg],
        }));
        return;
      }

      let accumulated = '';
      const reader = response.body?.getReader();
      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        accumulated += chunk;

        // Parse SSE format: "data: {json}\n\n"
        const lines = accumulated.split('\n');
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6);
              const parsed = JSON.parse(jsonStr);
              if (parsed.choices?.[0]?.delta?.content) {
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
            } catch {
              // Ignore parse errors for malformed SSE lines
            }
          }
        }

        // Keep the last incomplete line in accumulated
        accumulated = lines[lines.length - 1];
      }

      // Add the complete bot message if not already added
      const finalMsgText = accumulated;
      if (finalMsgText && !finalMsgText.startsWith('data: ')) {
        // Already added via streaming above
      }
    } catch (error) {
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
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send().catch(console.error);
    }
  };

  return (
    <aside className="chat-rail">
      <div className="chat-rail-head">
        <div>
          <div className="title">
            <span className="led"></span>
            Bot console
          </div>
          <div className="sub">{bots.length} BOTS · ONE-CLICK DELEGATE · ⌘ENTER</div>
        </div>
        <div style={{ display: 'flex', gap: '2px' }}>
          <button className="ico" title="History">
            <Icon name="history" size={14} />
          </button>
          <button className="ico" title="Settings">
            <Icon name="settings" size={14} />
          </button>
          {onClose && (
            <button className="ico" title="Close console" onClick={onClose}>
              <Icon name="x" size={14} />
            </button>
          )}
        </div>
      </div>
      <div className="bot-tabs">
        {bots.map(b => (
          <button
            key={b.id}
            className={'bot-tab ' + (activeBot === b.id ? 'active' : '')}
            onClick={() => onActiveBotChange(b.id)}
          >
            <span className="n">
              <span
                className={
                  'd ' + (b.status === 'busy' ? 'busy' : b.status === 'idle' ? 'idle' : '')
                }
              ></span>
              {b.label}
            </span>
            <span className="role">{b.role}</span>
          </button>
        ))}
      </div>
      <div className="chat-thread" ref={threadRef}>
        {thread.map((m, i) => (
          <ChatMessage
            key={i}
            m={m}
            bots={bots}
            onSuggestedText={send}
          />
        ))}
      </div>
      <div className="chat-composer">
        <div className="composer-tools">
          <span className="scope">
            talking to <b>{activeBotObj?.label || 'bot'}</b>
          </span>
          <button className="pill" title="Attach context">
            <Icon name="plus" size={10} /> context
          </button>
          <button className="pill" title="Slash commands">
            <Icon name="zap" size={10} /> /cmd
          </button>
        </div>
        <div className="composer-input-wrap">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={onKey}
            placeholder={`Ask ${activeBotObj?.label || 'bot'} to do something… (try "/restart frigate")`}
            rows={2}
          />
          <div className="composer-foot">
            <span className="hint">
              <b>↵</b> send · <b>⇧↵</b> newline · <b>/</b> commands
            </span>
            <button className="send" onClick={() => send().catch(console.error)}>
              <Icon name="arrow" size={11} /> send
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]!));
}
