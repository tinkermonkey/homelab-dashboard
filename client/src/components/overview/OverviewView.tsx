import React, { useState } from 'react';
import type { LAB_DATA, AlertSeverity } from '@homelab/shared';
import { AlertStrip, PageHeader, StatGrid, StatTile } from '@tinkermonkey/heimdall-ui';
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

function mapSeverity(severity: AlertSeverity): 'error' | 'warn' | 'info' | 'success' {
  const severityMap: Record<AlertSeverity, 'error' | 'warn' | 'info'> = {
    critical: 'error',
    warning: 'warn',
    info: 'info',
  };
  return severityMap[severity];
}

export const OverviewView: React.FC<OverviewViewProps> = ({ data, showAlerts = true }) => {
  const { data: alertsData } = useAlerts();
  const alerts = alertsData?.alerts ?? [];
  const alertsSource = alertsData?.source;
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const handleDismissAlert = (alertId: string) => {
    setDismissedIds(prev => new Set([...prev, alertId]));
  };

  const visibleAlerts = alerts.filter(alert => !dismissedIds.has(`${alert.name}-${alert.severity}`));

  return (
    <div className="overview-view">
      {/* Page Header */}
      <PageHeader
        eyebrow={`${data.cluster.location} · last sync ${data.cluster.lastSync}`}
        idChip={data.cluster.name}
        title="Overview"
        subtitle="Resource state across hosts, gateway health, and deployed services. All systems polled every 15 s."
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn--sm btn--ghost" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Icon name="refresh" size={13} />
              Refresh
            </button>
            <button className="btn btn--sm btn--primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Icon name="bot" size={13} />
              Ask lab-bot
            </button>
          </div>
        }
      />

      {/* Degradation Banner */}
      <DegradationBanner degraded={data.degraded} />

      {/* Alerts Strip */}
      {showAlerts && (
        <>
          {(alertsSource === 'mock' || alertsSource === 'unavailable') && (
            <AlertStrip
              alerts={[
                {
                  id: 'alerts-unavailable',
                  severity: 'warn',
                  message: 'Alert service unavailable.',
                },
              ]}
              style={{ marginBottom: '12px' }}
            />
          )}
          <AlertStrip
            alerts={visibleAlerts.map(alert => ({
              id: `${alert.name}-${alert.severity}`,
              severity: mapSeverity(alert.severity),
              message: alert.state ? `${alert.name} — ${alert.state}` : alert.name,
            }))}
            onDismiss={handleDismissAlert}
          />
        </>
      )}

      {/* Cluster Stats */}
      <StatGrid columns={4}>
        <StatTile
          color="cyan"
          label="Clients Online"
          value={data.gateway.clientsTotal ?? '—'}
          delta={data.gateway.clientsTotal != null ? {
            value: data.gateway.clientsTotal,
            label: 'connected',
          } : undefined}
        />
        <StatTile
          color="amber"
          label="Active Alerts"
          value={data.cluster.activeAlerts}
        />
        <StatTile
          color="violet"
          label="Egress Today"
          value={`${data.cluster.egressTodayGB.toFixed(1)}GB`}
          delta={{
            value: Math.abs(data.cluster.egressDelta),
            direction: data.cluster.egressDelta < 0 ? 'down' : 'up',
            label: '%',
          }}
        />
        <StatTile
          color="emerald"
          label="Cluster Uptime"
          value={`${data.cluster.uptimeDays}d`}
          delta={{
            value: data.cluster.uptimeHours,
            label: `${data.cluster.uptimeHours}h`,
          }}
        />
      </StatGrid>

      {/* Server Cards */}
      <div className="server-grid">
        {data.servers.map(server => (
          <ServerCard key={server.id} server={server} />
        ))}
      </div>

      {/* Gateway Panel */}
      <GatewayPanel gateway={data.gateway} />

      {/* Apps Section */}
      <AppsSection apps={data.apps} />
    </div>
  );
};
