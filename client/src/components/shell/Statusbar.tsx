import React, { useState, useEffect } from 'react';

interface StatusbarProps {
  clusterData?: any;
}

export const Statusbar: React.FC<StatusbarProps> = ({ clusterData }) => {
  const [ticker, setTicker] = useState({
    cpu: 0,
    ping: 0,
    down: 0,
    up: 0,
  });

  useEffect(() => {
    if (!clusterData) return;

    const interval = setInterval(() => {
      // Generate lively ticker values with slight jitter
      const baseCpu = clusterData.servers[0]?.cpu || 45;
      const basePing = clusterData.gateway?.ping || 25;
      const baseDown = clusterData.gateway?.down || 125;
      const baseUp = clusterData.gateway?.up || 85;

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

    // Set initial values immediately
    if (clusterData.servers[0]) {
      setTicker({
        cpu: clusterData.servers[0].cpu || 0,
        ping: clusterData.gateway?.ping || 0,
        down: clusterData.gateway?.down || 0,
        up: clusterData.gateway?.up || 0,
      });
    }

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
          Cluster: <span style={{ color: 'rgb(var(--status-ok))', fontWeight: 500 }}>OK</span>
        </div>
      </div>
    </div>
  );
};
