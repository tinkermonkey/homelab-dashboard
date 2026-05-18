import React, { useState } from 'react';
import type { TopologyBot } from '@homelab/shared';

interface BotInspectorProps {
  bot: TopologyBot | null;
}

export const BotInspector: React.FC<BotInspectorProps> = ({ bot }) => {
  const [expandedMcps, setExpandedMcps] = useState(true);
  const [expandedManages, setExpandedManages] = useState(true);
  const [expandedDelegates, setExpandedDelegates] = useState(true);

  if (!bot) {
    return (
      <div className="tp-inspector">
        <div style={{ textAlign: 'center', color: 'var(--canvas-fg-3)', fontSize: 12, padding: '24px 0', fontFamily: 'var(--font-mono)' }}>
          Select a bot to inspect.
        </div>
      </div>
    );
  }

  return (
    <div className="tp-inspector">
      {/* Bot header */}
      <div className="tp-i-head" data-bot={bot.id}>
        <div className="av">{bot.avatar}</div>
        <div>
          <div className="nm">{bot.label}</div>
          <div className="rl">
            {bot.role} · on {bot.host}
          </div>
        </div>
      </div>

      {/* Description */}
      <div style={{ fontSize: '12.5px', color: 'var(--canvas-fg-2)', lineHeight: 1.5 }}>{bot.desc}</div>

      {/* KV list */}
      <dl className="tp-i-kv">
        <dt>model</dt>
        <dd>{bot.model}</dd>
        <dt>host</dt>
        <dd>{bot.host}.lab.local</dd>
        <dt>status</dt>
        <dd
          style={{
            color:
              bot.status === 'busy'
                ? 'rgb(var(--accent-amber))'
                : bot.status === 'idle'
                  ? 'var(--canvas-fg-3)'
                  : 'rgb(var(--accent-emerald))',
          }}
        >
          ● {bot.status}
        </dd>
        <dt>mcps</dt>
        <dd>{bot.mcps.length} attached</dd>
        <dt>manages</dt>
        <dd>
          {bot.manages.length} project{bot.manages.length === 1 ? '' : 's'}
        </dd>
        {bot.delegates.length > 0 && (
          <>
            <dt>delegates</dt>
            <dd>
              {bot.delegates.length} bot{bot.delegates.length === 1 ? '' : 's'}
            </dd>
          </>
        )}
      </dl>

      {/* MCP sidecars section */}
      <div>
        <button
          className="tp-i-section-btn"
          onClick={() => setExpandedMcps(!expandedMcps)}
          title={expandedMcps ? 'Collapse' : 'Expand'}
        >
          <span className="toggle-icon">{expandedMcps ? '▼' : '▶'}</span>
          MCP sidecars · {bot.mcps.length}
        </button>
        {expandedMcps && (
          <div className="tp-i-mcp-list">
            {bot.mcps.map(mcp => (
              <div key={mcp.id} className="tp-i-mcp">
                <div className="top">
                  <span className={`name${mcp.kind === 'remote' ? ' remote' : ''}`}>
                    <span className="dot" />
                    {mcp.label}
                  </span>
                  <span className="ver">
                    v{mcp.ver} · {mcp.kind}
                  </span>
                </div>
                <div className="d">{mcp.desc}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Managed projects section */}
      {bot.manages.length > 0 && (
        <div>
          <button
            className="tp-i-section-btn"
            onClick={() => setExpandedManages(!expandedManages)}
            title={expandedManages ? 'Collapse' : 'Expand'}
          >
            <span className="toggle-icon">{expandedManages ? '▼' : '▶'}</span>
            Managed projects · {bot.manages.length}
          </button>
          {expandedManages && (
            <div className="tp-project-list">
              {bot.manages.map(project => (
                <span key={project.name} className="tp-project" data-host={project.host}>
                  <span className="host-dot" />
                  {project.name}
                  <span className="port">
                    {project.host}:{project.port}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delegates section */}
      {bot.delegates.length > 0 && (
        <div>
          <button
            className="tp-i-section-btn"
            onClick={() => setExpandedDelegates(!expandedDelegates)}
            title={expandedDelegates ? 'Collapse' : 'Expand'}
          >
            <span className="toggle-icon">{expandedDelegates ? '▼' : '▶'}</span>
            Delegates to · {bot.delegates.length}
          </button>
          {expandedDelegates && (
            <div className="tp-project-list">
              {bot.delegates.map(delegateId => (
                <span
                  key={delegateId}
                  className="tp-project"
                  style={{
                    borderColor: 'color-mix(in oklab, rgb(var(--accent-cyan)) 35%, transparent)',
                    background: 'color-mix(in oklab, rgb(var(--accent-cyan)) 10%, transparent)',
                    color: 'rgb(var(--accent-cyan-deep))',
                  }}
                >
                  <span className="host-dot" style={{ background: 'rgb(var(--accent-cyan))' }} />
                  {delegateId}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
