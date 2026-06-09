// view-overview.jsx — /cluster/asgard/overview
// Composed from real Heimdall components: PageHeader, AlertStrip, StatGrid,
// StatTile, Panel, MetricRow, Avatar, Chip, Button, KVGrid, LineChart,
// TabBar, Table, VersionPill, Icon.

const APP_CATS = [
  { id: 'all', label: 'all' }, { id: 'media', label: 'media' }, { id: 'iot', label: 'iot' },
  { id: 'ai', label: 'ai' }, { id: 'storage', label: 'storage' }, { id: 'dev', label: 'dev' },
  { id: 'obs', label: 'observability' }, { id: 'net', label: 'network' },
];

const ROLE_COLOR = { compute: 'cyan', storage: 'emerald', k8s: 'violet', gpu: 'amber' };
const STATE_COLOR = { running: 'emerald', degraded: 'amber', failed: 'rose', updating: 'cyan', stopped: 'neutral' };

function cpuTone(v) { return v >= 85 ? 'rose' : v >= 75 ? 'amber' : 'cyan'; }
function memTone(v) { return v >= 90 ? 'rose' : v >= 78 ? 'amber' : 'violet'; }
function diskTone(v) { return v >= 92 ? 'rose' : v >= 85 ? 'amber' : 'emerald'; }

function PulseDot({ tone, sm }) {
  return <span className={`pulse-dot pulse-dot--${tone}${sm ? ' pulse-dot--sm' : ''}`} />;
}

function HostCard({ s }) {
  const statusTone = s.status === 'warn' ? 'amber' : s.status === 'err' ? 'rose' : 'emerald';
  return (
    <Panel noPadding>
      <div className="srv-head">
        <Avatar name={s.id} color={ROLE_COLOR[s.role]} size="md" shape="rounded" decorative />
        <div className="srv-head__main">
          <span className="srv-head__name">{s.id}<PulseDot tone={statusTone} sm /></span>
          <span className="srv-head__sub">{s.hostname} · {s.ip}</span>
        </div>
        <div className="srv-head__right">
          <span className="k">uptime</span>
          <span className="v">{s.uptime}</span>
        </div>
      </div>
      <div className="srv-body">
        <MetricRow label="CPU" value={s.cpu.v} unit="%" percent={s.cpu.v} color={cpuTone(s.cpu.v)} sparklineData={s.cpu.hist} />
        <MetricRow label="MEM" value={`${s.mem.used}/${s.mem.total}`} unit={s.mem.unit} percent={s.mem.v} color={memTone(s.mem.v)} sparklineData={s.mem.hist} />
        <MetricRow label="DISK" value={`${s.disk.used}/${s.disk.total}`} unit={s.disk.unit} percent={s.disk.v} color={diskTone(s.disk.v)} sparklineData={s.disk.hist} />
        <MetricRow label="NET" value={`↓${s.net.down} ↑${s.net.up}`} unit={s.net.unit} percent={Math.min(100, s.net.v * 2)} color="cyan" sparklineData={s.net.hist} />
        {s.gpu && <MetricRow label="GPU" value={s.gpu.v} unit={`% · ${s.gpu.vram}`} percent={s.gpu.v} color={s.gpu.v >= 90 ? 'rose' : 'amber'} sparklineData={s.gpu.hist} />}
      </div>
      <div className="srv-foot">
        <div><span className="k">model</span><span className="v">{s.model.split(' · ')[0]}</span></div>
        <div><span className="k">temp</span><span className={`v ${parseInt(s.temp) >= 72 ? 'warn' : ''}`}>{s.temp}</span></div>
        <div><span className="k">load</span><span className="v">{s.load}</span></div>
        <div><span className="k">containers</span><span className="v">{s.containers}</span></div>
      </div>
    </Panel>
  );
}

function GatewayPanel({ gw }) {
  const kv = [
    { key: 'ISP', value: gw.isp }, { key: 'ASN', value: gw.asn },
    { key: 'Public IP', value: <span className="row">{gw.publicIp} <span className="flag">↗ ipv4</span></span> },
    { key: 'Geo', value: gw.geo }, { key: 'WAN iface', value: gw.wanIf },
    { key: 'Ping', value: `${gw.pingMs} ms · jitter ${gw.jitterMs} ms` },
    { key: 'Loss 24h', value: `${gw.lossPct.toFixed(2)} %` },
  ];
  return (
    <Panel noPadding
      title="Internet connection" subtitle="gw.lab.local · 10 Gbit symmetric"
      headerAction={<div className="row"><Chip variant="emerald">healthy</Chip>
        <Button variant="ghost" size="sm"><Icon name="zap" size={14} />Run speedtest</Button></div>}>
      <div className="gw-split">
        <div className="gw-left"><KVGrid rows={kv} keyWidth={84} /></div>
        <div className="gw-right">
          <div>
            <div className="gw-charthead"><span className="t">Throughput · 24h</span>
              <span className="v">↓ {gw.downMbps} · ↑ {gw.upMbps} Mbps</span></div>
            <LineChart series={[gw.downHist, gw.upHist]} colors={['#22d3ee', '#8b5cf6']} area width={560} height={92}
              style={{ width: '100%', height: 92 }} />
          </div>
          <div>
            <div className="gw-charthead"><span className="t">Latency · 24h</span>
              <span className="v">{gw.pingMs} ms · loss {gw.lossPct.toFixed(2)}%</span></div>
            <LineChart series={[gw.pingHist]} colors={['#f59e0b']} area width={560} height={72}
              style={{ width: '100%', height: 72 }} />
          </div>
        </div>
      </div>
      <div className="gw-strip">
        <div><span className="k">Ingress · today</span><span className="v">{gw.ingressTodayGB} GB</span><span className="m">↓ {gw.downMbps} Mbps peak</span></div>
        <div><span className="k">Egress · today</span><span className="v">{gw.egressTodayGB} GB</span><span className="m">↑ {gw.egressMonthTB} TB / mo</span></div>
        <div><span className="k">DNS · pihole</span><span className="v">{gw.dnsResolved.toLocaleString()} q</span><span className="m">blocked {gw.blockedPct}%</span></div>
        <div><span className="k">VPN peers</span><span className="v">{gw.vpnPeersActive}/{gw.vpnPeers}</span><span className="m">wireguard</span></div>
      </div>
    </Panel>
  );
}

