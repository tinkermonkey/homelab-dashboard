import React, { useMemo } from 'react';
import type { TopologyBot } from '@homelab/shared';

const TP_STAGE_W = 1240;
const TP_STAGE_H = 800;
const TP_BOT_W = 240;

interface TopologyEdgesProps {
  bots: TopologyBot[];
  botLayout: Record<string, { x: number; y: number; host: string }>;
}

function bezier(x1: number, y1: number, x2: number, y2: number, curvature = 0.35) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dist = Math.hypot(dx, dy);
  const nx = -dy / (dist || 1);
  const ny = dx / (dist || 1);
  const off = Math.min(120, dist * curvature);
  return `M ${x1} ${y1} Q ${mx + nx * off} ${my + ny * off} ${x2} ${y2}`;
}

export const TopologyEdges: React.FC<TopologyEdgesProps> = ({ bots, botLayout }) => {
  const paths = useMemo(() => {
    const lab = bots.find(b => b.id === 'lab-bot');
    if (!lab || !lab.delegates) return [];

    const labPos = botLayout['lab-bot'];
    if (!labPos) return [];

    const startX = labPos.x + TP_BOT_W;
    const startY = labPos.y + 38;

    return lab.delegates
      .map(targetId => {
        const tp = botLayout[targetId];
        if (!tp) return null;

        let endX, endY;
        if (targetId === 'ops-bot') {
          endX = tp.x + 50;
          endY = tp.y;
        } else {
          endX = tp.x;
          endY = tp.y + 38;
        }

        return {
          id: targetId,
          d: bezier(startX, startY, endX, endY, targetId === 'ops-bot' ? 0.18 : 0.18),
          midX: (startX + endX) / 2,
          midY: (startY + endY) / 2,
        };
      })
      .filter(Boolean) as Array<{ id: string; d: string; midX: number; midY: number }>;
  }, [bots, botLayout]);

  return (
    <svg className="tp-edges" viewBox={`0 0 ${TP_STAGE_W} ${TP_STAGE_H}`} preserveAspectRatio="none">
      <defs>
        <marker id="tp-arrow-cyan" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent-cyan)" />
        </marker>
      </defs>
      {paths.map(p => (
        <g key={p.id}>
          <path className="delegate" d={p.d} markerEnd="url(#tp-arrow-cyan)" />
        </g>
      ))}
      {paths.map(p => (
        <g key={'lbl-' + p.id}>
          <rect
            x={p.midX - 28}
            y={p.midY - 8}
            width={56}
            height={16}
            rx={3}
            fill="var(--canvas-card)"
            stroke="color-mix(in oklab, var(--accent-cyan) 30%, transparent)"
          />
          <text x={p.midX} y={p.midY + 3.5} textAnchor="middle" fill="var(--accent-cyan-deep)">
            delegates
          </text>
        </g>
      ))}
    </svg>
  );
};
