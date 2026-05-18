import React, { useMemo } from 'react';
import type { TopologyBot } from '@homelab/shared';
import { BotCard } from './BotCard';
import { TopologyEdges } from './TopologyEdges';
import { TopologyLegend } from './TopologyLegend';
import { ServerHeader } from './ServerHeader';

const TP_STAGE_H = 800;

const TP_COL_X = { nyx: 30, helios: 330, aether: 630, vega: 930 };

const TP_BOT_LAYOUT: Record<string, { x: number; y: number; host: string }> = {
  'lab-bot': { x: 30, y: 88, host: 'nyx' },
  'ops-bot': { x: 30, y: 408, host: 'nyx' },
  'sync-bot': { x: 330, y: 88, host: 'helios' },
  'watch-bot': { x: 630, y: 88, host: 'aether' },
};

const HOST_ROLE = { nyx: 'compute', helios: 'storage', aether: 'k8s', vega: 'gpu' };

const HOST_SUB = {
  nyx: 'compute · 24c / 128GB',
  helios: 'storage · zfs · 90 TB',
  aether: 'k3s · 64 GB',
  vega: 'gpu · 2× rtx 4090',
};

interface TopologyStageProps {
  bots: TopologyBot[];
  selectedBotId: string;
  onSelectBot: (botId: string) => void;
}

export const TopologyStage: React.FC<TopologyStageProps> = ({ bots, selectedBotId, onSelectBot }) => {
  const botsByHost = useMemo(() => {
    const byHost: Record<string, TopologyBot[]> = {
      nyx: [],
      helios: [],
      aether: [],
      vega: [],
    };
    bots.forEach(bot => {
      if (byHost[bot.host]) {
        byHost[bot.host].push(bot);
      }
    });
    return byHost;
  }, [bots]);

  return (
    <div className="tp-stage-wrap full">
      <div className="tp-stage" style={{ minHeight: TP_STAGE_H }}>
        {/* Grid background */}
        <div className="tp-grid" />

        {/* Server headers */}
        <div className="tp-server-row">
          {(['nyx', 'helios', 'aether', 'vega'] as const).map(hostId => (
            <ServerHeader
              key={hostId}
              id={hostId}
              role={HOST_ROLE[hostId] as 'compute' | 'storage' | 'k8s' | 'gpu'}
              sub={HOST_SUB[hostId]}
              botCount={botsByHost[hostId].length}
            />
          ))}
        </div>

        {/* SVG edges overlay */}
        <TopologyEdges bots={bots} botLayout={TP_BOT_LAYOUT} />

        {/* Bot cards */}
        {bots.map(bot => (
          <BotCard
            key={bot.id}
            bot={bot}
            layout={TP_BOT_LAYOUT[bot.id]}
            selected={selectedBotId === bot.id}
            onSelect={onSelectBot}
          />
        ))}

        {/* Vega placeholder (no bot) */}
        <div className="tp-empty" style={{ left: TP_COL_X.vega, top: 88 }}>
          <b>No bot on vega</b>
          GPU workloads are launched here by <span style={{ color: 'var(--canvas-fg-1)' }}>ops-bot</span> via{' '}
          <code style={{ fontFamily: 'var(--mono)', fontSize: 10, background: 'var(--canvas-bg-2)', padding: '1px 4px', borderRadius: 3 }}>
            ssh-mcp
          </code>
          ; no resident agent.
        </div>

        {/* Legend */}
        <TopologyLegend />
      </div>
    </div>
  );
};
