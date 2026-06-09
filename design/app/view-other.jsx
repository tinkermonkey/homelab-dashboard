// view-other.jsx — Servers · Bots · Apps · Storage · Logs · Settings
// Real components throughout: PageHeader, Panel, Table, ProgressBar, Chip,
// Avatar, KVGrid, StatGrid, StatTile, QuickAccessGrid, ConfigTile,
// LogStream, Select, Field, TextInput, TriState, Button, Icon.

const SRV_ACTIONS = [
  { id: 'ssh', label: 'Open SSH', icon: 'terminal' },
  { id: 'metrics', label: 'Grafana metrics', icon: 'bar-chart' },
  { id: 'reboot', label: 'Reboot', icon: 'power' },
  { type: 'separator' },
  { id: 'drain', label: 'Drain & cordon', icon: 'slash', danger: true },
];

function bar(percent, color) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <div style={{ flex: 1, minWidth: 60 }}><ProgressBar percent={percent} color={color} height={6} /></div>
    <span className="cell-mono" style={{ width: 34, textAlign: 'right' }}>{percent}%</span></div>;
}

function ServersView() {
  const cols = [
    { key: 'id', label: 'Host', width: '20%', render: (v, s) => (
        <div className="row" style={{ gap: 10 }}><Avatar name={v} color={ROLE_COLOR[s.role]} size="sm" shape="rounded" decorative />
          <div><div className="cell-name">{v}</div><div className="cell-sub">{s.ip}</div></div></div>) },
    { key: 'role', label: 'Role', width: '12%', render: (v) => <Chip variant={ROLE_COLOR[v]}>{v}</Chip> },
    { key: 'cpu', label: 'CPU', width: '15%', render: (v, s) => bar(s.cpu.v, s.cpu.v >= 75 ? 'amber' : 'cyan') },
    { key: 'mem', label: 'Memory', width: '15%', render: (v, s) => bar(s.mem.v, s.mem.v >= 80 ? 'amber' : 'violet') },
    { key: 'disk', label: 'Disk', width: '15%', render: (v, s) => bar(s.disk.v, s.disk.v >= 85 ? 'amber' : 'emerald') },
    { key: 'uptime', label: 'Uptime', width: '13%', render: (v) => <span className="cell-mono">{v}</span> },
    { key: 'containers', label: '', width: '10%', render: (v, s) => <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}><span className="tag-pill">{v} ctr</span><RowMenu actions={SRV_ACTIONS} placement="bottom-end" onAction={() => {}} /></div> },
  ];
  return (
    <>
      <PageHeader eyebrow={<span className="eyebrow-row"><Chip variant="cyan">hosts · 4</Chip><span className="mono-meta">all reachable · polled 15 s</span></span>}
        title="Servers" idChip="/cluster/asgard/servers"
        subtitle="Physical and virtual hosts in the asgard cluster."
        actions={<Button variant="secondary"><Icon name="plus" size={14} />Add host</Button>} />
      <Panel noPadding><Table columns={cols} data={LAB_DATA.servers} rowKey="id" /></Panel>
    </>
  );
}

function BotCard({ b }) {
  const t = TOPOLOGY_DATA.bots.find(x => x.id === b.id) || {};
  const statusTone = b.status === 'ok' ? 'emerald' : b.status === 'busy' ? 'amber' : 'neutral';
  const kv = [
    { key: 'model', value: <span className="mono">{b.model}</span> },
    { key: 'host', value: <span className="mono">{t.host || '—'}</span> },
    { key: 'mcp', value: `${(t.mcps || []).length} servers` },
    { key: 'manages', value: `${(t.manages || []).length} services` },
  ];
  return (
    <Panel title={b.label} subtitle={b.role}
      headerAction={<span className="row" style={{ gap: 6 }}><PulseDot tone={statusTone} sm /><span className="mono muted" style={{ fontSize: 11 }}>{b.status}</span></span>}>
      <div className="row" style={{ gap: 12, marginBottom: 12 }}>
        <Avatar name={b.label} color={statusTone} size="lg" shape="rounded" decorative />
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: 'rgb(var(--canvas-fg-2))' }}>{b.desc}</p>
      </div>
      <KVGrid rows={kv} keyWidth={76} />
      {(t.mcps || []).length > 0 && <>
        <div style={{ margin: '12px 0 6px', fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgb(var(--canvas-fg-3))' }}>MCP servers</div>
        <div className="row row--wrap" style={{ gap: 5 }}>{t.mcps.map(m => <Chip key={m.id} variant={m.kind === 'remote' ? 'violet' : 'neutral'}>{m.label}</Chip>)}</div>
      </>}
    </Panel>
  );
}

