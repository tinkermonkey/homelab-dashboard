import React from 'react';
import type { NetworkClient } from '@homelab/shared';

interface TopTalkersPanelProps {
  topTalkers: NetworkClient[];
}

function formatBytes(b: number): string {
  if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GB`;
  if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
  if (b >= 1e3) return `${(b / 1e3).toFixed(0)} KB`;
  return `${b} B`;
}

export const TopTalkersPanel: React.FC<TopTalkersPanelProps> = ({ topTalkers }) => {
  if (topTalkers.length === 0) {
    return <div className="network-empty">No traffic data available</div>;
  }

  const maxBytes = Math.max(...topTalkers.map(c => c.bytesTx + c.bytesRx), 1);

  return (
    <div className="top-talkers__bars">
      {topTalkers.map((client, i) => {
        const total = client.bytesTx + client.bytesRx;
        const pct = (total / maxBytes) * 100;
        const fillClass = `talker-bar__fill ${client.isWired ? 'talker-bar__fill--wired' : 'talker-bar__fill--wireless'}`;

        return (
          <div key={i} className="talker-bar">
            <span className="talker-bar__label" title={`${client.hostname} · ${client.ip}`}>
              {client.hostname}
            </span>
            <div className="talker-bar__track">
              <div className={fillClass} style={{ width: `${pct}%` }} />
            </div>
            <span className="talker-bar__value">{formatBytes(total)}</span>
          </div>
        );
      })}
    </div>
  );
};
