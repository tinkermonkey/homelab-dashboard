import React from 'react';
import type { Gateway } from '@homelab/shared';
import { GatewayChart } from './GatewayChart';
import './GatewayPanel.css';

interface GatewayPanelProps {
  gateway: Gateway;
}

const STATUS_COLORS: Record<string, string> = {
  online: 'rgb(var(--status-ok))',
  degraded: 'rgb(var(--status-warn))',
  offline: 'rgb(var(--status-error))',
};

export const GatewayPanel: React.FC<GatewayPanelProps> = ({ gateway }) => {
  const statusColor = STATUS_COLORS[gateway.status] || STATUS_COLORS.online;

  return (
    <div className="gateway-panel">
      <div className="gateway-panel__header">
        <div className="gateway-panel__title-block">
          <h3 className="gateway-panel__title">Gateway</h3>
          <div className="gateway-panel__status">
            <span
              className="gateway-panel__status-dot"
              style={{ backgroundColor: statusColor }}
            />
            <span className="gateway-panel__status-text">{gateway.status.toUpperCase()}</span>
          </div>
        </div>
      </div>

      <div className="gateway-panel__content">
        <div className="gateway-panel__info-grid">
          <div className="gateway-panel__info-item">
            <span className="gateway-panel__label">ISP</span>
            <span className="gateway-panel__value">{gateway.isp}</span>
          </div>
          <div className="gateway-panel__info-item">
            <span className="gateway-panel__label">PLAN</span>
            <span className="gateway-panel__value">{gateway.plan}</span>
          </div>
          <div className="gateway-panel__info-item">
            <span className="gateway-panel__label">PUBLIC IP</span>
            <span className="gateway-panel__value monospace">{gateway.publicIp}</span>
          </div>
          <div className="gateway-panel__info-item">
            <span className="gateway-panel__label">LOCATION</span>
            <span className="gateway-panel__value">{gateway.geo}</span>
          </div>
          <div className="gateway-panel__info-item">
            <span className="gateway-panel__label">HOSTNAME</span>
            <span className="gateway-panel__value monospace">{gateway.hostname}</span>
          </div>
          <div className="gateway-panel__info-item">
            <span className="gateway-panel__label">ASN</span>
            <span className="gateway-panel__value monospace">{gateway.asn}</span>
          </div>
          <div className="gateway-panel__info-item">
            <span className="gateway-panel__label">WAN INTERFACE</span>
            <span className="gateway-panel__value monospace">{gateway.wanIf}</span>
          </div>
          <div className="gateway-panel__info-item">
            <span className="gateway-panel__label">UPTIME</span>
            <span className="gateway-panel__value">{gateway.statusFor}</span>
          </div>
        </div>

        <div className="gateway-panel__divider" />

        <div className="gateway-panel__charts">
          <GatewayChart
            downHist={gateway.downHist}
            upHist={gateway.upHist}
            pingHist={gateway.pingHist}
            currentDown={gateway.downMbps}
            currentUp={gateway.upMbps}
            currentPing={gateway.pingMs}
          />
        </div>

        <div className="gateway-panel__quality-section">
          <div className="gateway-panel__quality-stats">
            <div className="gateway-panel__quality-item">
              <span className="gateway-panel__quality-label">JITTER</span>
              <span className="gateway-panel__quality-value">±{gateway.jitterMs} ms</span>
            </div>
            <div className="gateway-panel__quality-item">
              <span className="gateway-panel__quality-label">PACKET LOSS</span>
              <span className="gateway-panel__quality-value">{gateway.lossPct.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        <div className="gateway-panel__divider" />

        <div className="gateway-panel__stats-strip">
          <div className="gateway-panel__stat">
            <span className="gateway-panel__stat-label">EGRESS TODAY</span>
            <span className="gateway-panel__stat-value">{gateway.egressTodayGB.toFixed(1)} GB</span>
          </div>
          <div className="gateway-panel__stat">
            <span className="gateway-panel__stat-label">INGRESS TODAY</span>
            <span className="gateway-panel__stat-value">{gateway.ingressTodayGB.toFixed(1)} GB</span>
          </div>
          <div className="gateway-panel__stat">
            <span className="gateway-panel__stat-label">EGRESS MONTH</span>
            <span className="gateway-panel__stat-value">{gateway.egressMonthTB.toFixed(2)} TB</span>
          </div>
          <div className="gateway-panel__stat">
            <span className="gateway-panel__stat-label">DNS BLOCKED</span>
            <span className="gateway-panel__stat-value">{gateway.blockedPct}%</span>
          </div>
          <div className="gateway-panel__stat">
            <span className="gateway-panel__stat-label">DNS RESOLVED</span>
            <span className="gateway-panel__stat-value">{gateway.dnsResolved.toLocaleString()}</span>
          </div>
          <div className="gateway-panel__stat">
            <span className="gateway-panel__stat-label">VPN PEERS</span>
            <span className="gateway-panel__stat-value">{gateway.vpnPeersActive} / {gateway.vpnPeers}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
