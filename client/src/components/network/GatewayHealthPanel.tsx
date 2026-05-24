import React from 'react';
import { ProgressBar } from '@tinkermonkey/heimdall-ui';
import type { NETWORK_DATA } from '@homelab/shared';

interface GatewayHealthPanelProps {
  gateway: NETWORK_DATA['gateway'];
  statusFor?: string;
  wwwLatencyMs?: number;
  pingMs?: number;
}

function cpuColor(pct: number): 'emerald' | 'amber' | 'rose' {
  if (pct >= 90) return 'rose';
  if (pct >= 70) return 'amber';
  return 'emerald';
}

function memColor(pct: number): 'emerald' | 'amber' | 'rose' {
  if (pct >= 90) return 'rose';
  if (pct >= 80) return 'amber';
  return 'emerald';
}

export const GatewayHealthPanel: React.FC<GatewayHealthPanelProps> = ({
  gateway,
  statusFor,
  wwwLatencyMs,
  pingMs,
}) => {
  return (
    <>
      <div className="gateway-health__meters">
        <div className="gateway-health__meter">
          <div className="gateway-health__meter-header">
            <span className="gateway-health__meter-label">Router CPU</span>
            <span className="gateway-health__meter-value">{gateway.cpuPct.toFixed(1)}%</span>
          </div>
          <ProgressBar percent={gateway.cpuPct} color={cpuColor(gateway.cpuPct)} />
        </div>

        <div className="gateway-health__meter">
          <div className="gateway-health__meter-header">
            <span className="gateway-health__meter-label">Router Mem</span>
            <span className="gateway-health__meter-value">{gateway.memPct.toFixed(1)}%</span>
          </div>
          <ProgressBar percent={gateway.memPct} color={memColor(gateway.memPct)} />
        </div>
      </div>

      <div className="gateway-health__divider" />

      <div className="gateway-health__stats">
        {statusFor && (
          <div className="gateway-health__stat">
            <span className="gateway-health__stat-label">Uptime</span>
            <span className="gateway-health__stat-value">{statusFor}</span>
          </div>
        )}
        {pingMs != null && (
          <div className="gateway-health__stat">
            <span className="gateway-health__stat-label">WAN Ping</span>
            <span className="gateway-health__stat-value">{pingMs} ms</span>
          </div>
        )}
        {wwwLatencyMs != null && (
          <div className="gateway-health__stat">
            <span className="gateway-health__stat-label">WWW Latency</span>
            <span className="gateway-health__stat-value">{wwwLatencyMs} ms</span>
          </div>
        )}
      </div>
    </>
  );
};
