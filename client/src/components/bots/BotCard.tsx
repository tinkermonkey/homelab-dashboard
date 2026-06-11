import React from 'react';
import type { Bot, TopologyBot } from '@homelab/shared';
import { Panel, KVGrid, Chip } from '@tinkermonkey/heimdall-ui';
import type { KVGridRow } from '@tinkermonkey/heimdall-ui';

interface BotCardProps {
  bot: Bot;
  topologyBot?: TopologyBot;
}

function statusTone(status: Bot['status']): string {
  if (status === 'ok') return 'emerald';
  if (status === 'busy') return 'amber';
  return 'neutral';
}

export const BotCard: React.FC<BotCardProps> = ({ bot, topologyBot }) => {
  const tone = statusTone(bot.status);
  const mcps = topologyBot?.mcps ?? [];
  const manages = topologyBot?.manages ?? [];

  const rows: KVGridRow[] = [
    { key: 'model', value: <span className="cell-mono">{bot.model}</span> },
    { key: 'host', value: <span className="cell-mono">{topologyBot?.host ?? '—'}</span> },
    { key: 'mcp', value: `${mcps.length} servers` },
    { key: 'manages', value: `${manages.length} services` },
  ];

  return (
    <Panel title={bot.label} subtitle={bot.role}>
      <div className="row" style={{ alignItems: 'flex-start', gap: 4, marginBottom: 8 }}>
        <span
          className={`pulse-dot pulse-dot--${tone} pulse-dot--sm`}
          style={{ marginTop: 2, flexShrink: 0 }}
        />
        <span className="cell-mono muted" style={{ fontSize: 11 }}>{bot.status}</span>
      </div>
      <div className="row" style={{ gap: 12, marginBottom: 12 }}>
        <div
          className="bot-avatar"
          data-id={bot.id}
          style={{ width: 40, height: 40, flexShrink: 0 }}
        >
          {bot.avatar.slice(0, 2).toUpperCase()}
        </div>
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: 'rgb(var(--canvas-fg-2))' }}>
          {bot.desc}
        </p>
      </div>
      <KVGrid rows={rows} />
      {mcps.length > 0 && (
        <>
          <div style={{
            margin: '12px 0 6px',
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'rgb(var(--canvas-fg-3))',
          }}>
            MCP servers
          </div>
          <div className="row row--wrap" style={{ gap: 5 }}>
            {mcps.map(m => (
              <Chip key={m.id} variant={m.kind === 'remote' ? 'violet' : 'neutral'}>
                {m.label}
              </Chip>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
};
