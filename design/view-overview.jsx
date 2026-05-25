// View — Overview (/cluster/asgard/overview)

const APP_CATS = [
  { id: 'all',     label: 'all' },
  { id: 'media',   label: 'media' },
  { id: 'iot',     label: 'iot' },
  { id: 'ai',      label: 'ai' },
  { id: 'storage', label: 'storage' },
  { id: 'dev',     label: 'dev' },
  { id: 'obs',     label: 'observability' },
  { id: 'net',     label: 'network' },
];

const PageHead = ({ eyebrow, title, subtitle, idTag, actions }) => (
  <header className="page-head">
    <div className="page-head-l">
      {eyebrow && <div className="head-meta-row">{eyebrow}</div>}
      <h1>
        {title}
        {idTag && <IdTag>{idTag}</IdTag>}
      </h1>
      {subtitle && <p className="subtitle">{subtitle}</p>}
    </div>
    {actions && <div className="page-actions">{actions}</div>}
  </header>
);

const AlertsStrip = ({ alerts, onDismiss }) => (
  <div className="alerts-strip">
    <span className="alert-glyph"><Icon name="alert" size={14} /></span>
    <div className="alerts-list">
      {alerts.map((a, i) => (
        <span className="alert-row" key={i}>
          <span className={`sev-badge ${a.sev === 'INFO' ? 'info' : ''}`}>{a.sev}</span>
          <span>{a.txt}</span>
        </span>
      ))}
    </div>
    <button className="ack">
      Open in watch-bot
      <Icon name="arrow" size={12} />
    </button>
  </div>
);

const ServerCard = ({ s }) => {
  const memVal = `${s.mem.used}/${s.mem.total} ${s.mem.unit}`;
  const diskVal = `${s.disk.used}/${s.disk.total} ${s.disk.unit}`;
  const netVal = `↓${s.net.down} ↑${s.net.up} ${s.net.unit}`;
  return (
    <div className="server-card">
      <header className="server-head">
        <RoleMark role={s.role} mark={s.mark} />
        <div className="server-head-main">
          <div className="server-name">
            {s.id}
            <Pulse tone={s.status === 'warn' ? 'amber' : s.status === 'err' ? 'rose' : 'emerald'} size="sm" />
          </div>
          <div className="server-sub">{s.hostname} · {s.ip}</div>
        </div>
        <div className="server-head-right">
          <span className="k">UPTIME</span>
          <span className="v">{s.uptime}</span>
        </div>
      </header>
      <div className="metric-rows">
        <MetricRow metric="CPU"  v={s.cpu.v}  value={`${s.cpu.v}%`} hist={s.cpu.hist} />
        <MetricRow metric="MEM"  v={s.mem.v}  value={memVal}        hist={s.mem.hist} />
        <MetricRow metric="DISK" v={s.disk.v} value={diskVal}       hist={s.disk.hist} />
        <MetricRow metric="NET"  v={s.net.v}  value={netVal}        hist={s.net.hist}
          scale={(x) => Math.min(100, x * 2)} />
        {s.gpu && <MetricRow metric="GPU" v={s.gpu.v}
          value={`${s.gpu.v}% · ${s.gpu.vram}`} hist={s.gpu.hist} />}
      </div>
      <footer className="server-foot">
        <div><span className="k">MODEL</span><span className="v">{s.model.split(' · ')[0]}</span></div>
        <div><span className="k">TEMP</span><span className={`v ${parseInt(s.temp) >= 75 ? 'warn' : ''}`}>{s.temp}</span></div>
        <div><span className="k">LOAD</span><span className="v">{s.load}</span></div>
        <div><span className="k">CONTAINERS</span><span className="v">{s.containers}</span></div>
      </footer>
    </div>
  );
};

const GatewayPanel = ({ gw }) => (
  <Panel
    icon="globe"
    title="Internet connection"
    sub="gw.lab.local"
    actions={
      <div className="row-flex">
        <Chip tone="emerald">healthy</Chip>
        <Button variant="ghost" icon="zap" size="sm">Run speedtest</Button>
      </div>
    }
    flush>
    <div className="gw-split">
      <div className="gw-left">
        <div className="gw-eyebrow">Connection · {gw.plan}</div>
        <div className="kv">
          <div className="k">ISP</div><div className="v">{gw.isp}</div>
          <div className="k">ASN</div><div className="v">{gw.asn}</div>
          <div className="k">Public IP</div><div className="v">{gw.publicIp} <span className="flag">↗ ipv4</span></div>
          <div className="k">Geo</div><div className="v">{gw.geo}</div>
          <div className="k">WAN iface</div><div className="v">{gw.wanIf}</div>
          <div className="k">Ping</div><div className="v">{gw.pingMs} ms · jitter {gw.jitterMs} ms</div>
          <div className="k">Loss 24h</div><div className="v">{gw.lossPct.toFixed(2)} %</div>
        </div>
      </div>
      <div className="gw-right">
        <div className="gw-charts">
          <div>
            <div className="gw-chart-head">
              <span className="t">Throughput · 24h</span>
              <span className="v">
                <span className="down">{gw.downMbps} Mbps</span> ↓ now ·
                <span className="up"> {gw.upMbps}</span> ↑
              </span>
            </div>
            <AreaChart values={gw.downHist} secondValues={gw.upHist}
              color="var(--status-cyan)" secondColor="var(--status-violet)" />
          </div>
          <div>
            <div className="gw-chart-head">
              <span className="t">Latency · 24h</span>
              <span className="v">{gw.pingMs} ms · loss {gw.lossPct.toFixed(2)}%</span>
            </div>
            <AreaChart values={gw.pingHist} color="var(--status-amber)" />
          </div>
        </div>
      </div>
    </div>
    <div className="gw-stat-strip">
      <div>
        <span className="k">Ingress · today</span>
        <span className="v">{gw.ingressTodayGB} GB</span>
        <span className="m">↓ {gw.downMbps} Mbps peak · 14:02</span>
      </div>
      <div>
        <span className="k">Egress · today</span>
        <span className="v">{gw.egressTodayGB} GB</span>
        <span className="m">↑ {gw.egressMonthTB} TB this month</span>
      </div>
      <div>
        <span className="k">DNS · pihole</span>
        <span className="v">{gw.dnsResolved.toLocaleString()} q</span>
        <span className="m">blocked {gw.blockedPct}% ({gw.dnsBlocked})</span>
      </div>
      <div>
        <span className="k">VPN peers</span>
        <span className="v">{gw.vpnPeersActive}/{gw.vpnPeers}</span>
        <span className="m">wireguard · last handshake 41s</span>
      </div>
    </div>
  </Panel>
);

