// Docker view — containers / networks / volumes grouped by server

const { useState: useState_d, useMemo: useMemo_d } = React;

const ROLE_BY_HOST = { nyx: 'compute', helios: 'storage', aether: 'k8s', vega: 'gpu' };

function PortPill({ p }) {
  // p is like "8096:8096/tcp" or "80:80/tcp"
  const [hp, rest] = p.split(':');
  const [cp, proto] = (rest || '').split('/');
  return (
    <span className="port-pill" title={p}>
      {hp}<span className="arr">→</span>{cp}<span className="proto">{proto}</span>
    </span>
  );
}

function MountPill({ m }) {
  const isBind = m.type === 'bind';
  return (
    <span className="mount-pill" title={isBind ? `${m.host} → ${m.container}` : `${m.name} → ${m.container}`}>
      <span className="mt" data-t={m.type}>{isBind ? 'B' : 'V'}</span>
      <span className="host">{isBind ? m.host : m.name}</span>
      <span className="arr">→</span>
      <span className="ct">{m.container}</span>
      {m.mode === 'ro' && <span className="ro">ro</span>}
    </span>
  );
}

function NetPill({ n }) {
  return (
    <span className="net-pill" data-n={n}>
      <span className="dot"></span>{n}
    </span>
  );
}

function ContainerRow({ c }) {
  const state = c.state;
  const health = c.health;
  return (
    <div className="dk-row" data-health={health}>
      <span className="state-dot" data-s={state}></span>
      <div className="dk-row-id">
        <div className="name">
          {c.name}
          <span className="cid">{c.id}</span>
        </div>
        <div className="image">
          {c.image}<span className="tag">:{c.tag}</span>
        </div>
        <div className="health-badges">
          <span className="dk-hbadge" data-s={state}>{state}</span>
          {health && health !== state && health !== 'healthy' && <span className="dk-hbadge" data-h={health}>{health}</span>}
          {health === 'healthy' && <span className="dk-hbadge" data-s="running">healthy</span>}
        </div>
      </div>
      <div className="dk-row-detail">
        {c.ports.length > 0 && (
          <div className="dk-detail-row">
            <span className="k">PORTS</span>
            <span className="v">{c.ports.map(p => <PortPill key={p} p={p} />)}</span>
          </div>
        )}
        {c.mounts.length > 0 && (
          <div className="dk-detail-row">
            <span className="k">MOUNTS</span>
            <span className="v">{c.mounts.map((m, i) => <MountPill key={i} m={m} />)}</span>
          </div>
        )}
        {c.networks.length > 0 && (
          <div className="dk-detail-row">
            <span className="k">NET</span>
            <span className="v networks">{c.networks.map(n => <NetPill key={n} n={n} />)}</span>
          </div>
        )}
      </div>
      <div className="dk-row-stats">
        <span className="uptime">↑ {c.uptime}</span>
        <span className="size">{c.size}</span>
        {c.cpu > 0 && (
          <span className="res">
            cpu <span className="x">{c.cpu}%</span>
            <span style={{color:'var(--canvas-fg-4)'}}>·</span>
            mem <span className="x">{(c.mem >= 1024 ? (c.mem/1024).toFixed(1)+' GB' : c.mem+' MB')}</span>
          </span>
        )}
        {c.gpu != null && c.gpu > 0 && (
          <span className="res">gpu <span className="x" style={{color:'var(--accent-amber)'}}>{c.gpu}%</span></span>
        )}
      </div>
    </div>
  );
}

function HostContainersPanel({ host, query }) {
  const containers = useMemo_d(() => {
    if (!query) return host.containers;
    const q = query.toLowerCase();
    return host.containers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.image.toLowerCase().includes(q) ||
      c.tag.toLowerCase().includes(q)
    );
  }, [host, query]);

  if (containers.length === 0 && query) return null;

  const running = host.containers.filter(c => c.state === 'running').length;
  return (
    <div className="panel dk-host-panel">
      <div className="dk-host-head">
        <div className="dk-host-mark" data-role={ROLE_BY_HOST[host.id]}>{host.id.slice(0, 2).toUpperCase()}</div>
        <div className="dk-host-id">
          <div className="n">{host.id}<span className="muted" style={{fontWeight:400, fontSize:11, color:'var(--canvas-fg-3)'}}>· {host.engine}</span></div>
          <div className="meta">{host.compose}</div>
        </div>
        <div className="dk-host-counts">
          <span><b>{running}</b>/{host.containers.length} <span style={{color:'var(--canvas-fg-3)'}}>RUNNING</span></span>
        </div>
      </div>
      <div className="dk-container-list">
        {containers.map(c => <ContainerRow key={c.id} c={c} />)}
      </div>
    </div>
  );
}

