import React from 'react';
import type { Server } from '@homelab/shared';
import { Panel, MetricRow } from '@tinkermonkey/heimdall-ui';
import { ROLE_COLOR, getInitials, cpuTone, memTone, diskTone } from '../../utils/hostUtils';

interface HostCardProps {
  server: Server;
}

export const HostCard: React.FC<HostCardProps> = ({ server }) => {
  const statusTone = server.status === 'warn' ? 'amber' : server.status === 'err' ? 'rose' : 'emerald';

  return (
    <Panel className="panel-flush">
      <div className="srv-head">
        <div className="role-mark role-mark--lg" data-role={server.role}>
          {getInitials(server.id)}
        </div>
        <div className="srv-head__main">
          <span className="srv-head__name">
            {server.id}
            <span className={`pulse-dot pulse-dot--${statusTone} pulse-dot--sm`} />
          </span>
          <span className="srv-head__sub">{server.hostname} · {server.ip}</span>
        </div>
        <div className="srv-head__right">
          <span className="k">uptime</span>
          <span className="v">{server.uptime}</span>
        </div>
      </div>

      <div className="srv-body">
        <MetricRow
          label="CPU"
          value={server.cpu.v}
          unit="%"
          percent={server.cpu.v}
          color={cpuTone(server.cpu.v)}
          sparklineData={server.cpu.hist}
        />
        <MetricRow
          label="MEM"
          value={`${server.mem.used}/${server.mem.total}`}
          unit={server.mem.unit}
          percent={server.mem.v}
          color={memTone(server.mem.v)}
          sparklineData={server.mem.hist}
        />
        <MetricRow
          label="DISK"
          value={`${server.disk.used}/${server.disk.total}`}
          unit={server.disk.unit}
          percent={server.disk.v}
          color={diskTone(server.disk.v)}
          sparklineData={server.disk.hist}
        />
        <MetricRow
          label="NET"
          value={`↓${server.net.down} ↑${server.net.up}`}
          unit={server.net.unit}
          percent={Math.min(100, server.net.v * 2)}
          color={ROLE_COLOR[server.role]}
          sparklineData={server.net.hist}
        />
        {server.gpu && (
          <MetricRow
            label="GPU"
            value={server.gpu.v}
            unit={`% · ${server.gpu.vram}`}
            percent={server.gpu.v}
            color={server.gpu.v >= 90 ? 'rose' : 'amber'}
            sparklineData={server.gpu.hist}
          />
        )}
      </div>

      <div className="srv-foot">
        <div>
          <span className="k">model</span>
          <span className="v">{server.model.split(' · ')[0]}</span>
        </div>
        <div>
          <span className="k">temp</span>
          <span className={`v${parseInt(server.temp) >= 72 ? ' warn' : ''}`}>{server.temp}</span>
        </div>
        <div>
          <span className="k">load</span>
          <span className="v">{server.load}</span>
        </div>
        <div>
          <span className="k">containers</span>
          <span className="v">{server.containers}</span>
        </div>
      </div>
    </Panel>
  );
};
