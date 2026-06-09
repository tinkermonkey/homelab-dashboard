// view-containers.jsx — /cluster/asgard/docker (containers · networks · volumes)
// Real components: PageHeader, TabBar, FilterBar, Panel, Table, Chip,
// VersionPill, RowMenu, Icon.

const HEALTH_COLOR = { healthy: 'emerald', degraded: 'amber', unhealthy: 'rose', failed: 'rose', pulling: 'cyan', exited: 'neutral' };
const CSTATE_COLOR = { running: 'emerald', exited: 'neutral', updating: 'cyan' };
const NET_DOT = { amber: 'var(--status-amber)', violet: 'var(--status-violet)', cyan: 'var(--status-cyan)', emerald: 'var(--status-emerald)', rose: 'var(--status-rose)', neutral: 'var(--canvas-fg-4)' };

const CTN_ACTIONS = [
  { id: 'restart', label: 'Restart', icon: 'refresh' },
  { id: 'logs', label: 'View logs', icon: 'file' },
  { id: 'stop', label: 'Stop', icon: 'x' },
  { type: 'separator' },
  { id: 'remove', label: 'Remove', icon: 'trash', danger: true },
];

function HostContainers({ host, query, onAction }) {
  const list = host.containers.filter(c =>
    !query || c.name.toLowerCase().includes(query) || c.image.toLowerCase().includes(query));
  if (list.length === 0) return null;
  const running = host.containers.filter(c => c.state === 'running').length;

  const columns = [
    { key: 'name', label: 'Container', width: '24%', render: (v, c) => (
        <div><div className="cell-name">{c.name}</div><div className="cell-sub">{c.id}</div></div>) },
    { key: 'image', label: 'Image', width: '26%', render: (v, c) => (
        <div className="cell-mono">{c.image}<span style={{ color: 'rgb(var(--accent-primary-deep))' }}>:{c.tag}</span></div>) },
    { key: 'state', label: 'State', width: '11%', render: (v) => <Chip variant={CSTATE_COLOR[v] || 'neutral'}>{v}</Chip> },
    { key: 'health', label: 'Health', width: '11%', render: (v) => <Chip variant={HEALTH_COLOR[v] || 'neutral'}>{v}</Chip> },
    { key: 'ports', label: 'Ports', width: '16%', render: (v) => (
        <div className="row row--wrap" style={{ gap: 4 }}>{v.length ? v.map((p, i) => <span key={i} className="port-pill">{p.split('/')[0]}</span>) : <span className="muted mono">—</span>}</div>) },
    { key: 'cpu', label: 'CPU · MEM', width: '8%', render: (v, c) => <span className="cell-mono">{c.cpu}% · {c.mem ? (c.mem / 1024).toFixed(1) + 'g' : '0'}</span> },
    { key: 'id', label: '', width: '4%', render: (v, c) => <RowMenu actions={CTN_ACTIONS} placement="bottom-end" onAction={(a) => onAction(a, c)} /> },
  ];
  return (
    <Panel noPadding
      title={host.id} subtitle={`${host.engine} · ${host.compose}`}
      headerAction={<span className="tag-pill">{running}/{host.containers.length} running</span>}>
      <Table columns={columns} data={list} rowKey="id" />
    </Panel>
  );
}

function NetworksTab() {
  const rows = [];
  DOCKER_DATA.hosts.forEach(h => h.networks.forEach(n => rows.push({ ...n, host: h.id, _k: h.id + '/' + n.name })));
  const columns = [
    { key: 'name', label: 'Network', width: '20%', render: (v, n) => (
        <span className="row" style={{ gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: 9, background: NET_DOT[n.dot] }} /><span className="cell-name" style={{ fontSize: 12.5 }}>{v}</span></span>) },
    { key: 'host', label: 'Host', width: '12%', render: (v) => <span className="cell-mono">{v}</span> },
    { key: 'driver', label: 'Driver', width: '12%', render: (v) => <span className="tag-pill">{v}</span> },
    { key: 'subnet', label: 'Subnet', width: '18%', render: (v) => <span className="cell-mono">{v}</span> },
    { key: 'gateway', label: 'Gateway', width: '16%', render: (v) => <span className="cell-mono">{v}</span> },
    { key: 'scope', label: 'Scope', width: '10%', render: (v) => <span className="cell-mono">{v}</span> },
    { key: 'attached', label: 'Attached', width: '12%', render: (v) => <span className="cell-mono">{v} ctr</span> },
  ];
  return <Panel noPadding title="Networks" subtitle={`${rows.length} bridge networks across ${DOCKER_DATA.hosts.length} hosts`}>
    <Table columns={columns} data={rows} rowKey="_k" /></Panel>;
}

