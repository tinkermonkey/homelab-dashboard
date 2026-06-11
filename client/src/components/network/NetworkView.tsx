import React, { useMemo } from 'react';
import {
  PageHeader, StatGrid, StatTile, Panel, LineChart, KVGrid, Table, Chip, Button, AlertStrip,
} from '@tinkermonkey/heimdall-ui';
import type { Column } from '@tinkermonkey/heimdall-ui';
import { useCluster, useDocker } from '../../hooks/useAPI';
import { Icon } from '../shared/Icon';
import { asEyebrow } from '../../utils/pageHeader';

interface VpnPeer {
  _key: string;
  peer: string;
  endpoint: string;
  ip: string;
  rx: string;
  tx: string;
  handshake: string;
  up: boolean;
}

interface PublishedService {
  _key: string;
  service: string;
  host: string;
  published: string;
  target: string;
  proto: string;
  net: string;
}

const VPN_PEERS: VpnPeer[] = [];

const VPN_COLS: Column<VpnPeer>[] = [
  {
    key: 'peer',
    label: 'Peer',
    width: '20%',
    render: (_v, row) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span className={`pulse-dot pulse-dot--sm pulse-dot--${row.up ? 'emerald' : 'neutral'}`} />
        <span className="cell-name" style={{ fontSize: 12.5 }}>{row.peer}</span>
      </span>
    ),
  },
  { key: 'ip', label: 'Tunnel IP', width: '16%', render: (v) => <span className="cell-mono">{String(v)}</span> },
  { key: 'endpoint', label: 'Endpoint', width: '24%', render: (v) => <span className="cell-mono">{String(v)}</span> },
  { key: 'rx', label: 'RX', width: '12%', render: (v) => <span className="cell-mono">{String(v)}</span> },
  { key: 'tx', label: 'TX', width: '12%', render: (v) => <span className="cell-mono">{String(v)}</span> },
  { key: 'handshake', label: 'Handshake', width: '16%', render: (v) => <span className="cell-mono" style={{ color: 'rgb(var(--canvas-fg-3))' }}>{String(v)}</span> },
];

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
  const { data: cluster, isLoading } = useCluster();
  const { data: docker } = useDocker();

  const gw = cluster?.gateway;
  const degraded = cluster?.degraded;

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
    return (
      <PageHeader
        eyebrow="network"
        title="Network"
        subtitle="No gateway data available."
      />
    );
  }

  const dnsKv = [
    { key: 'Resolved 24h', value: `${gw.dnsResolved.toLocaleString()} queries` },
    { key: 'Blocked', value: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{gw.dnsBlocked.toLocaleString()} <Chip variant="amber">{gw.blockedPct}%</Chip></span> },
    { key: 'Upstream', value: 'unbound · 127.0.0.1#5335' },
    { key: 'Cache hit', value: '78.4 %' },
    { key: 'Lists', value: '6 blocklists · 1.18M domains' },
  ];

  const wanKv = [
    { key: 'ISP', value: gw.isp },
    { key: 'Plan', value: gw.plan },
    { key: 'Public IP', value: gw.publicIp },
    { key: 'WAN iface', value: gw.wanIf },
    { key: 'Ping', value: `${gw.pingMs} ms · jitter ${gw.jitterMs} ms` },
    { key: 'Loss 24h', value: `${gw.lossPct.toFixed(2)} %` },
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
        idChip="/cluster/asgard/network"
        title="Network"
        subtitle="WAN link, DNS, VPN and the services published across the cluster."
        actions={
          <Button variant="primary" size="sm">
            <Icon name="zap" size={13} />
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

      <StatGrid columns={4}>
        <StatTile
          color="cyan"
          label="Download"
          value={`${gw.downMbps} Mbps`}
          meta="10 Gbit link"
          metaIcon="arrowDown"
          sparkData={gw.downHist}
        />
        <StatTile
          color="violet"
          label="Upload"
          value={`${gw.upMbps} Mbps`}
          meta="symmetric"
          metaIcon="arrowUp"
          sparkData={gw.upHist}
        />
        <StatTile
          color="amber"
          label="DNS blocked"
          value={`${gw.blockedPct}%`}
          meta={`${gw.dnsBlocked} of ${gw.dnsResolved.toLocaleString()}`}
          metaIcon="lock"
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

      <div className="grid-2">
        <Panel title="WAN link" subtitle={gw.asn}>
          <KVGrid rows={wanKv} />
        </Panel>
        <Panel title="Pi-hole DNS" subtitle="aether · :8082">
          <KVGrid rows={dnsKv} />
        </Panel>
      </div>

      <Panel
        className="panel-flush"
        title="WireGuard peers"
        subtitle={`${gw.vpnPeersActive} active · ${gw.vpnPeers} configured`}
      >
        <Table columns={VPN_COLS} data={VPN_PEERS} rowKey="_key" />
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
