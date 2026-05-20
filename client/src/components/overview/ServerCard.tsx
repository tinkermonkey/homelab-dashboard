import React from 'react';
import type { Server } from '@homelab/shared';
import { MetricRow } from '@tinkermonkey/heimdall-ui';
import type { StatusColor } from '@tinkermonkey/heimdall-ui';
import './ServerCard.css';

interface ServerCardProps {
  server: Server;
}

type HostTint = { rgb: string; a12: string; a31: string; statusColor: StatusColor };

const HOST_TINTS: Record<string, HostTint> = {
  nyx: {
    rgb: 'rgb(var(--host-nyx-tint))',
    a12: 'var(--host-nyx-tint-a12)',
    a31: 'var(--host-nyx-tint-a31)',
    statusColor: 'cyan',
  },
  helios: {
    rgb: 'rgb(var(--host-helios-tint))',
    a12: 'var(--host-helios-tint-a12)',
    a31: 'var(--host-helios-tint-a31)',
    statusColor: 'emerald',
  },
  aether: {
    rgb: 'rgb(var(--host-aether-tint))',
    a12: 'var(--host-aether-tint-a12)',
    a31: 'var(--host-aether-tint-a31)',
    statusColor: 'violet',
  },
  vega: {
    rgb: 'rgb(var(--host-vega-tint))',
    a12: 'var(--host-vega-tint-a12)',
    a31: 'var(--host-vega-tint-a31)',
    statusColor: 'amber',
  },
};

const STATUS_COLORS: Record<string, string> = {
  ok: 'rgb(var(--status-ok))',
  warn: 'rgb(var(--status-warn))',
  err: 'rgb(var(--status-error))',
};

const getStatusColor = (status: string) => STATUS_COLORS[status] || STATUS_COLORS.ok;
const getTintColor = (hostId: string) => HOST_TINTS[hostId] || HOST_TINTS.nyx;

export const ServerCard: React.FC<ServerCardProps> = ({ server }) => {
  const tintColor = getTintColor(server.id);
  const statusColor = getStatusColor(server.status);

  const getMetricThreshold = (metric: string) => {
    const thresholds: Record<string, number> = {
      cpu: 80,
      mem: 80,
      disk: 80,
      net: 90,
      gpu: 90,
    };
    return thresholds[metric] || 80;
  };

  const isHighMetric = (value: number, metric: string) => value >= getMetricThreshold(metric);

  return (
    <div className="server-card">
      <div className="server-card__header">
        <div
          className="server-card__mark"
          style={{ backgroundColor: tintColor.a12, borderColor: tintColor.a31 }}
        >
          <span style={{ color: tintColor.rgb, fontWeight: 600 }}>{server.mark}</span>
        </div>
        <div className="server-card__info">
          <div className="server-card__name">
            {server.hostname}
            <span
              className="server-card__status-pulse"
              style={{ backgroundColor: statusColor }}
            />
          </div>
          <div className="server-card__ip">{server.ip}</div>
        </div>
      </div>

      <div className="server-card__metrics">
        <MetricRow
          label="CPU"
          value={`${server.cpu.v}%`}
          percent={server.cpu.v}
          sparklineData={server.cpu.hist}
          color={isHighMetric(server.cpu.v, 'cpu') ? 'amber' : tintColor.statusColor}
        />
        <MetricRow
          label="MEM"
          value={`${server.mem.used} / ${server.mem.total}`}
          unit={server.mem.unit}
          percent={server.mem.v}
          sparklineData={server.mem.hist}
          color={isHighMetric(server.mem.v, 'mem') ? 'amber' : tintColor.statusColor}
        />
        <MetricRow
          label="DISK"
          value={`${server.disk.used} / ${server.disk.total}`}
          unit={server.disk.unit}
          percent={server.disk.v}
          sparklineData={server.disk.hist}
          color={isHighMetric(server.disk.v, 'disk') ? 'amber' : tintColor.statusColor}
        />
        <MetricRow
          label="NET"
          value={`↓${server.net.down} ↑${server.net.up}`}
          unit={server.net.unit}
          percent={server.net.v}
          sparklineData={server.net.hist}
          color={isHighMetric(server.net.v, 'net') ? 'amber' : tintColor.statusColor}
        />
        {server.gpu && (
          <MetricRow
            label="GPU"
            value={`${server.gpu.vram} · ${server.gpu.power}`}
            percent={server.gpu.v}
            sparklineData={server.gpu.hist}
            color={isHighMetric(server.gpu.v, 'gpu') ? 'amber' : tintColor.statusColor}
          />
        )}
      </div>

      <div className="server-card__footer">
        <div className="server-card__footer-item">
          <span className="server-card__footer-label">MODEL</span>
          <span className="server-card__footer-value">{server.model}</span>
        </div>
        <div className="server-card__footer-item">
          <span className="server-card__footer-label">TEMP</span>
          <span className="server-card__footer-value">{server.temp}</span>
        </div>
        <div className="server-card__footer-item">
          <span className="server-card__footer-label">LOAD</span>
          <span className="server-card__footer-value">{server.load}</span>
        </div>
        <div className="server-card__footer-item">
          <span className="server-card__footer-label">CONTAINERS</span>
          <span className="server-card__footer-value">{server.containers}</span>
        </div>
      </div>
    </div>
  );
};