function VolumesTab() {
  const rows = [];
  DOCKER_DATA.hosts.forEach(h => h.volumes.forEach(v => rows.push({ ...v, host: h.id, _k: h.id + '/' + v.name })));
  const columns = [
    { key: 'name', label: 'Volume', width: '20%', render: (v) => <span className="cell-name" style={{ fontSize: 12.5 }}>{v}</span> },
    { key: 'host', label: 'Host', width: '10%', render: (v) => <span className="cell-mono">{v}</span> },
    { key: 'driver', label: 'Driver', width: '10%', render: (v) => <span className="tag-pill">{v}</span> },
    { key: 'size', label: 'Size', width: '12%', render: (v) => <span className="cell-mono">{v}</span> },
    { key: 'usedBy', label: 'Used by', width: '20%', render: (v) => <div className="row row--wrap" style={{ gap: 4 }}>{v.map((u, i) => <span key={i} className="tag-pill">{u}</span>)}</div> },
    { key: 'mount', label: 'Mountpoint', width: '28%', render: (v) => <span className="cell-mono" style={{ color: 'rgb(var(--canvas-fg-3))' }}>{v}</span> },
  ];
  return <Panel noPadding title="Volumes" subtitle={`${rows.length} local volumes`}><Table columns={columns} data={rows} rowKey="_k" /></Panel>;
}

const CTN_TABS = [
  { id: 'containers', label: 'Containers' }, { id: 'networks', label: 'Networks' }, { id: 'volumes', label: 'Volumes' },
];

function ContainersView({ subroute, setRoute }) {
  const tab = subroute || 'containers';
  const [query, setQuery] = React.useState('');
  const [toast, setToast] = React.useState(null);
  const totalCtn = DOCKER_DATA.hosts.reduce((n, h) => n + h.containers.length, 0);
  const tabs = CTN_TABS.map(t => ({ ...t, count: t.id === 'containers' ? totalCtn
    : t.id === 'networks' ? DOCKER_DATA.hosts.reduce((n, h) => n + h.networks.length, 0)
    : DOCKER_DATA.hosts.reduce((n, h) => n + h.volumes.length, 0) }));

  const onAction = (action, c) => { setToast(`${action} · ${c.name}`); setTimeout(() => setToast(null), 1800); };

  return (
    <>
      <PageHeader
        eyebrow={<span className="eyebrow-row"><Chip variant="cyan">docker · 4 engines</Chip>
          <span className="mono-meta">{totalCtn} containers · {DOCKER_DATA.hosts.reduce((n,h)=>n+h.containers.filter(c=>c.state==='running').length,0)} running</span></span>}
        title="Containers" idChip="/cluster/asgard/docker"
        subtitle="Docker inventory aggregated across every host engine — state, health, ports, and mounts."
        actions={<div className="row"><Button variant="secondary"><Icon name="refresh" size={14} />Prune</Button>
          <Button variant="primary"><Icon name="plus" size={14} />Deploy</Button></div>} />

      <TabBar tabs={tabs} activeTabId={tab} onSelectTab={(t) => setRoute('containers' + (t === 'containers' ? '' : '/' + t))} />

      {tab === 'containers' && <>
        <FilterBar searchPlaceholder="Filter containers by name or image…" value={query}
          onSearchChange={(v) => setQuery(v.toLowerCase())} showingCount={
            DOCKER_DATA.hosts.reduce((n, h) => n + h.containers.filter(c => !query || c.name.toLowerCase().includes(query) || c.image.toLowerCase().includes(query)).length, 0)
          } totalCount={totalCtn} />
        {DOCKER_DATA.hosts.map(h => <HostContainers key={h.id} host={h} query={query} onAction={onAction} />)}
      </>}
      {tab === 'networks' && <NetworksTab />}
      {tab === 'volumes' && <VolumesTab />}

      {toast && <div className="lab-toast">{toast}</div>}
    </>
  );
}

window.ContainersView = ContainersView;
