import React, { useState } from 'react';
import type { LAB_DATA } from '@homelab/shared';
import { AlertStrip } from '@tinkermonkey/heimdall-ui';
import { Icon } from '../shared/Icon';
import { useAlerts } from '../../hooks/useAPI';
import { ServerCard } from './ServerCard';
import { DegradationBanner } from '../shared/DegradationBanner';
import { GatewayPanel } from './GatewayPanel';
import { AppsSection } from './AppsSection';
import './OverviewView.css';

interface OverviewViewProps {
  data: LAB_DATA & { degraded?: string[] };
  showAlerts?: boolean;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ data, showAlerts = true }) => {
  const { data: alertsData } = useAlerts();
  const alerts = alertsData?.alerts ?? [];
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const handleDismissAlert = (alertId: string) => {
    setDismissedIds(prev => new Set([...prev, alertId]));
  };

  const visibleAlerts = alerts.filter(alert => !dismissedIds.has(`${alert.name}-${alert.severity}`));

  return (
    <div className="overview-view">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header__main">
          <div className="page-header__breadcrumb">
            <span className="breadcrumb-chip">
              <span className="breadcrumb-dot" />
              cluster · {data.cluster.name}
            </span>
            <span className="breadcrumb-meta">
              {data.cluster.location} · last sync {data.cluster.lastSync}
            </span>
          </div>
          <h1 className="page-header__title">Overview</h1>
          <p className="page-header__subtitle">
            Resource state across hosts, gateway health, and deployed services. All systems polled every 15 s.
          </p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--sm btn--ghost" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Icon name="refresh" size={13} />
            Refresh
          </button>
          <button className="btn btn--sm btn--primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Icon name="bot" size={13} />
            Ask lab-bot
          </button>
        </div>
      </div>

      {/* Degradation Banner */}
      <DegradationBanner degraded={data.degraded} />

      {/* Alerts Strip */}
      {showAlerts && (
        <AlertStrip
          alerts={visibleAlerts.map(alert => ({
            id: `${alert.name}-${alert.severity}`,
            severity: (alert.severity === 'critical' ? 'error' : alert.severity === 'warning' ? 'warn' : 'info') as 'error' | 'warn' | 'info' | 'success',
            message: alert.state ? `${alert.name} — ${alert.state}` : alert.name,
          }))}
          onDismiss={handleDismissAlert}
        />
      )}

      {/* Cluster Stats */}
      <div className="cluster-stats">
        <div className="stat-tile stat-tile--cyan">
          <div className="stat-tile__label">Power Draw</div>
          <div className="stat-tile__value">{data.cluster.powerDraw}W</div>
          <div className="stat-tile__meta">
            avg <span className="stat-tile__label-secondary">{data.cluster.powerAvg}W</span>
          </div>
        </div>
        <div className="stat-tile stat-tile--amber">
          <div className="stat-tile__label">Active Alerts</div>
          <div className="stat-tile__value">{data.cluster.activeAlerts}</div>
        </div>
        <div className="stat-tile stat-tile--violet">
          <div className="stat-tile__label">Egress Today</div>
          <div className="stat-tile__value">{data.cluster.egressTodayGB.toFixed(1)}GB</div>
          <div className="stat-tile__meta">
            <span className={`stat-tile__delta ${data.cluster.egressDelta < 0 ? 'stat-tile__delta--down' : 'stat-tile__delta--up'}`}>
              {data.cluster.egressDelta > 0 ? '+' : ''}{data.cluster.egressDelta}%
            </span>
          </div>
        </div>
        <div className="stat-tile stat-tile--emerald">
          <div className="stat-tile__label">Cluster Uptime</div>
          <div className="stat-tile__value">{data.cluster.uptimeDays}d</div>
          <div className="stat-tile__meta">
            <span className="stat-tile__label-secondary">{data.cluster.uptimeHours}h</span>
          </div>
        </div>
      </div>

      {/* Server Cards */}
      <div className="servers-section">
        <h2 className="section-title">Servers</h2>
        <div className="servers-grid">
          {data.servers.map(server => (
            <ServerCard key={server.id} server={server} />
          ))}
        </div>
      </div>

      {/* Gateway Panel */}
      <div style={{ marginTop: '24px' }}>
        <GatewayPanel gateway={data.gateway} />
      </div>

      {/* Apps Section */}
      <div style={{ marginTop: '24px' }}>
        <AppsSection apps={data.apps} />
      </div>
    </div>
  );
};
