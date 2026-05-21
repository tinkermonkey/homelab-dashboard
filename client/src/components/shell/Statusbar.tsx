import { type ReactNode } from 'react';
import { Icon as HeimdallIcon } from '@tinkermonkey/heimdall-ui';
import type { LAB_DATA } from '@homelab/shared';
import { useStatus } from '../../hooks/useAPI';

const metricsItemStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'rgb(var(--shell-fg-2))',
};

const monoStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  color: 'rgb(var(--shell-fg-1))',
};

export const useStatusbarContent = (clusterData?: LAB_DATA & { degraded?: string[] }): { left: ReactNode; right: ReactNode } => {
  const { data: statusData } = useStatus();

  const getPrimaryAlert = () => {
    if (!clusterData?.servers || clusterData.servers.length === 0) return null;
    const warnServer = clusterData.servers.find((s) => s.status === 'warn');
    if (warnServer) return `${warnServer.id.toUpperCase()} MEM ${Math.round(warnServer.mem.v)}%`;
    return null;
  };

  const primaryAlert = getPrimaryAlert();
  const alertCount = clusterData?.cluster.activeAlerts ?? 0;
  const hostCount = clusterData?.servers.length ?? 0;
  const appCount = clusterData?.apps.length ?? 0;
  const containerCount = clusterData?.servers.reduce((sum, s) => sum + s.containers, 0) ?? 0;

  const downMbps = statusData?.downMbps ?? 0;
  const upMbps = statusData?.upMbps ?? 0;
  const cpu = statusData?.cpu ?? 0;

  const leftMetrics = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={metricsItemStyle}>
        <span className="pulse" style={{
          display: 'inline-block',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: 'rgb(var(--status-ok))',
          marginRight: '6px',
        }} />
        Prometheus <span style={monoStyle}>:9090</span>
      </div>
      {hostCount > 0 && (
        <div style={metricsItemStyle}>
          {hostCount} host{hostCount > 1 ? 's' : ''} · {appCount} app{appCount !== 1 ? 's' : ''} · {containerCount} container{containerCount !== 1 ? 's' : ''}
        </div>
      )}
      {alertCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'rgb(var(--status-warn))',
            }}
          />
          <span style={{ color: 'rgb(var(--shell-fg-1))' }}>
            {alertCount} alert{alertCount !== 1 ? 's' : ''} open
          </span>
          {primaryAlert && (
            <span style={monoStyle}>
              {primaryAlert}
            </span>
          )}
        </div>
      )}
    </div>
  );

  const rightMetrics = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={metricsItemStyle}>
        <span style={monoStyle}>
          ↓ {downMbps} ↑ {upMbps} Mbps
        </span>
      </div>
      <div style={metricsItemStyle}>
        <span style={monoStyle}>
          cluster cpu {cpu}%
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'rgb(var(--shell-fg-2))' }}>
        <span style={{ color: 'rgb(var(--status-ok))' }}>
          <HeimdallIcon name="check" size={11} />
        </span>
        <span style={monoStyle}>
          synced {clusterData?.cluster.lastSync || '—'}
        </span>
      </div>
    </div>
  );

  return { left: leftMetrics, right: rightMetrics };
};
