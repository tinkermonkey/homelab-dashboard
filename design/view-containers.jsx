// View — Containers (/cluster/asgard/docker)

const HOST_TINT = {
  nyx: 'cyan', helios: 'emerald', aether: 'violet', vega: 'amber',
};

const ContainerRow = ({ c }) => (
  <div className="ctn-row">
    <span className="ctn-dot" data-s={c.state} />
    <div>
      <div className="ctn-name">
        {c.name}
        <span className="ctn-id">{c.id}</span>
      </div>
      <div className="ctn-image">
        {c.image}<span className="tag">:{c.tag}</span>
      </div>
      <div className="ctn-badges">
        <MiniBadge s={c.state} />
        {c.health && c.health !== c.state && <MiniBadge s={c.health} />}
      </div>
    </div>
    <div className="ctn-detail">
      {c.ports.length > 0 && (
        <div className="ctn-detail-row">
          <div className="k">Ports</div>
          <div className="pills">
            {c.ports.map((p, i) => {
              const [hp, rest] = p.split(':');
              const [cp, proto] = rest.split('/');
              return <span className="port-pill" key={i}>{hp} → {cp} {proto}</span>;
            })}
          </div>
        </div>
      )}
      {c.mounts.length > 0 && (
        <div className="ctn-detail-row">
          <div className="k">Mounts</div>
          <div className="pills">
            {c.mounts.map((m, i) => (
              <span className="mount-pill" key={i}>
                <span className={`typ ${m.type === 'volume' ? 'V' : 'B'}`}>{m.type === 'volume' ? 'V' : 'B'}</span>
                {m.type === 'volume' ? m.name : m.host} → {m.container}
                {m.mode === 'ro' && <span className="ro">RO</span>}
              </span>
            ))}
          </div>
        </div>
      )}
      {c.networks.length > 0 && (
        <div className="ctn-detail-row">
          <div className="k">Net</div>
          <div className="pills">
            {c.networks.map((n, i) => {
              const tint =
                n.includes('proxy') ? 'amber' :
                n.includes('media') ? 'violet' :
                n.includes('iot')   ? 'amber' :
                n.includes('storage') ? 'emerald' :
                n.includes('dev')   ? 'emerald' :
                n.includes('ai')    ? 'amber' :
                n.includes('obs')   ? 'cyan' :
                n.includes('net')   ? 'rose' :
                'neutral';
              return (
                <span className="net-pill" key={i}>
                  <span className="dot" data-c={tint} />
                  {n}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
    <div className="ctn-stats">
      <span className="up">↑ {c.uptime}</span>
      <span className="size">{c.size}</span>
      <span>cpu <b>{c.cpu}%</b> · mem <b>{c.mem >= 1024 ? (c.mem/1024).toFixed(1)+' GB' : c.mem+' MB'}</b></span>
      {c.gpu !== undefined && <span className="gpu">gpu {c.gpu}%</span>}
    </div>
  </div>
);

const HostContainersPanel = ({ host, containers }) => {
  const running = containers.filter(c => c.state === 'running').length;
  return (
    <div className="host-row">
      <header className="host-row-head">
        <RoleMark role={({nyx:'compute',helios:'storage',aether:'k8s',vega:'gpu'})[host.id]} mark={host.id.slice(0,2).toUpperCase()} />
        <div className="info">
          <div className="n">{host.id} <span className="engine">· {host.engine}</span></div>
          <div className="s">{host.compose}</div>
        </div>
        <span className="summary">{running}/{containers.length} running</span>
      </header>
      <div>
        {containers.map(c => <ContainerRow key={c.id} c={c} />)}
      </div>
    </div>
  );
};

const HostNetworksPanel = ({ host }) => (
  <div className="host-row">
    <header className="host-row-head">
      <RoleMark role={({nyx:'compute',helios:'storage',aether:'k8s',vega:'gpu'})[host.id]} mark={host.id.slice(0,2).toUpperCase()} />
      <div className="info">
        <div className="n">{host.id} <span className="engine">· networks</span></div>
        <div className="s">{host.networks.length} bridges</div>
      </div>
      <span className="summary">{host.networks.reduce((s, n) => s + n.attached, 0)} attached</span>
    </header>
    <table className="tbl">
      <thead>
        <tr>
          <th>Network</th>
          <th>Driver</th>
          <th>Subnet</th>
          <th>Gateway</th>
          <th>Scope</th>
          <th className="right">Attached</th>
        </tr>
      </thead>
      <tbody>
        {host.networks.map((n, i) => (
          <tr key={i}>
            <td>
              <span className="net-with-dot">
                <span className="net-dot" style={{ background: `var(--status-${n.dot === 'neutral' ? 'neutral' : n.dot})` }} />
                {n.name}
              </span>
            </td>
            <td><span className="driver-pill">{n.driver}</span></td>
            <td>{n.subnet}</td>
            <td>{n.gateway}</td>
            <td>{n.scope}</td>
            <td className="right">{n.attached}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const HostVolumesPanel = ({ host }) => {
  const totalSize = host.volumes.reduce((s, v) => {
    const n = parseFloat(v.size);
    return s + (v.size.includes('GB') ? n : v.size.includes('MB') ? n / 1024 : n * 1024);
  }, 0);
  return (
    <div className="host-row">
      <header className="host-row-head">
        <RoleMark role={({nyx:'compute',helios:'storage',aether:'k8s',vega:'gpu'})[host.id]} mark={host.id.slice(0,2).toUpperCase()} />
        <div className="info">
          <div className="n">{host.id} <span className="engine">· volumes</span></div>
          <div className="s">{host.volumes.length} volumes · {totalSize.toFixed(1)} GB</div>
        </div>
        <span className="summary">{host.volumes.length} mounts</span>
      </header>
      <table className="tbl">
        <thead>
          <tr>
            <th>Volume</th>
            <th>Driver</th>
            <th className="right">Size</th>
            <th>Mount point</th>
            <th>Used by</th>
          </tr>
        </thead>
        <tbody>
          {host.volumes.map((v, i) => (
            <tr key={i}>
              <td>{v.name}</td>
              <td><span className="driver-pill">{v.driver}</span></td>
              <td className="right">{v.size}</td>
              <td style={{ color: 'var(--canvas-fg-3)' }}>{v.mount}</td>
              <td>
                {v.usedBy.map((u, j) => <span className="used-by-pill" key={j}>{u}</span>)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ContainersView = ({ subroute }) => {
  const initialTab =
    subroute === 'networks' ? 'networks' :
    subroute === 'volumes'  ? 'volumes'  : 'containers';
  const [tab, setTab] = React.useState(initialTab);
  React.useEffect(() => { setTab(initialTab); }, [initialTab]);
  const [hostFilter, setHostFilter] = React.useState('all');
  const [q, setQ] = React.useState('');

  const totalContainers = DOCKER_DATA.hosts.reduce((s, h) => s + h.containers.length, 0);
  const runningContainers = DOCKER_DATA.hosts.reduce((s, h) => s + h.containers.filter(c => c.state === 'running').length, 0);
  const totalNetworks = DOCKER_DATA.hosts.reduce((s, h) => s + h.networks.length, 0);
  const totalVolumes = DOCKER_DATA.hosts.reduce((s, h) => s + h.volumes.length, 0);
  const perHostCount = DOCKER_DATA.hosts.reduce((m, h) => { m[h.id] = h.containers.length; return m; }, {});

  const filteredHosts = DOCKER_DATA.hosts.filter(h => hostFilter === 'all' || h.id === hostFilter);

  const filterContainers = (containers) => {
    if (!q) return containers;
    const ql = q.toLowerCase();
    return containers.filter(c =>
      c.name.toLowerCase().includes(ql) ||
      c.image.toLowerCase().includes(ql) ||
      c.tag.toLowerCase().includes(ql)
    );
  };

  return (
    <>
      <PageHead
        eyebrow={<>
          <Chip tone="violet">docker · 4 hosts</Chip>
          <span className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
            scraped via docker socket · every 30 s
          </span>
        </>}
        title="Containers"
        idTag="/cluster/asgard/docker"
        subtitle="Containers, networks, and volumes across every host. Filter by host or search by name, image, or tag."
        actions={<>
          <Button variant="ghost" icon="refresh">Refresh</Button>
          <Button variant="primary" icon="play">Compose up…</Button>
        </>}
      />

      <div className="tabs">
        <button className={`tab ${tab === 'containers' ? 'active' : ''}`} onClick={() => setTab('containers')}>
          <Icon name="layers" size={14} />
          Containers
          <span className="count">{runningContainers}/{totalContainers}</span>
        </button>
        <button className={`tab ${tab === 'networks' ? 'active' : ''}`} onClick={() => setTab('networks')}>
          <Icon name="network" size={14} />
          Networks
          <span className="count">{totalNetworks}</span>
        </button>
        <button className={`tab ${tab === 'volumes' ? 'active' : ''}`} onClick={() => setTab('volumes')}>
          <Icon name="database" size={14} />
          Volumes
          <span className="count">{totalVolumes}</span>
        </button>
      </div>

      <div className="toolbar">
        {tab === 'containers' && (
          <div className="search-input">
            <Icon name="search" size={13} />
            <input placeholder="Filter by name, image, or tag…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
        )}
        <div className="row-flex">
          <button className={`cat-chip ${hostFilter === 'all' ? 'active' : ''}`} onClick={() => setHostFilter('all')}>
            all hosts <span className="count">({totalContainers})</span>
          </button>
          {DOCKER_DATA.hosts.map(h => (
            <button key={h.id}
              className={`cat-chip ${hostFilter === h.id ? 'active' : ''}`}
              onClick={() => setHostFilter(h.id)}>
              {h.id} <span className="count">({perHostCount[h.id]})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="col-flex" style={{ gap: 14 }}>
        {tab === 'containers' && filteredHosts.map(h => (
          <HostContainersPanel key={h.id} host={h} containers={filterContainers(h.containers)} />
        ))}
        {tab === 'networks' && filteredHosts.map(h => (
          <HostNetworksPanel key={h.id} host={h} />
        ))}
        {tab === 'volumes' && filteredHosts.map(h => (
          <HostVolumesPanel key={h.id} host={h} />
        ))}
      </div>
    </>
  );
};

window.ContainersView = ContainersView;
