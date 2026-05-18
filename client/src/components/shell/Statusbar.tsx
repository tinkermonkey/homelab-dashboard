import { useState, useEffect, type ReactNode } from 'react';
import type { LAB_DATA } from '@homelab/shared';

export const useStatusbarContent = (clusterData?: LAB_DATA & { degraded?: string[] }): { left: ReactNode; right: ReactNode } => {
  const getInitialTicker = () => ({
    cpu: clusterData?.servers[0]?.cpu.v || 0,
    ping: clusterData?.gateway?.pingMs || 0,
    down: clusterData?.gateway?.downMbps || 0,
    up: clusterData?.gateway?.upMbps || 0,
  });

  const [ticker, setTicker] = useState(getInitialTicker);

  useEffect(() => {
    if (!clusterData) return;

    const interval = setInterval(() => {
      // Generate lively ticker values with slight jitter
      const baseCpu = clusterData.servers[0]?.cpu.v || 45;
      const basePing = clusterData.gateway?.pingMs || 25;
      const baseDown = clusterData.gateway?.downMbps || 125;
      const baseUp = clusterData.gateway?.upMbps || 85;

      const jitter = (base: number) => {
        const variance = Math.random() * 6 - 3; // -3 to +3
        return Math.max(0, Math.round(base + variance));
      };

      setTicker({
        cpu: jitter(baseCpu),
        ping: jitter(basePing),
        down: jitter(baseDown),
        up: jitter(baseUp),
      });
    }, 2200); // 2.2s polling

    return () => clearInterval(interval);
  }, [clusterData]);

  const getPrimaryAlert = () => {
    if (!clusterData?.servers || clusterData.servers.length === 0) {
      return null;
    }

    const warnServer = clusterData.servers.find((s) => s.status === 'warn');
    if (warnServer) {
      return `${warnServer.id.toUpperCase()} MEM ${Math.round(warnServer.mem.v)}%`;
    }

    return null;
  };

  const primaryAlert = getPrimaryAlert();
  const alertCount = clusterData?.cluster.activeAlerts || 0;

  const leftMetrics = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ fontSize: '11px', color: 'rgb(var(--shell-fg-2))' }}>
        Prometheus <span style={{ fontFamily: 'var(--font-mono)', color: 'rgb(var(--shell-fg-1))' }}>:9090</span>
      </div>
      <div style={{ fontSize: '11px', color: 'rgb(var(--shell-fg-2))' }}>
        4 hosts · 28 apps · 47 containers
      </div>
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
            <span style={{ fontFamily: 'var(--font-mono)', color: 'rgb(var(--shell-fg-1))' }}>
              {primaryAlert}
            </span>
          )}
        </div>
      )}
    </div>
  );

  const rightMetrics = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ fontSize: '11px', color: 'rgb(var(--shell-fg-2))' }}>
        <span style={{ fontFamily: 'var(--font-mono)', color: 'rgb(var(--shell-fg-1))' }}>
          ping {ticker.ping} ms
        </span>
      </div>
      <div style={{ fontSize: '11px', color: 'rgb(var(--shell-fg-2))' }}>
        <span style={{ fontFamily: 'var(--font-mono)', color: 'rgb(var(--shell-fg-1))' }}>
          ↓ {ticker.down} ↑ {ticker.up} Mbps
        </span>
      </div>
      <div style={{ fontSize: '11px', color: 'rgb(var(--shell-fg-2))' }}>
        <span style={{ fontFamily: 'var(--font-mono)', color: 'rgb(var(--shell-fg-1))' }}>
          cluster cpu {ticker.cpu}%
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'rgb(var(--shell-fg-2))' }}>
        <span style={{ color: 'rgb(var(--status-ok))' }}>✓</span>
        <span style={{ fontFamily: 'var(--font-mono)', color: 'rgb(var(--shell-fg-1))' }}>
          synced {clusterData?.cluster.lastSync || '14s ago'}
        </span>
      </div>
    </div>
  );

  return { left: leftMetrics, right: rightMetrics };
};
