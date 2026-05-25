// App shell — titlebar, sidebar, topbar, statusbar
const { Fragment } = React;

// Hierarchical nav tree — top-level entries with optional `children`
// Following the DS pattern from ui_kits/context-studio/Shell.jsx.
const NAV_TREE = [
  { id: 'overview', label: 'Overview', icon: 'dashboard' },
  { id: 'servers', label: 'Servers', icon: 'cpu', count: '4', children: [
    { id: 'servers/nyx',    label: 'nyx',    count: 'compute' },
    { id: 'servers/helios', label: 'helios', count: 'storage' },
    { id: 'servers/aether', label: 'aether', count: 'k8s' },
    { id: 'servers/vega',   label: 'vega',   count: 'gpu' },
  ]},
  { id: 'containers', label: 'Containers', icon: 'layers', count: '31', children: [
    { id: 'containers/list',     label: 'Containers', count: '25/31' },
    { id: 'containers/networks', label: 'Networks',   count: '17' },
    { id: 'containers/volumes',  label: 'Volumes',    count: '15' },
  ]},
  { id: 'network',  label: 'Network',      icon: 'network' },
  { id: 'apps',     label: 'Applications', icon: 'workflow', count: '28' },
  { id: 'storage',  label: 'Storage',      icon: 'database', count: '90 TB' },
  { id: 'bots',     label: 'Bots',         icon: 'bot', count: '4', children: [
    { id: 'bots/lab-bot',   label: 'lab-bot',   count: 'concierge' },
    { id: 'bots/ops-bot',   label: 'ops-bot',   count: 'ops' },
    { id: 'bots/watch-bot', label: 'watch-bot', count: 'alerts' },
    { id: 'bots/sync-bot',  label: 'sync-bot',  count: 'backup' },
  ]},
  { id: 'topology', label: 'Topology',    icon: 'graph' },
  { id: 'logs',     label: 'Logs',        icon: 'history' },
  { id: 'settings', label: 'Configuration', icon: 'settings' },
];

// Build a flat label map for breadcrumbs
const NAV_LABELS = (() => {
  const m = {};
  NAV_TREE.forEach(it => {
    m[it.id] = [it.label];
    (it.children || []).forEach(c => { m[c.id] = [it.label, c.label]; });
  });
  return m;
})();

// Breadcrumb path per route
const CRUMBS_BASE = ['/', 'cluster', 'asgard'];
function crumbsFor(route) {
  return [...CRUMBS_BASE, ...(NAV_LABELS[route] || ['overview']).map(s => s.toLowerCase())];
}

