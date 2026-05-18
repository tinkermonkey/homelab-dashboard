import React from 'react';
import type { LAB_DATA } from '@homelab/shared';
import { usePersistedState } from '../../utils/localStorage';
import { getIconSvgPath } from '../../utils/icons';
import { ServerCard } from './ServerCard';
import { AlertsStrip } from './AlertsStrip';
import { GatewayPanel } from './GatewayPanel';
import { AppsSection } from './AppsSection';
import './OverviewView.css';

interface IconProps {
  name: string;
  size?: number;
}

const Icon: React.FC<IconProps> = ({ name, size = 24 }) => {
  const pathData = getIconSvgPath(name);
  if (!pathData) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g dangerouslySetInnerHTML={{ __html: pathData }} />
    </svg>
  );
};

interface OverviewViewProps {
  data: LAB_DATA;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ data }) => {
  const [showAlerts] = usePersistedState('showAlerts', true);

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

      {/* Alerts Strip */}
      {showAlerts && data.cluster.activeAlerts > 0 && (
        <AlertsStrip activeAlerts={data.cluster.activeAlerts} />
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