const AppCell = ({ app }) => {
  const initials = app.id.slice(0, 2).toUpperCase();
  return (
    <div className="app-cell" data-host={app.host}>
      <span className="app-mark">{initials}</span>
      <div className="app-body">
        <div className="n">{app.id}</div>
        <div className="m">{app.version} · {app.host} · {app.meta}</div>
      </div>
      <StatePill s={app.state} />
    </div>
  );
};

const AppsPanel = ({ apps }) => {
  const [cat, setCat] = React.useState('all');
  const filtered = cat === 'all' ? apps : apps.filter(a => a.cat === cat);
  const counts = APP_CATS.reduce((m, c) => {
    m[c.id] = c.id === 'all' ? apps.length : apps.filter(a => a.cat === c.id).length;
    return m;
  }, {});
  const running = apps.filter(a => a.state === 'running').length;
  const degraded = apps.filter(a => a.state === 'degraded').length;
  const failed = apps.filter(a => a.state === 'failed').length;
  const updating = apps.filter(a => a.state === 'updating').length;
  return (
    <Panel
      icon="workflow"
      title="Applications"
      sub={`${apps.length} services · ${running} running`}
      flush>
      <div className="cat-chips">
        {APP_CATS.map(c => (
          <button key={c.id}
            className={`cat-chip ${cat === c.id ? 'active' : ''}`}
            onClick={() => setCat(c.id)}>
            {c.label}
            <span className="count">({counts[c.id]})</span>
          </button>
        ))}
      </div>
      <div className="apps-stat-row">
        <span><span className="row-flex"><Pulse tone="emerald" size="xs" />&nbsp;<b>{running}</b> running</span></span>
        <span><span className="row-flex"><Pulse tone="amber" size="xs" />&nbsp;<b>{degraded}</b> degraded</span></span>
        <span><span className="row-flex"><Pulse tone="rose" size="xs" />&nbsp;<b>{failed}</b> failed</span></span>
        <span><span className="row-flex"><Pulse tone="cyan" size="xs" />&nbsp;<b>{updating}</b> updating</span></span>
        <span style={{ marginLeft: 'auto' }}>scraped every 15 s</span>
      </div>
      <div className="apps-grid">
        {filtered.map(a => <AppCell key={a.id} app={a} />)}
      </div>
    </Panel>
  );
};

const OverviewView = ({ showAlerts }) => {
  const c = LAB_DATA.cluster;
  const powerDelta = c.powerDraw - c.powerAvg;
  return (
    <>
      <PageHead
        eyebrow={<>
          <Chip tone="amber">cluster · {c.name}</Chip>
          <span className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
            {c.location} · last sync {c.lastSync}
          </span>
        </>}
        title="Overview"
        idTag="/cluster/asgard"
        subtitle="Resource state across hosts, gateway health, and deployed services. All systems polled every 15 s."
        actions={<>
          <Button variant="ghost" icon="refresh">Refresh</Button>
          <Button variant="primary" icon="bot">Ask lab-bot</Button>
        </>}
      />
      {showAlerts && <AlertsStrip alerts={LAB_DATA.alerts} />}
      <div className="stat-grid">
        <StatTile tone="cyan" label="Power draw" value={c.powerDraw} unit="W"
          meta={<>
            <span className={powerDelta >= 0 ? 'delta-up' : 'delta-down'}>
              {powerDelta >= 0 ? '▲' : '▼'} {Math.abs(powerDelta)} W
            </span>
            <span>vs 7d avg</span>
          </>}
          sparkValues={LAB_DATA.servers[0].cpu.hist} />
        <StatTile tone="amber" label="Active alerts" value={c.activeAlerts}
          meta={<>2 warn · 0 error</>}
          sparkValues={[1,1,1,2,2,2,2,1,2,2,2,2,2,2,2,2]} />
        <StatTile tone="violet" label="Egress today" value={c.egressTodayGB} unit="GB"
          meta={<>
            <span className="delta-down">▼ {Math.abs(c.egressDelta)}%</span>
            <span>vs 7d</span>
          </>}
          sparkValues={LAB_DATA.gateway.upHist} />
        <StatTile tone="emerald" label="Cluster uptime" value={`${c.uptimeDays}d`} unit={`${c.uptimeHours}h`}
          meta={<><Pulse tone="emerald" size="xs" /> all hosts up</>}
          sparkValues={LAB_DATA.servers[1].cpu.hist} />
      </div>
      <div className="server-grid">
        {LAB_DATA.servers.map(s => <ServerCard key={s.id} s={s} />)}
      </div>
      <GatewayPanel gw={LAB_DATA.gateway} />
      <AppsPanel apps={LAB_DATA.apps} />
    </>
  );
};

window.OverviewView = OverviewView;
window.PageHead = PageHead;