function BotsView({ setRoute }) {
  return (
    <>
      <PageHeader eyebrow={<span className="eyebrow-row"><Chip variant="amber">agents · {LAB_DATA.bots.length}</Chip><span className="mono-meta">claude · sonnet + haiku</span></span>}
        title="Bots" idChip="/cluster/asgard/bots"
        subtitle="The agent mesh that operates the homelab. Open topology to see how they relate."
        actions={<Button variant="secondary" onClick={() => setRoute('topology')}><Icon name="graph" size={14} />View topology</Button>} />
      <div className="grid-2">{LAB_DATA.bots.map(b => <BotCard key={b.id} b={b} />)}</div>
    </>
  );
}

function AppsView() {
  return (
    <>
      <PageHeader eyebrow={<span className="eyebrow-row"><Chip variant="cyan">services · {LAB_DATA.apps.length}</Chip><span className="mono-meta">scraped every 15 s</span></span>}
        title="Applications" idChip="/cluster/asgard/apps"
        subtitle="Every service deployed across the cluster, by category."
        actions={<Button variant="primary"><Icon name="plus" size={14} />New service</Button>} />
      <AppsPanel apps={LAB_DATA.apps} />
    </>
  );
}

function StorageView() {
  const allVols = [];
  DOCKER_DATA.hosts.forEach(h => h.volumes.forEach(v => allVols.push({ ...v, host: h.id, _k: h.id + v.name })));
  const pools = [
    { id: 'tank', icon: 'hardDrive', title: 'tank · ZRAID2', description: '8×16 TB · 52.1/90 TB used' },
    { id: 'fast', icon: 'zap', title: 'fast · NVMe mirror', description: '2×2 TB · 1.2/2 TB used' },
    { id: 'backup', icon: 'shield', title: 'backup · restic', description: 'offsite B2 · last 04:00' },
    { id: 'cache', icon: 'layers', title: 'l2arc cache', description: '480 GB · 78% hit rate' },
  ];
  const cols = [
    { key: 'name', label: 'Volume', width: '24%', render: (v) => <span className="cell-name" style={{ fontSize: 12.5 }}>{v}</span> },
    { key: 'host', label: 'Host', width: '12%', render: (v) => <span className="cell-mono">{v}</span> },
    { key: 'size', label: 'Size', width: '12%', render: (v) => <span className="cell-mono">{v}</span> },
    { key: 'usedBy', label: 'Used by', width: '24%', render: (v) => <div className="row row--wrap" style={{ gap: 4 }}>{v.map((u, i) => <span key={i} className="tag-pill">{u}</span>)}</div> },
    { key: 'mount', label: 'Mountpoint', width: '28%', render: (v) => <span className="cell-mono muted">{v}</span> },
  ];
  return (
    <>
      <PageHeader eyebrow={<span className="eyebrow-row"><Chip variant="emerald">storage · helios</Chip><span className="mono-meta">TrueNAS Core · ZFS</span></span>}
        title="Storage" idChip="/cluster/asgard/storage"
        subtitle="Pools, datasets and Docker volumes across the cluster."
        actions={<Button variant="secondary"><Icon name="download" size={14} />Snapshot now</Button>} />
      <StatGrid columns={4}>
        <StatTile color="emerald" label="Capacity used" value="53.3 TB" meta="of 92 TB" metaIcon="hardDrive" />
        <StatTile color="cyan" label="Volumes" value={allVols.length} meta="docker · local" metaIcon="layers" />
        <StatTile color="violet" label="Snapshots" value="1,284" meta="retain 30d" metaIcon="copy" />
        <StatTile color="amber" label="Last backup" value="04:00" meta="restic → B2" metaIcon="shield" />
      </StatGrid>
      <Panel title="Pools & jobs" subtitle="ZFS pools and backup targets" noPadding>
        <div style={{ padding: 14 }}><QuickAccessGrid columns={4} tiles={pools} onAction={() => {}} /></div>
      </Panel>
      <Panel noPadding title="Docker volumes" subtitle={`${allVols.length} volumes`}>
        <Table columns={cols} data={allVols} rowKey="_k" />
      </Panel>
    </>
  );
}

