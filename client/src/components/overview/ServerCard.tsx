import React from 'react';
import type { Server } from '@homelab/shared';
import { MetricRow } from '@tinkermonkey/heimdall-ui';
import type { StatusColor } from '@tinkermonkey/heimdall-ui';

interface ServerCardProps {
  server: Server;
}

const ROLE_STATUS_COLOR: Record<Server['role'], StatusColor> = {
  compute: 'cyan',
  storage: 'emerald',
  k8s: 'violet',
  gpu: 'amber',
};

const STATUS_PULSE: Record<Server['status'], string> = {
  ok: 'emerald',
  warn: 'amber',
  err: 'rose',
};

const getMetricThreshold = (metric: string) => {
  const thresholds: Record<string, number> = { cpu: 80, mem: 80, disk: 80, net: 90, gpu: 90 };
  return thresholds[metric] ?? 80;
};

const isHighMetric = (value: number, metric: string) => value >= getMetricThreshold(metric);

export const ServerCard: React.FC<ServerCardProps> = ({ server }) => {
  const roleColor = ROLE_STATUS_COLOR[server.role] ?? 'cyan';
  const pulseClass = STATUS_PULSE[server.status] ?? 'emerald';

  return (
    <div className="server-card">
      <header className="server-head">
        <div className="role-mark" data-role={server.role}>
          {server.mark}
        </div>
        <div className="server-head-main">
          <div className="server-name">
            {server.hostname}
            <span className={`pulse sm ${pulseClass}`} />
          </div>
          <div className="server-sub">{server.ip}</div>
        </div>
        <div className="server-head-right">
          <span className="k">UPTIME</span>
          <span className="v">{server.uptime}</span>
        </div>
      </header>

      <div className="metric-rows">
        <MetricRow
          label="CPU"
          value={`${server.cpu.v}%`}
          percent={server.cpu.v}
          sparklineData={server.cpu.hist}
          color={isHighMetric(server.cpu.v, 'cpu') ? 'amber' : roleColor}
        />
        <MetricRow
          label="MEM"
          value={`${server.mem.used} / ${server.mem.total}`}
          unit={server.mem.unit}
          percent={server.mem.v}
          sparklineData={server.mem.hist}
          color={isHighMetric(server.mem.v, 'mem') ? 'amber' : roleColor}
        />
        <MetricRow
          label="DISK"
          value={`${server.disk.used} / ${server.disk.total}`}
          unit={server.disk.unit}
          percent={server.disk.v}
          sparklineData={server.disk.hist}
          color={isHighMetric(server.disk.v, 'disk') ? 'amber' : roleColor}
        />
        <MetricRow
          label="NET"
          value={`↓${server.net.down} ↑${server.net.up}`}
          unit={server.net.unit}
          percent={server.net.v}
          sparklineData={server.net.hist}
          color={isHighMetric(server.net.v, 'net') ? 'amber' : roleColor}
        />
        {server.gpu && (
          <MetricRow
            label="GPU"
            value={`${server.gpu.vram} · ${server.gpu.power}`}
            percent={server.gpu.v}
            sparklineData={server.gpu.hist}
            color={isHighMetric(server.gpu.v, 'gpu') ? 'amber' : roleColor}
          />
        )}
      </div>

      <footer className="server-foot">
        <div><span className="k">MODEL</span><span className="v">{server.model}</span></div>
        <div><span className="k">TEMP</span><span className="v">{server.temp}</span></div>
        <div><span className="k">LOAD</span><span className="v">{server.load}</span></div>
        <div><span className="k">CONTAINERS</span><span className="v">{server.containers}</span></div>
      </footer>
    </div>
  );
};
