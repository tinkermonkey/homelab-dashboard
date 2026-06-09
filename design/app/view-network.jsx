// view-network.jsx — /cluster/asgard/network
// Real components: PageHeader, StatGrid, StatTile, Panel, LineChart,
// KVGrid, Table, Chip, Icon.

function buildPublished() {
  const rows = [];
  DOCKER_DATA.hosts.forEach(h => h.containers.forEach(c => (c.ports || []).forEach(p => {
    const [pub, rest] = p.split(':');
    const proto = (rest || '').split('/')[1] || 'tcp';
    rows.push({ _k: c.id + p, service: c.name, host: h.id, published: pub, target: (rest || '').split('/')[0], proto, net: (c.networks || [])[0] || '—' });
  })));
  return rows;
}

const VPN_PEERS = [
  { _k: 'p1', peer: 'laptop-m3', endpoint: '73.214.6.11:51820', ip: '10.8.0.2', rx: '4.2 GB', tx: '812 MB', handshake: '41s ago', up: true },
  { _k: 'p2', peer: 'pixel-9', endpoint: '24.18.220.4:51820', ip: '10.8.0.3', rx: '1.1 GB', tx: '288 MB', handshake: '2m ago', up: true },
  { _k: 'p3', peer: 'work-vm', endpoint: '—', ip: '10.8.0.4', rx: '0 B', tx: '0 B', handshake: 'never', up: false },
  { _k: 'p4', peer: 'tablet', endpoint: '—', ip: '10.8.0.5', rx: '320 MB', tx: '94 MB', handshake: '6h ago', up: false },
];

function NetworkView() {
  const gw = LAB_DATA.gateway;
  const published = React.useMemo(buildPublished, []);
  const dnsKv = [
    { key: 'Resolved 24h', value: gw.dnsResolved.toLocaleString() + ' queries' },
    { key: 'Blocked', value: <span className="row">{gw.dnsBlocked} <Chip variant="amber">{gw.blockedPct}%</Chip></span> },
    { key: 'Upstream', value: 'unbound · 127.0.0.1#5335' },
    { key: 'Cache hit', value: '78.4 %' },
    { key: 'Lists', value: '6 blocklists · 1.18M domains' },
  ];
  const wanKv = [
    { key: 'ISP', value: gw.isp }, { key: 'Plan', value: gw.plan },
    { key: 'Public IP', value: gw.publicIp }, { key: 'WAN iface', value: gw.wanIf },
    { key: 'Ping', value: `${gw.pingMs} ms · jitter ${gw.jitterMs} ms` },
    { key: 'Loss 24h', value: `${gw.lossPct.toFixed(2)} %` },
  ];
  const pubCols = [
    { key: 'service', label: 'Service', width: '24%', render: (v) => <span className="cell-name" style={{ fontSize: 12.5 }}>{v}</span> },
    { key: 'host', label: 'Host', width: '14%', render: (v) => <span className="cell-mono">{v}</span> },
    { key: 'published', label: 'Published', width: '16%', render: (v, r) => <span className="port-pill">:{v} → {r.target}</span> },
    { key: 'proto', label: 'Proto', width: '12%', render: (v) => <span className="tag-pill">{v}</span> },
    { key: 'net', label: 'Network', width: '34%', render: (v) => <span className="cell-mono">{v}</span> },
  ];
  const vpnCols = [
    { key: 'peer', label: 'Peer', width: '20%', render: (v, r) => <span className="row" style={{ gap: 8 }}><PulseDot tone={r.up ? 'emerald' : 'neutral'} sm /><span className="cell-name" style={{ fontSize: 12.5 }}>{v}</span></span> },
    { key: 'ip', label: 'Tunnel IP', width: '16%', render: (v) => <span className="cell-mono">{v}</span> },
    { key: 'endpoint', label: 'Endpoint', width: '24%', render: (v) => <span className="cell-mono">{v}</span> },
    { key: 'rx', label: 'RX', width: '12%', render: (v) => <span className="cell-mono">{v}</span> },
    { key: 'tx', label: 'TX', width: '12%', render: (v) => <span className="cell-mono">{v}</span> },
    { key: 'handshake', label: 'Handshake', width: '16%', render: (v) => <span className="cell-mono muted">{v}</span> },
  ];

  return (
    <>
      <PageHeader
        eyebrow={<span className="eyebrow-row"><Chip variant="emerald">network · online</Chip>
          <span className="mono-meta">{gw.hostname} · uptime {gw.statusFor}</span></span>}
        title="Network" idChip="/cluster/asgard/network"
        subtitle="WAN link, DNS, VPN and the services published across the cluster."
        actions={<Button variant="primary"><Icon name="zap" size={14} />Run speedtest</Button>} />

      <StatGrid columns={4}>
        <StatTile color="cyan" label="Download" value={`${gw.downMbps} Mbps`} meta="10 Gbit link" metaIcon="arrowDown" sparkData={gw.downHist} />
        <StatTile color="violet" label="Upload" value={`${gw.upMbps} Mbps`} meta="symmetric" metaIcon="arrowUp" sparkData={gw.upHist} />
        <StatTile color="amber" label="DNS blocked" value={`${gw.blockedPct}%`} meta={`${gw.dnsBlocked} of ${gw.dnsResolved.toLocaleString()}`} metaIcon="shield" />
        <StatTile color="emerald" label="VPN peers" value={`${gw.vpnPeersActive}/${gw.vpnPeers}`} meta="wireguard" metaIcon="lock" />
      </StatGrid>

      <Panel noPadding title="WAN throughput · 24h" subtitle="ingress / egress, Mbps"
        headerAction={<span className="row" style={{ gap: 14 }}>
          <span className="row" style={{ gap: 6 }}><span style={{ width: 9, height: 3, borderRadius: 2, background: '#22d3ee' }} /><span className="mono muted" style={{ fontSize: 11 }}>down</span></span>
          <span className="row" style={{ gap: 6 }}><span style={{ width: 9, height: 3, borderRadius: 2, background: '#8b5cf6' }} /><span className="mono muted" style={{ fontSize: 11 }}>up</span></span></span>}>
        <div style={{ padding: 14 }}>
          <LineChart series={[gw.downHist, gw.upHist]} colors={['#22d3ee', '#8b5cf6']} area axes grid
            width={1000} height={220} style={{ width: '100%', height: 220 }} tooltip />
        </div>
      </Panel>

      <div className="grid-2">
        <Panel title="WAN link" subtitle={gw.asn}><KVGrid rows={wanKv} keyWidth={96} /></Panel>
        <Panel title="Pi-hole DNS" subtitle="aether · :8082"><KVGrid rows={dnsKv} keyWidth={110} /></Panel>
      </div>

      <Panel noPadding title="WireGuard peers" subtitle={`${gw.vpnPeersActive} active · ${gw.vpnPeers} configured`}>
        <Table columns={vpnCols} data={VPN_PEERS} rowKey="_k" />
      </Panel>

      <Panel noPadding title="Published services" subtitle={`${published.length} port mappings`}>
        <Table columns={pubCols} data={published} rowKey="_k" />
      </Panel>
    </>
  );
}

window.NetworkView = NetworkView;