function AppsPanel({ apps }) {
  const [cat, setCat] = React.useState('all');
  const counts = {}; APP_CATS.forEach(c => { counts[c.id] = c.id === 'all' ? apps.length : apps.filter(a => a.cat === c.id).length; });
  const tabs = APP_CATS.map(c => ({ id: c.id, label: c.label, count: counts[c.id] }));
  const filtered = cat === 'all' ? apps : apps.filter(a => a.cat === cat);
  const running = apps.filter(a => a.state === 'running').length;

  const columns = [
    { key: 'id', label: 'Service', width: '32%', render: (v, a) => (
        <div><div className="cell-name">{a.id}</div><div className="cell-sub">{a.meta}</div></div>) },
    { key: 'host', label: 'Host', width: '14%', render: (v) => <span className="cell-mono">{v}</span> },
    { key: 'cat', label: 'Category', width: '16%', render: (v) => <span className="tag-pill">{v}</span> },
    { key: 'version', label: 'Version', width: '18%', render: (v) => <VersionPill>{v}</VersionPill> },
    { key: 'state', label: 'State', width: '20%', render: (v) => <Chip variant={STATE_COLOR[v]}>{v}</Chip> },
  ];
  return (
    <Panel noPadding title="Applications" subtitle={`${apps.length} services · ${running} running`}>
      <div style={{ padding: '8px 14px 0' }}><TabBar tabs={tabs} activeTabId={cat} onSelectTab={setCat} /></div>
      <Table columns={columns} data={filtered} rowKey="id" />
    </Panel>
  );
}

function OverviewView({ showAlerts }) {
  const c = LAB_DATA.cluster;
  const powerDelta = c.powerDraw - c.powerAvg;
  const alerts = LAB_DATA.alerts.map((a, i) => ({
    id: 'a' + i, severity: a.sev === 'INFO' ? 'info' : a.sev === 'ERROR' ? 'error' : 'warn', message: a.txt,
  }));
  return (
    <>
      <PageHeader
        eyebrow={<span className="eyebrow-row"><Chip variant="amber">cluster · {c.name}</Chip>
          <span className="mono-meta">{c.location} · last sync {c.lastSync}</span></span>}
        title="Overview" idChip="/cluster/asgard"
        subtitle="Resource state across hosts, gateway health, and deployed services. All systems polled every 15 s."
        actions={<div className="row">
          <Button variant="secondary"><Icon name="refresh" size={14} />Refresh</Button>
          <Button variant="primary"><Icon name="bot" size={14} />Ask lab-bot</Button></div>} />

      {showAlerts && alerts.length > 0 && <AlertStrip alerts={alerts} />}

      <StatGrid columns={4}>
        <StatTile color="cyan" label="Power draw" value={`${c.powerDraw} W`}
          delta={{ value: Math.abs(powerDelta), direction: powerDelta >= 0 ? 'up' : 'down', label: 'vs 7d avg' }}
          sparkData={LAB_DATA.servers[0].cpu.hist} />
        <StatTile color="amber" label="Active alerts" value={c.activeAlerts} meta="2 warn · 0 error" metaIcon="alert" />
        <StatTile color="violet" label="Egress today" value={`${c.egressTodayGB} GB`}
          delta={{ value: Math.abs(c.egressDelta), direction: 'down', label: 'vs 7d' }} sparkData={LAB_DATA.gateway.upHist} />
        <StatTile color="emerald" label="Cluster uptime" value={`${c.uptimeDays}d ${c.uptimeHours}h`}
          meta="all hosts up" metaIcon="check" sparkData={LAB_DATA.servers[1].cpu.hist} />
      </StatGrid>

      <div className="srv-grid">
        {LAB_DATA.servers.map(s => <HostCard key={s.id} s={s} />)}
      </div>

      <GatewayPanel gw={LAB_DATA.gateway} />
      <AppsPanel apps={LAB_DATA.apps} />
    </>
  );
}

window.OverviewView = OverviewView;
window.AppsPanel = AppsPanel;
window.PulseDot = PulseDot;
window.STATE_COLOR = STATE_COLOR;
window.ROLE_COLOR = ROLE_COLOR;
