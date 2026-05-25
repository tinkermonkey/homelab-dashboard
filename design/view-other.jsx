// Supplementary views — Servers list, Bots registry, and placeholder stubs

const ServersView = ({ subroute }) => (
  <>
    <PageHead
      eyebrow={<>
        <Chip tone="emerald">hosts · 4 up</Chip>
        <span className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
          metricbeat · prometheus node_exporter
        </span>
      </>}
      title="Servers"
      idTag="/cluster/asgard/servers"
      subtitle="Per-host CPU, memory, disk, and network. Click a row to drill into hardware, sensors, and full process tree."
      actions={<>
        <Button variant="ghost" icon="refresh">Refresh</Button>
        <Button variant="primary" icon="terminal">SSH lab-bot</Button>
      </>}
    />
    <Panel flush>
      <div className="server-list-card">
        <div className="server-row head">
          <span />
          <span>Host</span>
          <span>CPU</span>
          <span>Memory</span>
          <span>Disk</span>
          <span>Network</span>
          <span>Uptime</span>
        </div>
        {LAB_DATA.servers.map(s => (
          <div className="server-row" key={s.id}
            style={subroute === s.id ? { background: 'rgba(251,191,36,0.06)', boxShadow: 'inset 2px 0 0 0 var(--accent-primary)' } : undefined}>
            <RoleMark role={s.role} mark={s.mark} />
            <div>
              <div className="n">{s.id}</div>
              <div className="s">{s.hostname} · {s.model}</div>
            </div>
            <div className="metric-mini">
              <span className="v">{s.cpu.v}%</span>
              <div className="bar-track">
                <div className="bar-fill" data-tone={metricTone('CPU', s.cpu.v)} style={{ width: `${s.cpu.v}%` }} />
              </div>
            </div>
            <div className="metric-mini">
              <span className="v">{s.mem.used}/{s.mem.total} {s.mem.unit}</span>
              <div className="bar-track">
                <div className="bar-fill" data-tone={metricTone('MEM', s.mem.v)} style={{ width: `${s.mem.v}%` }} />
              </div>
            </div>
            <div className="metric-mini">
              <span className="v">{s.disk.used}/{s.disk.total} {s.disk.unit}</span>
              <div className="bar-track">
                <div className="bar-fill" data-tone={metricTone('DISK', s.disk.v)} style={{ width: `${s.disk.v}%` }} />
              </div>
            </div>
            <div className="metric-mini">
              <span className="v">↓{s.net.down} ↑{s.net.up}</span>
              <Spark values={s.net.hist} w={140} h={16} tone="cyan" />
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{s.uptime}</div>
          </div>
        ))}
      </div>
    </Panel>
  </>
);

const BotsView = ({ subroute }) => (
  <>
    <PageHead
      eyebrow={<>
        <Chip tone="violet">bots · 4 deployed</Chip>
        <span className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
          phone-home registry · agent:3210
        </span>
      </>}
      title="Bots"
      idTag="/cluster/asgard/bots"
      subtitle="Registered agents, their MCP sidecars, and managed surface. Open Topology to see the delegation graph."
      actions={<>
        <Button variant="ghost" icon="refresh">Refresh</Button>
        <Button variant="primary" icon="plus">Add bot</Button>
      </>}
    />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
      {TOPOLOGY_DATA.bots.map(b => (
        <Panel key={b.id} flush>
          <header className="panel-head" style={subroute === b.id ? { background: 'rgba(251,191,36,0.06)' } : undefined}>
            <div className="panel-title">
              <span className="bot-avatar" data-id={b.id} style={{ width: 28, height: 28, fontSize: 11 }}>{b.avatar}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span>{b.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--canvas-fg-3)', fontWeight: 500 }}>
                  {b.role} · {b.host}
                </span>
              </div>
            </div>
            <div className="row-flex">
              <Pulse tone={b.status === 'busy' ? 'amber' : b.status === 'idle' ? 'neutral' : 'emerald'} size="sm" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--canvas-fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{b.status}</span>
            </div>
          </header>
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 12.5, color: 'var(--canvas-fg-2)', lineHeight: 1.55 }}>{b.desc}</p>
            <div className="kv" style={{ gridTemplateColumns: '92px 1fr' }}>
              <div className="k">Model</div><div className="v">{b.model}</div>
              <div className="k">MCPs</div><div className="v">{b.mcps.map(m => m.label).join(' · ')}</div>
              <div className="k">Manages</div><div className="v">{b.manages.length} projects</div>
              {b.delegates.length > 0 && <><div className="k">Delegates</div><div className="v">{b.delegates.join(' · ')}</div></>}
            </div>
          </div>
        </Panel>
      ))}
    </div>
  </>
);