function HostNetworksPanel({ host }) {
  return (
    <div className="panel dk-host-panel">
      <div className="dk-host-head">
        <div className="dk-host-mark" data-role={ROLE_BY_HOST[host.id]}>{host.id.slice(0,2).toUpperCase()}</div>
        <div className="dk-host-id">
          <div className="n">{host.id}</div>
          <div className="meta">{host.networks.length} networks</div>
        </div>
        <div className="dk-host-counts">
          <span><b>{host.networks.reduce((a,n)=>a+(n.attached||0),0)}</b> <span style={{color:'var(--canvas-fg-3)'}}>ATTACHED</span></span>
        </div>
      </div>
      <div className="dk-tbl-wrap">
        <table className="dk-tbl">
          <thead>
            <tr>
              <th>Network</th>
              <th>Driver</th>
              <th>Subnet</th>
              <th>Gateway</th>
              <th>Scope</th>
              <th className="num-right">Attached</th>
            </tr>
          </thead>
          <tbody>
            {host.networks.map(n => (
              <tr key={n.name}>
                <td><span className="net-name"><span className="nd" style={getNetDotStyle(n.name)}></span>{n.name}</span></td>
                <td><span className="driver-pill">{n.driver}</span></td>
                <td className="mono-muted">{n.subnet}</td>
                <td className="mono-muted">{n.gateway}</td>
                <td className="mono-muted">{n.scope}</td>
                <td className="num-right">{n.attached}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getNetDotStyle(name) {
  const map = {
    proxy_net: 'var(--accent-cyan)', iot_net: 'var(--accent-amber)',
    media_net: 'var(--accent-violet)', dev_net: 'var(--accent-emerald)',
    ai_net: 'var(--accent-rose)', obs_net: 'var(--accent-cyan)',
    cloud_net: 'var(--accent-emerald)', backup_net: 'var(--accent-cyan)',
    net_net: 'var(--accent-violet)', cni0: 'var(--accent-amber)',
  };
  return { background: map[name] || 'var(--canvas-fg-4)' };
}

function HostVolumesPanel({ host }) {
  const total = host.volumes.reduce((acc, v) => {
    // crude size sum
    const m = v.size.match(/([\d.]+)\s*([KMGT]B)/i);
    if (!m) return acc;
    const n = parseFloat(m[1]);
    const u = m[2].toUpperCase();
    const mult = { KB: 1/1024/1024, MB: 1/1024, GB: 1, TB: 1024 }[u] || 0;
    return acc + n * mult;
  }, 0);
  return (
    <div className="panel dk-host-panel">
      <div className="dk-host-head">
        <div className="dk-host-mark" data-role={ROLE_BY_HOST[host.id]}>{host.id.slice(0,2).toUpperCase()}</div>
        <div className="dk-host-id">
          <div className="n">{host.id}</div>
          <div className="meta">{host.volumes.length} volumes</div>
        </div>
        <div className="dk-host-counts">
          <span><b>{total >= 1024 ? (total/1024).toFixed(1) + ' TB' : total.toFixed(1) + ' GB'}</b> <span style={{color:'var(--canvas-fg-3)'}}>TOTAL</span></span>
        </div>
      </div>
      <div className="dk-tbl-wrap">
        <table className="dk-tbl">
          <thead>
            <tr>
              <th>Volume</th>
              <th>Driver</th>
              <th>Size</th>
              <th>Mount point</th>
              <th>Used by</th>
            </tr>
          </thead>
          <tbody>
            {host.volumes.map(v => (
              <tr key={v.name}>
                <td style={{fontWeight:600}}>{v.name}</td>
                <td><span className="driver-pill">{v.driver}</span></td>
                <td className="num-right" style={{color:'var(--canvas-fg-1)', fontWeight:500}}>{v.size}</td>
                <td className="mono-muted" style={{fontSize:11}}>{v.mount}</td>
                <td>
                  <span className="used-by">
                    {v.usedBy.map(u => <span key={u} className="ub-pill">{u}</span>)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DockerView() {
  const D = window.DOCKER_DATA;
  const [tab, setTab] = useState_d('containers');
  const [hostFilter, setHostFilter] = useState_d('all');
  const [query, setQuery] = useState_d('');

  const totalContainers = D.hosts.reduce((a, h) => a + h.containers.length, 0);
  const runningContainers = D.hosts.reduce((a, h) => a + h.containers.filter(c => c.state === 'running').length, 0);
  const totalNetworks = D.hosts.reduce((a, h) => a + h.networks.length, 0);
  const totalVolumes = D.hosts.reduce((a, h) => a + h.volumes.length, 0);

  const filteredHosts = hostFilter === 'all' ? D.hosts : D.hosts.filter(h => h.id === hostFilter);

  return (
    <div className="canvas-inner lab-canvas-inner">
      <div className="page-head" style={{marginBottom:16, paddingBottom:14}}>
        <div>
          <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:6}}>
            <span className="chip violet"><span className="dot"></span>docker · 4 hosts</span>
            <span className="muted mono" style={{fontSize:11}}>scraped via docker socket · every 30s</span>
          </div>
          <h1>Containers <span className="id-tag">/cluster/asgard/docker</span></h1>
          <div className="subtitle">Container runtime inventory across all hosts. Shows live containers, declared networks, and persistent volumes — ports and bind mounts inlined.</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost"><Icon name="refresh" size={13}/> Refresh</button>
          <button className="btn btn-primary"><Icon name="plus" size={13}/> Compose up…</button>
        </div>
      </div>

      <div className="dk-tabs">
        <button className={'dk-tab ' + (tab === 'containers' ? 'active' : '')} onClick={() => setTab('containers')}>
          <Icon name="layers" size={13}/> Containers <span className="ct">{runningContainers}/{totalContainers}</span>
        </button>
        <button className={'dk-tab ' + (tab === 'networks' ? 'active' : '')} onClick={() => setTab('networks')}>
          <Icon name="link" size={13}/> Networks <span className="ct">{totalNetworks}</span>
        </button>
        <button className={'dk-tab ' + (tab === 'volumes' ? 'active' : '')} onClick={() => setTab('volumes')}>
          <Icon name="database" size={13}/> Volumes <span className="ct">{totalVolumes}</span>
        </button>
      </div>

      <div className="dk-toolbar">
        {tab === 'containers' && (
          <div className="search-input" style={{flex:1, maxWidth:340, position:'relative'}}>
            <Icon name="search" size={14}/>
            <input
              className="input"
              placeholder="Filter by name, image, tag…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{height:30, fontSize:12.5, paddingLeft:32}}
            />
          </div>
        )}
        <div className="host-chips">
          {['all', ...D.hosts.map(h => h.id)].map(h => (
            <button
              key={h}
              onClick={() => setHostFilter(h)}
              className="chip gray"
              style={{
                cursor: 'pointer',
                fontFamily: 'var(--mono)',
                padding: '3px 9px',
                ...(hostFilter === h ? {
                  color: 'var(--accent-cyan)',
                  borderColor: 'color-mix(in oklab, var(--accent-cyan) 35%, transparent)',
                  background: 'color-mix(in oklab, var(--accent-cyan) 10%, transparent)',
                } : {}),
              }}
            >
              {h === 'all' ? 'all hosts' : h}
              <span style={{color:'var(--canvas-fg-4)', marginLeft:6}}>
                {h === 'all'
                  ? (tab === 'containers' ? totalContainers : tab === 'networks' ? totalNetworks : totalVolumes)
                  : (() => {
                      const host = D.hosts.find(x => x.id === h);
                      return tab === 'containers' ? host.containers.length : tab === 'networks' ? host.networks.length : host.volumes.length;
                    })()
                }
              </span>
            </button>
          ))}
        </div>
      </div>

      {tab === 'containers' && filteredHosts.map(h => <HostContainersPanel key={h.id} host={h} query={query} />)}
      {tab === 'networks' && filteredHosts.map(h => <HostNetworksPanel key={h.id} host={h} />)}
      {tab === 'volumes' && filteredHosts.map(h => <HostVolumesPanel key={h.id} host={h} />)}
    </div>
  );
}

window.DockerView = DockerView;
