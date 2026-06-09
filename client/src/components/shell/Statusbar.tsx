import React, { useEffect, useState } from 'react';
import { Icon } from '../shared/Icon';
import type { LAB_DATA } from '@homelab/shared';
import { useStatus } from '../../hooks/useAPI';

interface StatusbarProps {
  clusterData?: LAB_DATA & { degraded?: string[] };
}

export const Statusbar: React.FC<StatusbarProps> = ({ clusterData }) => {
  const { data: statusData } = useStatus();
  const [, setTick] = useState(0);

  // ~2.2s liveness tick forces re-render for live numbers
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 2200);
    return () => clearInterval(id);
  }, []);

  const alertCount = clusterData?.cluster?.activeAlerts ?? 0;
  const hostCount = clusterData?.servers?.length ?? 0;
  const appCount = clusterData?.apps?.length ?? 0;
  const containerCount = clusterData?.servers?.reduce((sum, s) => sum + s.containers, 0) ?? 0;

  const primaryAlert = (() => {
    if (!clusterData?.servers?.length) return null;
    const warnServer = clusterData.servers.find(s => s.status === 'warn');
    if (warnServer) return `${warnServer.id.toUpperCase()} MEM ${Math.round(warnServer.mem.v)}%`;
    return null;
  })();

  const downMbps = statusData?.downMbps ?? 0;
  const upMbps = statusData?.upMbps ?? 0;
  const cpu = statusData?.cpu ?? 0;
  const ping = statusData?.ping ?? 0;

  return (
    <footer className="statusbar">
      {/* Left group */}
      <div className="statusbar-group">
        <div className="sb-item">
          <span className="pulse emerald xs" />
          prometheus<strong className="strong">:9090</strong>
        </div>

        {hostCount > 0 && (
          <>
            <span className="sb-divider" />
            <div className="sb-item">
              <strong className="strong">{hostCount}</strong> host{hostCount !== 1 ? 's' : ''}&ensp;·&ensp;
              <strong className="strong">{appCount}</strong> app{appCount !== 1 ? 's' : ''}&ensp;·&ensp;
              <strong className="strong">{containerCount}</strong> container{containerCount !== 1 ? 's' : ''}
            </div>
          </>
        )}

        {alertCount > 0 && (
          <>
            <span className="sb-divider" />
            <div className="sb-item">
              <span className="pulse amber xs" />
              <strong className="strong">{alertCount}</strong> alert{alertCount !== 1 ? 's' : ''} open
              {primaryAlert && <>&ensp;·&ensp;<strong className="strong">{primaryAlert}</strong></>}
            </div>
          </>
        )}
      </div>

      {/* Right group */}
      <div className="statusbar-group">
        <div className="sb-item">
          ping&ensp;<strong className="strong">{ping} ms</strong>
        </div>

        <span className="sb-divider" />

        <div className="sb-item">
          ↓&ensp;<strong className="strong">{downMbps}</strong>&ensp;↑&ensp;<strong className="strong">{upMbps}</strong>&ensp;Mbps
        </div>

        <span className="sb-divider" />

        <div className="sb-item">
          cluster cpu&ensp;<strong className="strong">{cpu}%</strong>
        </div>

        <span className="sb-divider" />

        <div className="sb-item">
          <Icon name="check" size={10} />
          &ensp;synced&ensp;<strong className="strong">{clusterData?.cluster?.lastSync ?? '—'}</strong>
        </div>
      </div>
    </footer>
  );
};
