import React from 'react';
import type { TopologyBot } from '@homelab/shared';

interface BotCardProps {
  bot: TopologyBot;
  layout: { x: number; y: number; host: string };
  selected: boolean;
  onSelect: (botId: string) => void;
}

export const BotCard: React.FC<BotCardProps> = ({ bot, layout, selected, onSelect }) => {
  return (
    <div
      className={`tp-bot${selected ? ' selected' : ''}`}
      data-bot={bot.id}
      data-status={bot.status}
      style={{ left: layout.x, top: layout.y }}
      onClick={() => onSelect(bot.id)}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          onSelect(bot.id);
        }
      }}
    >
      {/* Head: avatar, name, role, pulse */}
      <div className="tp-bot-head">
        <div className="tp-bot-av">{bot.avatar}</div>
        <div>
          <div className="n">{bot.label}</div>
          <div className="role">{bot.role}</div>
        </div>
        <div className="pulse-state" />
      </div>

      {/* Description */}
      <div className="desc">{bot.desc}</div>

      {/* Model pill */}
      <div className="model">
        <span className="dot" />
        {bot.model}
      </div>

      {/* MCP sidecars */}
      <div className="tp-section">
        MCP sidecars <span className="ct">{bot.mcps.length}</span>
      </div>
      <div className="tp-mcp-list">
        {bot.mcps.map(mcp => (
          <span key={mcp.id} className={`tp-mcp${mcp.kind === 'remote' ? ' remote' : ''}`} title={`${mcp.label} v${mcp.ver} — ${mcp.desc}`}>
            <span className="dot" />
            {mcp.label}
          </span>
        ))}
      </div>

      {/* Manages section */}
      {bot.manages.length > 0 && (
        <>
          <div className="tp-section">
            Manages <span className="ct">{bot.manages.length}</span>
          </div>
          <div className="tp-project-list">
            {bot.manages.map(project => (
              <span key={project.name} className="tp-project" data-host={project.host} title={`${project.name} on ${project.host}:${project.port}`}>
                <span className="host-dot" />
                {project.name}
                <span className="port">:{project.port}</span>
              </span>
            ))}
          </div>
        </>
      )}

      {/* Delegates section (only for lab-bot) */}
      {bot.delegates.length > 0 && (
        <>
          <div className="tp-section">
            Delegates to <span className="ct">{bot.delegates.length}</span>
          </div>
          <div className="tp-mcp-list">
            {bot.delegates.map(delegateId => (
              <span
                key={delegateId}
                className="tp-project"
                data-host="orchestrator"
                style={{
                  borderColor: 'color-mix(in oklab, var(--accent-cyan) 35%, transparent)',
                  background: 'color-mix(in oklab, var(--accent-cyan) 8%, transparent)',
                  color: 'var(--accent-cyan-deep)',
                }}
              >
                <span className="host-dot" style={{ background: 'var(--accent-cyan)' }} />
                {delegateId}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
