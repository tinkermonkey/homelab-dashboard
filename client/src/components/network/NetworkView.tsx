import React, { useMemo } from 'react';
import {
  PageHeader, StatGrid, StatTile, Panel, LineChart, KVGrid, Table, Chip, Button, AlertStrip,
} from '@tinkermonkey/heimdall-ui';
import type { Column } from '@tinkermonkey/heimdall-ui';
import { useCluster, useDocker } from '../../hooks/useAPI';
import { Icon } from '@tinkermonkey/heimdall-ui';
import { ErrorView } from '../shared/ErrorView';
import { asEyebrow } from '../../utils/pageHeader';

interface PublishedService {
  _key: string;
  service: string;
  host: string;
  published: string;
  target: string;
  proto: string;
  net: string;
}

const PUB_COLS: Column<PublishedService>[] = [
  {
    key: 'service',
    label: 'Service',
    width: '24%',
    render: (v) => <span className="cell-name" style={{ fontSize: 12.5 }}>{String(v)}</span>,
  },
  { key: 'host', label: 'Host', width: '14%', render: (v) => <span className="cell-mono">{String(v)}</span> },
  {
    key: 'published',
    label: 'Published',
    width: '16%',
    render: (_v, row) => <span className="port-pill">:{row.published} → {row.target}</span>,
  },
  { key: 'proto', label: 'Proto', width: '12%', render: (v) => <span className="tag-pill">{String(v)}</span> },
  { key: 'net', label: 'Network', width: '34%', render: (v) => <span className="cell-mono">{String(v)}</span> },
];

export const NetworkView: React.FC = () => {
  const { data: cluster, isLoading, error: clusterError } = useCluster();
  const { data: docker } = useDocker();

  const gw = cluster?.gateway;
  const degraded = cluster?.degraded;
  const clusterSlug = (cluster?.cluster?.name ?? 'cluster').toLowerCase();

  const published = useMemo((): PublishedService[] => {
    if (!docker) return [];
    const rows: PublishedService[] = [];
    docker.hosts.forEach(h =>
      h.containers.forEach(c =>
        (c.ports ?? []).forEach(p => {
          let pub: string;
          let target: string;
          let proto: string;

          const arrow = p.match(/^(\d+)->(\d+)\/(\w+)$/);
          if (arrow) {
            [, pub, target, proto] = arrow;
          } else {
            const [portPart, protoPart = 'tcp'] = p.split('/');
            proto = protoPart;
            const segments = portPart.split(':');
            if (segments.length >= 3) {
              pub = segments[segments.length - 2];
              target = segments[segments.length - 1];
            } else if (segments.length === 2) {
              [pub, target] = segments;
            } else {
              return;
            }
          }

          rows.push({
            _key: `${c.id}-${p}`,
            service: c.name,
            host: h.id,
            published: pub,
            target,
            proto,
            net: c.networks[0] ?? '—',
          });
        })
      )
    );
    return rows;
  }, [docker]);

  if (isLoading && !cluster) {
    return (
      <PageHeader
        eyebrow={asEyebrow(<span className="eyebrow-row"><Chip variant="emerald">network · online</Chip></span>)}
        title="Network"
        subtitle="Loading network data…"
      />
    );
  }

  if (!gw) {
    if (clusterError) {
      return (
        <ErrorView
          title="Failed to Load Network Data"
          message={clusterError instanceof Error ? clusterError.message : 'Could not fetch network data. Please try again in a moment.'}
        />
      );
    }
    return (
      <PageHeader
        eyebrow="network"
        title="Network"
        subtitle="No gateway data available."
      />
    );
  }

  const wanKv = [
    { key: 'ISP', value: gw.isp || '—' },
    { key: 'ASN', value: gw.asn || '—' },
    { key: 'Public IP', value: gw.publicIp || '—' },
    { key: 'Ping', value: gw.pingMs != null ? `${gw.pingMs} ms` : '—' },
  ];

  return (
    <>
      <PageHeader
        eyebrow={asEyebrow(
          <span className="eyebrow-row">
            <Chip variant="emerald">network · online</Chip>
            <span className="mono-meta">{gw.hostname} · uptime {gw.statusFor}</span>
          </span>
        )}
        idChip={`/cluster/${clusterSlug}/network`}
        title="Network"
        subtitle="WAN link, VPN and the services published across the cluster."
        actions={
          <Button variant="primary" size="sm">
            <Icon name="arrowRight" size={13} />
            Run speedtest
          </Button>
        }
      />

      {degraded && degraded.length > 0 && (
        <AlertStrip
          alerts={[{ id: 'degradation', severity: 'warn', message: `Partial Data: ${degraded.join(', ')} are temporarily unavailable. Showing cached data.` }]}
          style={{ marginBottom: '24px' }}
        />
      )}

      <StatGrid columns={3}>
        <StatTile
          color="cyan"
          label="Download"
          value={`${gw.downMbps} Mbps`}
          meta="wan link"
          metaIcon="arrowDown"
          sparkData={gw.downHist}
        />
        <StatTile
          color="violet"
          label="Upload"
          value={`${gw.upMbps} Mbps`}
          meta="wan link"
          metaIcon="arrowUp"
          sparkData={gw.upHist}
        />
        <StatTile
          color="emerald"
          label="VPN peers"
          value={`${gw.vpnPeersActive}/${gw.vpnPeers}`}
          meta="wireguard"
          metaIcon="lock"
        />
      </StatGrid>

      <Panel
        className="panel-flush"
        title="WAN throughput · 24h"
        subtitle="ingress / egress, Mbps"
      >
        <div style={{ padding: 14 }}>
          <LineChart
            series={[gw.downHist, gw.upHist]}
            colors={['#22d3ee', '#8b5cf6']}
            area
            axes
            grid
            style={{ width: '100%', height: 220 }}
          />
        </div>
      </Panel>

      <Panel title="WAN link" subtitle={gw.asn || '—'}>
        <KVGrid rows={wanKv} />
      </Panel>

      <Panel
        className="panel-flush"
        title="WireGuard peers"
        subtitle={`${gw.vpnPeersActive} active · ${gw.vpnPeers} configured`}
      >
        <div className="empty-state" style={{ padding: 24, textAlign: 'center', color: 'rgb(var(--canvas-fg-3))' }}>
          Per-peer detail is not available from the current data source.
        </div>
      </Panel>

      <Panel
        className="panel-flush"
        title="Published services"
        subtitle={`${published.length} port mappings`}
      >
        <Table columns={PUB_COLS} data={published} rowKey="_key" />
      </Panel>
    </>
  );
};