function synthLogs() {
  const ops = [
    ['INFO', 'ops-bot', 'nyx', 'docker compose up -d jellyfin → recreated 1 container'],
    ['INFO', 'watch-bot', 'aether', 'prometheus rule eval ok · 142 series'],
    ['WARN', 'watch-bot', 'aether', 'MEM 81% sustained 12m on aether — threshold 80%'],
    ['ERROR', 'sync-bot', 'helios', 'nextcloud healthcheck failed: redis connection refused'],
    ['INFO', 'sync-bot', 'helios', 'restic backup completed · 2.4 GB · 1m41s'],
    ['DEBUG', 'lab-bot', 'nyx', 'routed intent "disk usage" → watch-bot'],
    ['INFO', 'ops-bot', 'vega', 'pulling whisper.cpp:large-v3 · 64%'],
    ['INFO', 'traefik', 'aether', '200 GET grafana.lab.local 14ms'],
    ['WARN', 'pihole', 'aether', 'blocklist update: 3 lists stale > 7d'],
    ['INFO', 'ops-bot', 'vega', 'ollama loaded llama3.1:70b into 2× RTX 4090'],
  ];
  const now = Date.now();
  const out = [];
  for (let i = 0; i < 40; i++) {
    const o = ops[i % ops.length];
    out.push({ id: 'l' + i, timestamp: new Date(now - (40 - i) * 37000), level: o[0], op: o[1], target: o[2], message: o[3] });
  }
  return out;
}

function LogsView() {
  const [level, setLevel] = React.useState('');
  const all = React.useMemo(synthLogs, []);
  const entries = level ? all.filter(e => e.level === level) : all;
  return (
    <>
      <PageHeader eyebrow={<span className="eyebrow-row"><Chip variant="cyan">logs · loki</Chip><span className="mono-meta">ingest 412 lps · retain 30d</span></span>}
        title="Logs" idChip="/cluster/asgard/logs"
        subtitle="Unified operational log stream across hosts and agents."
        actions={<div className="row" style={{ width: 200 }}>
          <Select placeholder="All levels" value={level} onChange={setLevel} ariaLabel="Level filter">
            <Select.Item value="">All levels</Select.Item>
            <Select.Item value="INFO">INFO</Select.Item>
            <Select.Item value="WARN">WARN</Select.Item>
            <Select.Item value="ERROR">ERROR</Select.Item>
            <Select.Item value="DEBUG">DEBUG</Select.Item>
          </Select></div>} />
      <Panel noPadding title="Live stream" subtitle={`${entries.length} lines`}>
        <LogStream entries={entries} showOps follow style={{ height: 460 }} />
      </Panel>
    </>
  );
}

function SettingsView() {
  const [name, setName] = React.useState('asgard');
  const [theme, setTheme] = React.useState('dark');
  const sections = [
    { id: 'cluster', icon: 'settings', title: 'Cluster', description: 'Name, domain, polling cadence' },
    { id: 'access', icon: 'lock', title: 'Access & SSO', description: 'OIDC, sessions, API tokens' },
    { id: 'alerts', icon: 'bell', title: 'Alerting', description: 'Routes, silences, thresholds' },
    { id: 'backup', icon: 'shield', title: 'Backups', description: 'restic targets & schedule' },
  ];
  return (
    <>
      <PageHeader eyebrow={<span className="eyebrow-row"><Chip variant="neutral">settings</Chip></span>}
        title="Configuration" idChip="/cluster/asgard/settings"
        subtitle="Cluster-wide preferences for the Heimdall control plane." />
      <Panel title="Sections" noPadding>
        <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
          {sections.map(s => <ConfigTile key={s.id} icon={s.icon} title={s.title} description={s.description} onClick={() => {}} />)}
        </div>
      </Panel>
      <Panel title="General" subtitle="cluster identity & display">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 460 }}>
          <Field label="Cluster name" hint="shown in the topbar"><TextInput value={name} onChange={e => setName(e.target.value)} mono /></Field>
          <Field label="Default theme">
            <Select value={theme} onChange={setTheme} ariaLabel="Theme">
              <Select.Item value="dark">Dark canvas</Select.Item>
              <Select.Item value="light">Light canvas</Select.Item>
            </Select>
          </Field>
          <Field label="Telemetry">
            <label className="row" style={{ gap: 8, fontSize: 13, color: 'rgb(var(--canvas-fg-2))' }}>
              <TriState checked readOnly /> Send anonymous usage metrics
            </label>
          </Field>
          <div className="row" style={{ gap: 8 }}><Button variant="primary">Save changes</Button><Button variant="ghost">Reset</Button></div>
        </div>
      </Panel>
    </>
  );
}

Object.assign(window, { ServersView, BotsView, AppsView, StorageView, LogsView, SettingsView });
