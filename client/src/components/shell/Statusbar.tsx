import React, { useState, useEffect } from 'react';
import type { LAB_DATA } from '@homelab/shared';

interface StatusbarProps {
  clusterData?: LAB_DATA;
}

export const Statusbar: React.FC<StatusbarProps> = ({ clusterData }) => {
  const getInitialTicker = () => ({
    cpu: clusterData?.servers[0]?.cpu.v || 0,
    ping: clusterData?.gateway?.pingMs || 0,
    down: clusterData?.gateway?.downMbps || 0,
    up: clusterData?.gateway?.upMbps || 0,
  });

  const [ticker, setTicker] = useState(getInitialTicker);

  const getClusterStatus = () => {
    if (!clusterData) return { status: 'unknown', color: 'rgb(var(--shell-fg-2))' };

    // Check for degraded services
    if ((clusterData as any).degraded && (clusterData as any).degraded.length > 0) {
      return { status: 'degraded', color: 'rgb(var(--status-warn))' };
    }

    // Check for servers with error status
    const hasErrors = clusterData.servers?.some((s: any) => s.status === 'error' || s.status === 'failed');
    if (hasErrors) {
      return { status: 'error', color: 'rgb(var(--status-error))' };
    }

    // Default to OK
    return { status: 'OK', color: 'rgb(var(--status-ok))' };
  };

  const { status, color } = getClusterStatus();

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

  return (
    <div className="statusbar">
      <div className="statusbar__slot statusbar__slot--left">
        <div style={{ fontSize: '11px', color: 'rgb(var(--shell-fg-2))' }}>
          CPU: <span style={{ fontFamily: 'var(--font-mono)', color: 'rgb(var(--shell-fg-1))' }}>{ticker.cpu}%</span>
        </div>
        <div style={{ fontSize: '11px', color: 'rgb(var(--shell-fg-2))' }}>
          Ping: <span style={{ fontFamily: 'var(--font-mono)', color: 'rgb(var(--shell-fg-1))' }}>{ticker.ping}ms</span>
        </div>
      </div>

      <div className="statusbar__slot statusbar__slot--right">
        <div style={{ fontSize: '11px', color: 'rgb(var(--shell-fg-2))' }}>
          ↓ <span style={{ fontFamily: 'var(--font-mono)', color: 'rgb(var(--shell-fg-1))' }}>{ticker.down}</span>
          <span style={{ color: 'rgb(var(--shell-fg-3))', margin: '0 6px' }}>|</span>
          ↑ <span style={{ fontFamily: 'var(--font-mono)', color: 'rgb(var(--shell-fg-1))' }}>{ticker.up}</span>
          <span style={{ color: 'rgb(var(--shell-fg-3))', margin: '0 6px' }}>|</span>
          Cluster: <span style={{ color, fontWeight: 500 }}>{status}</span>
        </div>
      </div>
    </div>
  );
};