const Sidebar = ({ route, setRoute, collapsed, setCollapsed }) => {
  const top = route.split('/')[0];
  const isActive       = (id) => route === id || route.startsWith(id + '/');
  const isLeafActive   = (id) => route === id;
  const isExpanded     = (id) => isActive(id);

  return (
    <aside className={`shell-rail ${collapsed ? 'collapsed' : ''}`}>
      <div className="brand-row">
        <span className="brand-mark"><i /></span>
        <div className="brand-name">
          asgard
          <span>homelab · v3.2</span>
        </div>
        <button className="rail-collapse"
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Toggle sidebar">
          <Icon name={collapsed ? 'chevRight' : 'chevLeft'} size={11} />
        </button>
      </div>
      <nav className="nav-section">
        {NAV_TREE.flatMap((item) => {
          const expanded = isExpanded(item.id);
          const rows = [];
          rows.push(
            <div
              key={item.id}
              className={'nav-item ' + (item.children
                ? (isActive(item.id) ? 'active-parent' : '')
                : (isLeafActive(item.id) ? 'active' : ''))}
              onClick={() => setRoute(item.children ? item.children[0].id : item.id)}
              title={collapsed ? item.label : undefined}>
              <Icon name={item.icon} size={15} />
              <span className="nav-label">{item.label}</span>
              {item.count != null && !item.children && <span className="nav-count">{item.count}</span>}
              {item.children && !collapsed && (
                <Icon name={expanded ? 'chevDown' : 'chevRight'} size={12} />
              )}
            </div>
          );
          if (item.children && expanded && !collapsed) {
            rows.push(
              <div key={item.id + ':sub'} className="nav-sub">
                {item.children.map(c => (
                  <div key={c.id}
                    className={'nav-item ' + (route === c.id ? 'active' : '')}
                    onClick={() => setRoute(c.id)}>
                    <span className="nav-label">{c.label}</span>
                    {c.count != null && <span className="nav-count">{c.count}</span>}
                  </div>
                ))}
              </div>
            );
          }
          return rows;
        })}
      </nav>
      <div className="rail-footer">
        <div className="rail-user">
          <span className="avatar">YN</span>
          <div className="rail-user-info">
            <div className="n">you</div>
            <div className="e">ssh · main</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

const Topbar = ({ route, sidebarCollapsed, setSidebarCollapsed, chatVisible, setChatVisible, alertsCount }) => {
  const crumbs = crumbsFor(route);
  return (
    <header className="topbar">
      <button className="topbar-ico" title="Toggle sidebar"
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
        <Icon name={sidebarCollapsed ? 'chevRight' : 'chevLeft'} size={14} />
      </button>
      <button className="ws-chip">
        <span className="ws-chip-dot" />
        <span>asgard</span>
        <Icon name="chevDown" size={11} />
      </button>
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && i < crumbs.length && i !== 1 && <span className="sep">/</span>}
            {i === 0 ? <span className="sep">{c}</span>
              : <span className={i === crumbs.length - 1 ? 'last' : ''}>{c}</span>}
          </React.Fragment>
        ))}
      </div>
      <button className="topbar-palette">
        <Icon name="search" size={13} />
        <span className="label">Search hosts, containers, apps, bots… or run a command</span>
        <span className="kbd">⌘K</span>
      </button>
      <button className="topbar-ico" title="Activity">
        <Icon name="bell" size={15} />
        {alertsCount > 0 && <span className="ind" />}
      </button>
      <button className="topbar-ico" title="Refresh">
        <Icon name="refresh" size={15} />
      </button>
      <button className={`topbar-ico ${chatVisible ? 'active' : ''}`} title="Bot console"
        onClick={() => setChatVisible(!chatVisible)}>
        <Icon name="bot" size={15} />
      </button>
      <span className="env-pill">
        <span className="dot" />
        main
      </span>
    </header>
  );
};

const Statusbar = ({ tick }) => {
  const cpuBase = 24;
  const ping = 11 + Math.round(Math.sin(tick / 5) * 3);
  const down = 412 + Math.round(Math.sin(tick / 7) * 40);
  const up = 88 + Math.round(Math.cos(tick / 6) * 18);
  const cpu = cpuBase + Math.round(Math.sin(tick / 9) * 4);
  const synced = (tick % 30);
  return (
    <footer className="statusbar">
      <div className="statusbar-group">
        <span className="sb-item">
          <Pulse tone="emerald" size="xs" />
          <span className="strong">prometheus</span>:9090
        </span>
        <span className="sb-divider" />
        <span className="sb-item">4 hosts · 28 apps · 47 containers</span>
        <span className="sb-divider" />
        <span className="sb-item">
          <Pulse tone="amber" size="xs" />
          <span style={{ color: 'var(--status-warn)' }}>2 alerts open · aether MEM 81%</span>
        </span>
      </div>
      <div className="statusbar-group">
        <span className="sb-item">ping <span className="strong">{ping}</span> ms</span>
        <span className="sb-divider" />
        <span className="sb-item">↓ <span className="strong">{down}</span> ↑ <span className="strong">{up}</span> Mbps</span>
        <span className="sb-divider" />
        <span className="sb-item">cluster cpu <span className="strong">{cpu}%</span></span>
        <span className="sb-divider" />
        <span className="sb-item">synced <span className="strong">{synced}s</span> ago</span>
      </div>
    </footer>
  );
};

Object.assign(window, { Sidebar, Topbar, Statusbar, NAV_TREE, NAV_LABELS, crumbsFor });
