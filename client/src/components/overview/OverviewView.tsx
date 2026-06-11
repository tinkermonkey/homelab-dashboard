import React, { useState } from 'react';
import type { LAB_DATA, AlertSeverity } from '@homelab/shared';
import { AlertStrip, PageHeader, StatGrid, StatTile, Chip, Button } from '@tinkermonkey/heimdall-ui';
import { Icon } from '@tinkermonkey/heimdall-ui';
import { useAlerts } from '../../hooks/useAPI';
import { HostCard } from './HostCard';
import { GatewayPanel } from './GatewayPanel';
import { AppsPanel } from './AppsPanel';
import { asEyebrow } from '../../utils/pageHeader';

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
  const { data: alertsData, error: alertsError } = useAlerts();
  const alerts = alertsData?.alerts ?? [];
  const alertsSource = alertsData?.source;
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const handleDismissAlert = (alertId: string) => {
    setDismissedIds(prev => new Set([...prev, alertId]));
  };

  const visibleAlerts = alerts.filter(alert => !dismissedIds.has(`${alert.name}-${alert.severity}`));

  const powerDelta = data.cluster.powerDraw - data.cluster.powerAvg;

  return (
    <div className="overview-view">
      <PageHeader
        eyebrow={asEyebrow(
          <span className="eyebrow-row">
            <Chip variant="amber">cluster · {data.cluster.name}</Chip>
            <span className="mono-meta">{data.cluster.location} · last sync {data.cluster.lastSync}</span>
          </span>
        )}
        idChip={`/cluster/${data.cluster.name.toLowerCase()}`}
        title="Overview"
        subtitle="Resource state across hosts, gateway health, and deployed services. All systems polled every 15 s."
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm">
              <Icon name="reload" size={13} />
              Refresh
            </Button>
            <Button variant="primary" size="sm">
              <Icon name="bot" size={13} />
              Ask lab-bot
            </Button>
          </div>
        }
      />

      {data.degraded && data.degraded.length > 0 && (
        <AlertStrip
          alerts={[{ id: 'degradation', severity: 'warn', message: `Partial Data: ${data.degraded.join(', ')} are temporarily unavailable. Showing cached data.` }]}
          style={{ marginBottom: '24px' }}
        />
      )}

      {showAlerts && (
        <>
          {(alertsError || alertsSource === 'mock' || alertsSource === 'unavailable') && (
            <AlertStrip
              alerts={[{ id: 'alerts-unavailable', severity: 'warn', message: 'Alert service unavailable.' }]}
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

      <StatGrid columns={4}>
        <StatTile
          color="cyan"
          label="Power draw"
          value={`${data.cluster.powerDraw} W`}
          delta={{ value: Math.abs(powerDelta), direction: powerDelta >= 0 ? 'up' : 'down', label: 'vs 7d avg' }}
          sparkData={data.servers[0]?.cpu.hist}
        />
        <StatTile
          color="amber"
          label="Active alerts"
          value={data.cluster.activeAlerts}
          meta="check alertmanager"
          metaIcon="alert"
        />
        <StatTile
          color="violet"
          label="Egress today"
          value={`${data.cluster.egressTodayGB.toFixed(1)} GB`}
          delta={{ value: Math.abs(data.cluster.egressDelta), direction: 'down', label: 'vs 7d' }}
          sparkData={data.gateway.upHist}
        />
        <StatTile
          color="emerald"
          label="Cluster uptime"
          value={`${data.cluster.uptimeDays}d ${data.cluster.uptimeHours}h`}
          meta="all hosts up"
          metaIcon="check"
          sparkData={data.servers[1]?.cpu.hist}
        />
      </StatGrid>

      <div className="srv-grid">
        {data.servers.map(server => (
          <HostCard key={server.id} server={server} />
        ))}
      </div>

      <GatewayPanel gateway={data.gateway} />
      <AppsPanel apps={data.apps} />
    </div>
  );
};
