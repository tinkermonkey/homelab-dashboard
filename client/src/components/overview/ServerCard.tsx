import React from 'react';
import type { Server } from '@homelab/shared';
import { Sparkline } from './Sparkline';
import './ServerCard.css';

interface ServerCardProps {
  server: Server;
}

interface MetricRowProps {
  label: string;
  value: number;
  display: string;
  hist: number[];
  metric: string;
  tintColor: string;
  isHighMetric: (value: number, metric: string) => boolean;
}

const HOST_TINTS: Record<string, string> = {
  nyx: 'rgb(var(--host-nyx-tint))',
  helios: 'rgb(var(--host-helios-tint))',
  aether: 'rgb(var(--host-aether-tint))',
  vega: 'rgb(var(--host-vega-tint))',
};

const STATUS_COLORS: Record<string, string> = {
  ok: 'rgb(var(--status-ok))',
  warn: 'rgb(var(--status-warn))',
  err: 'rgb(var(--status-error))',
};

const getStatusColor = (status: string) => STATUS_COLORS[status] || STATUS_COLORS.ok;
const getTintColor = (hostId: string) => HOST_TINTS[hostId] || HOST_TINTS.nyx;

const MetricRow: React.FC<MetricRowProps> = ({
  label,
  value,
  display,
  hist,
  metric,
  tintColor,
  isHighMetric,
}) => {
  const isHigh = isHighMetric(value, metric);
  const barColor = isHigh ? 'rgb(var(--status-warn))' : tintColor;

  return (
    <div className="server-card__metric-row">
      <div className="server-card__metric-label">{label}</div>
      <div className="server-card__metric-bar-container">
        <div
          className="server-card__metric-bar"
          style={{
            width: `${value}%`,
            backgroundColor: barColor,
            opacity: isHigh ? 1 : 0.7,
          }}
        />
      </div>
      <div className="server-card__metric-value">{display}</div>
      <div className="server-card__sparkline">
        <Sparkline data={hist} width={40} height={18} color={tintColor} areaColor={tintColor} />
      </div>
    </div>
  );
};

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
          style={{ backgroundColor: tintColor + '20', borderColor: tintColor + '50' }}
        >
          <span style={{ color: tintColor, fontWeight: 600 }}>{server.mark}</span>
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
          value={server.cpu.v}
          display={`${server.cpu.v}%`}
          hist={server.cpu.hist}
          metric="cpu"
          tintColor={tintColor}
          isHighMetric={isHighMetric}
        />
        <MetricRow
          label="MEM"
          value={server.mem.v}
          display={`${server.mem.used} / ${server.mem.total} ${server.mem.unit}`}
          hist={server.mem.hist}
          metric="mem"
          tintColor={tintColor}
          isHighMetric={isHighMetric}
        />
        <MetricRow
          label="DISK"
          value={server.disk.v}
          display={`${server.disk.used} / ${server.disk.total} ${server.disk.unit}`}
          hist={server.disk.hist}
          metric="disk"
          tintColor={tintColor}
          isHighMetric={isHighMetric}
        />
        <MetricRow
          label="NET"
          value={server.net.v}
          display={`↓${server.net.down} ↑${server.net.up} ${server.net.unit}`}
          hist={server.net.hist}
          metric="net"
          tintColor={tintColor}
          isHighMetric={isHighMetric}
        />
        {server.gpu && (
          <MetricRow
            label="GPU"
            value={server.gpu.v}
            display={`${server.gpu.vram} · ${server.gpu.power}`}
            hist={server.gpu.hist}
            metric="gpu"
            tintColor={tintColor}
            isHighMetric={isHighMetric}
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