// Storage / Apps / Logs / Settings — focused placeholder cards with route context
const PlaceholderView = ({ icon, title, idTag, eyebrow, subtitle, items }) => (
  <>
    <PageHead
      eyebrow={eyebrow}
      title={title}
      idTag={idTag}
      subtitle={subtitle}
      actions={<><Button variant="ghost" icon="refresh">Refresh</Button></>}
    />
    <Panel icon={icon} title={`${title} surface`} sub="full drill-down" flush>
      <div className="placeholder-card">
        <span className="icon"><Icon name={icon} size={22} /></span>
        <h2>{title} view in progress</h2>
        <p style={{ fontSize: 13, color: 'var(--canvas-fg-3)' }}>
          This route is a placeholder in the reference. The composition reuses the same Heimdall shell, page-head, panels, chips, and table primitives you see across Overview / Containers / Network — see those for the full pattern.
        </p>
        {items && (
          <div className="row-flex" style={{ flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
            {items.map((x, i) => <Chip key={i} tone="amber" dot={false}>{x}</Chip>)}
          </div>
        )}
      </div>
    </Panel>
  </>
);

const AppsView = () => (
  <>
    <PageHead
      eyebrow={<>
        <Chip tone="emerald">applications · {LAB_DATA.apps.length}</Chip>
        <span className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
          scraped every 30 s · all hosts
        </span>
      </>}
      title="Applications"
      idTag="/cluster/asgard/apps"
      subtitle="Every deployed service, grouped by host. Search, filter, restart, or upgrade — all routed through ops-bot."
      actions={<>
        <Button variant="ghost" icon="refresh">Refresh</Button>
        <Button variant="primary" icon="plus">Deploy app…</Button>
      </>}
    />
    <AppsPanel apps={LAB_DATA.apps} />
  </>
);

const StorageView = () => PlaceholderView({
  icon: 'database',
  title: 'Storage',
  idTag: '/cluster/asgard/storage',
  eyebrow: <>
    <Chip tone="emerald">helios · ZRAID2</Chip>
    <span className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
      52.1 / 90 TB used · 4 datasets
    </span>
  </>,
  subtitle: 'ZFS pool, snapshots, restic repositories, and offsite replication state.',
  items: ['tank · 90 TB', 'tank/media', 'tank/docs', 'tank/iso', 'b2-offsite', 'restic-latest'],
});

const LogsView = () => PlaceholderView({
  icon: 'history',
  title: 'Logs',
  idTag: '/cluster/asgard/logs',
  eyebrow: <>
    <Chip tone="cyan">loki · 412 lps</Chip>
    <span className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>retention 30 d · 4 streams</span>
  </>,
  subtitle: 'LogQL tail across every host. Pipes into watch-bot for anomaly summarisation.',
  items: ['{host="aether"}', '{app="traefik"}', '{level="error"}', 'last 1h', 'last 24h'],
});

const SettingsView = () => PlaceholderView({
  icon: 'settings',
  title: 'Configuration',
  idTag: '/cluster/asgard/settings',
  eyebrow: <>
    <Chip tone="amber">workspace</Chip>
    <span className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
      ~/lab/asgard · main
    </span>
  </>,
  subtitle: 'Workspace preferences, MCP credentials, user roles, polling cadences, and dashboard theme.',
  items: ['general', 'mcp credentials', 'polling', 'theme', 'shortcuts', 'integrations'],
});

Object.assign(window, { ServersView, BotsView, AppsView, StorageView, LogsView, SettingsView });
