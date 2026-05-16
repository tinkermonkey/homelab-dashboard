// Homelab dashboard components — servers, gateway, apps grid, alerts strip

const { useState: useState_l, useEffect: useEffect_l, useMemo: useMemo_l, useRef: useRef_l } = React;

// ============================================================
// Alerts strip
// ============================================================
function AlertsStrip() {
  return (
    <div className="alerts-strip">
      <div className="ic"><Icon name="alert" size={13} /></div>
      <div className="alert-list">
        <span className="a-item">
          <span className="sev warn">WARN</span>
          MEM 81% on <code style={{fontFamily:'var(--mono)', color:'inherit'}}>aether</code> · 12m
        </span>
        <span className="sep">·</span>
        <span className="a-item">
          <span className="sev warn">WARN</span>
          forgejo-act runner offline · 2h
        </span>
        <span className="sep">·</span>
        <span className="a-item">
          <span className="sev info">INFO</span>
          comfyui upgrade in progress
        </span>
      </div>
      <button className="clear">Open in watch-bot →</button>
    </div>
  );
}

// ============================================================
// Stat row (cluster KPIs)
// ============================================================
function ClusterStats({ d }) {
  return (
    <div className="stat-grid" style={{ marginBottom: 20 }}>
      <div className="stat lab-stat" data-color="cyan">
        <div className="label">Power draw</div>
        <div className="num">{d.powerDraw}<span style={{fontSize:14, color:'var(--canvas-fg-3)', fontWeight:400, marginLeft:4}}>W</span></div>
        <div className="meta">
          <span className="delta-up">▲ {d.powerDraw - d.powerAvg} W</span>
          <span className="muted">vs 7d avg</span>
        </div>
      </div>
      <div className="stat lab-stat" data-color="amber">
        <div className="label">Active alerts</div>
        <div className="num">{d.activeAlerts}</div>
        <div className="meta">
          <span style={{color:'var(--accent-amber)', fontWeight:500}}>2 warn</span>
          <span className="muted">· 0 error</span>
        </div>
      </div>
      <div className="stat lab-stat" data-color="violet">
        <div className="label">Egress today</div>
        <div className="num">{d.egressTodayGB.toFixed(1)}<span style={{fontSize:14, color:'var(--canvas-fg-3)', fontWeight:400, marginLeft:4}}>GB</span></div>
        <div className="meta">
          <span className="delta-dn" style={{color:'var(--accent-emerald)'}}>▼ {Math.abs(d.egressDelta)}%</span>
          <span className="muted">vs 7d</span>
        </div>
      </div>
      <div className="stat lab-stat" data-color="emerald">
        <div className="label">Cluster uptime</div>
        <div className="num">{d.uptimeDays}<span style={{fontSize:14, color:'var(--canvas-fg-3)', fontWeight:400, marginLeft:4}}>d {d.uptimeHours}h</span></div>
        <div className="meta">
          <span className="status-line"><span className="pulse"></span></span>
          <span className="muted">all hosts up</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Server card
// ============================================================
function MetricRow({ label, value, unit, percent, hist, color, level, extra }) {
  return (
    <div className="metric-row">
      <div className="m-label">{label}</div>
      <div className="m-bar">
        <i data-level={level} style={{ width: percent + '%' }}></i>
      </div>
      <div className="m-val">
        {value}{unit && <span className="unit">{unit}</span>}
      </div>
      <Sparkline data={hist} color={color} />
    </div>
  );
}

function levelFor(pct) {
  if (pct >= 85) return 'err';
  if (pct >= 75) return 'warn';
  return null; // default cyan
}

function ServerCard({ s }) {
  const cpuLvl = levelFor(s.cpu.v);
  const memLvl = levelFor(s.mem.v);
  const diskLvl = levelFor(s.disk.v);
  const dotClass = s.status === 'warn' ? 'warn' : s.status === 'err' ? 'err' : '';
  return (
    <div className="server-card">
      <div className="server-card-head">
        <div className="server-card-mark" data-role={s.role}>{s.mark}</div>
        <div className="server-card-id">
          <div className="name">
            <span className={'pulse-dot ' + dotClass}></span>
            {s.id}
          </div>
          <div className="sub">{s.hostname} · {s.ip}</div>
        </div>
        <div className="uptime">UPTIME<b>{s.uptime}</b></div>
      </div>
      <div className="metric-list">
        <MetricRow
          label="CPU"
          value={s.cpu.v.toFixed(0)} unit="%"
          percent={s.cpu.v} hist={s.cpu.hist}
          color={cpuLvl === 'warn' ? 'amber' : cpuLvl === 'err' ? 'rose' : 'cyan'}
          level={cpuLvl}
        />
        <MetricRow
          label="MEM"
          value={`${s.mem.used}/${s.mem.total}`} unit={` ${s.mem.unit}`}
          percent={s.mem.v} hist={s.mem.hist}
          color={memLvl === 'warn' ? 'amber' : memLvl === 'err' ? 'rose' : 'violet'}
          level={memLvl}
        />
        <MetricRow
          label="DISK"
          value={`${s.disk.used}/${s.disk.total}`} unit={` ${s.disk.unit}`}
          percent={s.disk.v} hist={s.disk.hist}
          color={diskLvl === 'warn' ? 'amber' : diskLvl === 'err' ? 'rose' : 'emerald'}
          level={diskLvl}
        />
        <MetricRow
          label="NET"
          value={`↓${s.net.down} ↑${s.net.up}`} unit={` ${s.net.unit}`}
          percent={Math.min(100, s.net.v * 2)} hist={s.net.hist}
          color="cyan"
          level={null}
        />
        {s.gpu && (
          <MetricRow
            label="GPU"
            value={`${s.gpu.v}%`} unit={` · ${s.gpu.vram}`}
            percent={s.gpu.v} hist={s.gpu.hist}
            color={s.gpu.v >= 85 ? 'rose' : s.gpu.v >= 75 ? 'amber' : 'amber'}
            level={s.gpu.v >= 85 ? 'err' : null}
          />
        )}
      </div>
      <div className="server-card-foot">
        <div>
          <div className="k">Model</div>
          <div className="v" style={{fontSize:10.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{s.model.split(' · ')[0]}</div>
        </div>
        <div>
          <div className="k">Temp</div>
          <div className={'v' + (parseInt(s.temp) >= 75 ? ' warn' : '')}>{s.temp}</div>
        </div>
        <div>
          <div className="k">Load</div>
          <div className="v" style={{fontSize:10.5}}>{s.load}</div>
        </div>
        <div>
          <div className="k">Containers</div>
          <div className="v">{s.containers}</div>
        </div>
      </div>
    </div>
  );
}

function ServersSection({ servers }) {
  return (
    <>
      <div className="lab-section">
        <div className="h">
          <h2>Servers</h2>
          <span className="ident">/cluster/asgard · {servers.length} hosts</span>
        </div>
        <div className="right">
          <span className="led"></span>
          ALL UP · LAST POLL 14s AGO
        </div>
      </div>
      <div className="server-grid">
        {servers.map((s) => <ServerCard key={s.id} s={s} />)}
      </div>
    </>
  );
}

// ============================================================
// Gateway widget
// ============================================================
function GatewayPanel({ g }) {
  return (
    <>
      <div className="lab-section">
        <div className="h">
          <h2>Network gateway</h2>
          <span className="ident">/gateway/wan0 · {g.isp}</span>
        </div>
        <div className="right">
          <span className="led"></span>
          ONLINE · {g.statusFor}
        </div>
      </div>
      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">
            <Icon name="globe" size={14}/>
            Internet connection
            <span className="id" style={{marginLeft:6}}>{g.hostname}</span>
          </div>
          <div className="row gap-12">
            <span className="chip emerald"><span className="dot"></span>healthy</span>
            <button className="btn btn-ghost btn-sm"><Icon name="ext" size={12}/> Run speedtest</button>
          </div>
        </div>
        <div className="gateway-grid">
          <div className="gateway-info">
            <div className="gateway-conn-title">
              <Icon name="link" size={11}/>
              Connection
              <span className="badge">{g.plan}</span>
            </div>
            <dl className="kv">
              <dt>ISP</dt><dd>{g.isp}</dd>
              <dt>ASN</dt><dd>{g.asn}</dd>
              <dt>Public IP</dt><dd>{g.publicIp}<span className="ext-flag">↗ ipv4</span></dd>
              <dt>Geo</dt><dd>{g.geo}</dd>
              <dt>WAN iface</dt><dd>{g.wanIf}</dd>
              <dt>Ping</dt><dd>{g.pingMs} ms · jitter {g.jitterMs} ms</dd>
              <dt>Loss 24h</dt><dd>{g.lossPct.toFixed(2)}%</dd>
            </dl>
          </div>
          <div className="gateway-charts">
            <div className="gateway-chart">
              <div className="gw-chart-head">
                <span className="t">Throughput · 24h</span>
                <span className="v">
                  {g.downMbps}<span className="unit"> Mbps</span>
                  <span className="dn-up">↓ <b>now</b> · ↑ <b>{g.upMbps}</b></span>
                </span>
              </div>
              <GwChart
                height={84}
                series={[
                  { values: g.downHist, lineKey: 'l-down', fillKey: 'f-down' },
                  { values: g.upHist,   lineKey: 'l-up',   fillKey: 'f-up' },
                ]}
                yFmt={(v) => Math.round(v) + ''}
              />
            </div>
            <div className="gateway-chart">
              <div className="gw-chart-head">
                <span className="t">Latency · 24h</span>
                <span className="v">{g.pingMs}<span className="unit"> ms</span></span>
              </div>
              <GwChart
                height={70}
                series={[
                  { values: g.pingHist, lineKey: 'l-ping', fillKey: 'f-ping' },
                ]}
                yMaxOverride={Math.max(20, Math.max(...g.pingHist) * 1.2)}
                yFmt={(v) => v.toFixed(0)}
              />
            </div>
          </div>
        </div>
        <div className="gateway-stats">
          <div>
            <div className="k">Ingress · today</div>
            <div className="v">{g.ingressTodayGB.toFixed(1)}<span className="u"> GB</span></div>
            <div className="delta">↓ 412 Mbps peak · 14:02</div>
          </div>
          <div>
            <div className="k">Egress · today</div>
            <div className="v">{g.egressTodayGB.toFixed(1)}<span className="u"> GB</span></div>
            <div className="delta">↑ {g.egressMonthTB} TB this month</div>
          </div>
          <div>
            <div className="k">DNS · pihole</div>
            <div className="v">{g.dnsResolved.toLocaleString()}<span className="u"> q</span></div>
            <div className="delta">blocked {g.blockedPct}% ({g.dnsBlocked})</div>
          </div>
          <div>
            <div className="k">VPN peers</div>
            <div className="v">{g.vpnPeersActive}<span className="u">/{g.vpnPeers}</span></div>
            <div className="delta">wireguard · last handshake 41s</div>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================
// Apps grid
// ============================================================
const APP_CAT_LABEL = {
  media: 'media', iot: 'iot', ai: 'ai', storage: 'storage',
  dev: 'dev', obs: 'observability', net: 'network',
};

function AppCell({ a }) {
  const initials = a.id
    .replace(/-.*/, '')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="app-cell" data-host={a.host}>
      <div className="app-ic">{initials}</div>
      <div className="app-main">
        <div className="n">{a.id}</div>
        <div className="meta">{a.version} · {a.host} · {a.meta}</div>
      </div>
      <div className="app-state" data-s={a.state}>
        <span className="dot"></span>
        {a.state}
      </div>
    </div>
  );
}

function AppsSection({ apps }) {
  const [filter, setFilter] = useState_l('all');
  const cats = ['all', ...new Set(apps.map(a => a.cat))];
  const filtered = filter === 'all' ? apps : apps.filter(a => a.cat === filter);
  const running = apps.filter(a => a.state === 'running').length;
  const failed  = apps.filter(a => a.state === 'failed').length;
  const degraded = apps.filter(a => a.state === 'degraded').length;

  return (
    <>
      <div className="lab-section">
        <div className="h">
          <h2>Applications</h2>
          <span className="ident">/services · {apps.length} deployed</span>
        </div>
        <div className="right" style={{gap:14}}>
          <span><span style={{color:'var(--accent-emerald)'}}>●</span> {running} RUNNING</span>
          <span><span style={{color:'var(--accent-amber)'}}>●</span> {degraded} DEGRADED</span>
          <span><span style={{color:'var(--accent-rose)'}}>●</span> {failed} FAILED</span>
        </div>
      </div>
      <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:10, flexWrap:'wrap'}}>
        {cats.map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className="chip gray"
            style={{
              cursor: 'pointer',
              fontFamily: 'var(--mono)',
              padding: '3px 9px',
              ...(filter === c ? {
                color: 'var(--accent-cyan)',
                borderColor: 'color-mix(in oklab, var(--accent-cyan) 35%, transparent)',
                background: 'color-mix(in oklab, var(--accent-cyan) 10%, transparent)',
              } : {}),
            }}
          >
            {APP_CAT_LABEL[c] || c}
            <span style={{color:'var(--canvas-fg-4)', marginLeft:6}}>
              {c === 'all' ? apps.length : apps.filter(a => a.cat === c).length}
            </span>
          </button>
        ))}
      </div>
      <div className="panel" style={{padding:0}}>
        <div className="app-grid">
          {filtered.map(a => <AppCell key={a.id} a={a} />)}
        </div>
      </div>
    </>
  );
}

window.AlertsStrip = AlertsStrip;
window.ClusterStats = ClusterStats;
window.ServersSection = ServersSection;
window.GatewayPanel = GatewayPanel;
window.AppsSection = AppsSection;
