// Homelab dashboard — app shell with routing

const { useState: useState_a, useEffect: useEffect_a } = React;

// ---- Sidebar nav ----
const LAB_NAV = [
  { id: 'overview',   label: 'Overview',     icon: 'dashboard' },
  { id: 'servers',    label: 'Servers',      icon: 'cpu',      count: 4 },
  { id: 'containers', label: 'Containers',   icon: 'layers',   count: 31 },
  { id: 'network',    label: 'Network',      icon: 'globe' },
  { id: 'apps',       label: 'Applications', icon: 'workflow', count: 28 },
  { id: 'storage',    label: 'Storage',      icon: 'database', count: '90 TB' },
  { id: 'bots',       label: 'Bots',         icon: 'bot',      count: 4 },
  { id: 'topology',   label: 'Topology',     icon: 'graph' },
  { id: 'logs',       label: 'Logs',         icon: 'history' },
  { id: 'settings',   label: 'Configuration', icon: 'settings' },
];

const ROUTE_BREADCRUMBS = {
  overview:   ['Overview', 'cluster'],
  containers: ['Containers', 'docker'],
  topology:   ['Topology', 'bots'],
  servers:    ['Servers', 'hosts'],
  network:    ['Network', 'gateway'],
  apps:       ['Applications', 'services'],
  storage:    ['Storage', 'volumes'],
  bots:       ['Bots', 'registry'],
  logs:       ['Logs', 'tail'],
  settings:   ['Configuration'],
};

const WS = { name: 'asgard', path: '~/lab/asgard', branch: 'main' };

function LabTitlebar({ onPalette }) {
  return (
    <div className="titlebar">
      <div className="lights">
        <span className="l-close"></span>
        <span className="l-min"></span>
        <span className="l-max"></span>
      </div>
      <div className="titlebar-app">
        <span className="titlebar-app-name">Homelab</span>
        <span className="titlebar-app-sep">—</span>
        <button className="titlebar-ws">
          <Icon name="folder" size={12}/>
          <span>{WS.path}</span>
          <Icon name="chevDown" size={10}/>
        </button>
      </div>
      <div className="titlebar-spacer"></div>
      <div className="titlebar-actions">
        <button className="titlebar-btn" onClick={onPalette} title="Command palette (⌘K)">
          <Icon name="search" size={12}/>
          <span>Search or run…</span>
          <span className="kbd-mini">⌘K</span>
        </button>
      </div>
    </div>
  );
}

function LabSidebar({ route, onNav, collapsed, onToggleCollapse }) {
  return (
    <aside className="shell-rail">
      <div className="brand-row">
        <div className="brand-mark" aria-hidden="true"></div>
        <div className="brand-name">asgard<span>homelab · v3.2</span></div>
        <button className="rail-collapse" onClick={onToggleCollapse} aria-label="Toggle sidebar" title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <Icon name={collapsed ? 'chevRight' : 'chevLeft'} size={11} />
        </button>
      </div>
      <div className="nav-section">
        {LAB_NAV.map(item => (
          <div
            key={item.id}
            className={'nav-item ' + (route === item.id ? 'active' : '')}
            onClick={() => onNav(item.id)}
            title={collapsed ? item.label : undefined}
          >
            <Icon name={item.icon} size={16}/>
            <span className="nav-label">{item.label}</span>
            {item.count != null && <span className="nav-count">{item.count}</span>}
          </div>
        ))}
      </div>
      <div className="rail-footer">
        <div className="rail-user">
          <div className="avatar">YN</div>
          <div className="rail-user-info">
            <div className="n">you</div>
            <div className="e">ssh · {WS.branch}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function LabTopbar({ route, onPalette, chatVisible, onToggleChat, sidebarCollapsed, onToggleSidebar }) {
  const crumbs = ROUTE_BREADCRUMBS[route] || [route];
  return (
    <header className="topbar">
      <button
        className="topbar-ico"
        onClick={onToggleSidebar}
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{marginRight:2}}
      >
        <Icon name={sidebarCollapsed ? 'chevRight' : 'chevLeft'} size={14}/>
      </button>
      <button className="ws-chip">
        <span className="ws-chip-dot"></span>
        <span className="ws-chip-name">{WS.name}</span>
        <Icon name="chevDown" size={11}/>
      </button>
      <span className="crumbs-sep">/</span>
      <div className="crumbs">
        {crumbs.map((c, i) => [
          <span key={i + ':lbl'} className={i === crumbs.length - 1 ? 'last' : ''}>{c}</span>,
          i < crumbs.length - 1 ? <span key={i + ':sep'} className="sep">/</span> : null,
        ])}
      </div>
      <button className="topbar-palette" onClick={onPalette}>
        <Icon name="search" size={14}/>
        <span>Search or run command…</span>
        <span className="kbd">⌘K</span>
      </button>
      <button className="topbar-ico" title="Activity"><Icon name="bell" size={16}/></button>
      <button className="topbar-ico" title="Refresh"><Icon name="refresh" size={16}/></button>
      <button
        className="topbar-ico"
        onClick={onToggleChat}
        title={chatVisible ? 'Close bot console' : 'Open bot console'}
        style={chatVisible ? {color:'var(--accent-cyan)', background:'var(--shell-surface)'} : {}}
      >
        <Icon name="bot" size={16}/>
      </button>
      <span className="env-pill"><span className="dot"></span>main</span>
    </header>
  );
}

function LabStatusbar() {
  const [tick, setTick] = useState_a(0);
  useEffect_a(() => {
    const t = setInterval(() => setTick(v => v + 1), 2200);
    return () => clearInterval(t);
  }, []);
  const cpu = 24 + (tick % 5) * 3;
  return (
    <div className="statusbar">
      <div className="statusbar-group">
        <span className="sb-item">
          <span className="pulse"></span>
          <span>prometheus</span>
          <span className="sb-mono">:9090</span>
        </span>
        <span className="sb-divider"></span>
        <span className="sb-item">
          <Icon name="cpu" size={11}/>
          <span>4 hosts · 28 apps · 47 containers</span>
        </span>
        <span className="sb-divider"></span>
        <span className="sb-item">
          <span className="dot-amber"></span>
          <span>2 alerts open</span>
          <span className="sb-mono">aether MEM 81%</span>
        </span>
      </div>
      <div className="statusbar-group">
        <span className="sb-item"><span className="sb-mono">ping {11 + (tick % 3)} ms</span></span>
        <span className="sb-divider"></span>
        <span className="sb-item"><span className="sb-mono">↓ 412 ↑ 88 Mbps</span></span>
        <span className="sb-divider"></span>
        <span className="sb-item"><span className="sb-mono">cluster cpu {cpu}%</span></span>
        <span className="sb-divider"></span>
        <span className="sb-item">
          <Icon name="check" size={11}/>
          <span className="sb-mono">synced 14s ago</span>
        </span>
      </div>
    </div>
  );
}

// Placeholder for routes not yet built out
function PlaceholderView({ route }) {
  return (
    <div className="canvas-inner lab-canvas-inner">
      <div className="page-head" style={{marginBottom:18, paddingBottom:14}}>
        <div>
          <h1>{route} <span className="id-tag">/cluster/asgard/{route}</span></h1>
          <div className="subtitle">This route is reachable from the sidebar but content is not built out — see Overview, Containers, and Topology for the implemented views.</div>
        </div>
      </div>
      <div className="empty" style={{padding:'64px 32px'}}>
        <div style={{fontFamily:'var(--mono)', color:'var(--canvas-fg-3)', letterSpacing:'0.06em', textTransform:'uppercase', fontSize:11, marginBottom:6}}>NO PAGE YET</div>
        <div>The <code style={{fontFamily:'var(--mono)', background:'var(--canvas-bg-2)', padding:'1px 6px', borderRadius:3}}>{route}</code> route is a stub.</div>
      </div>
    </div>
  );
}

// ---- Tweaks ----
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "darkCanvas": true,
  "chatVisible": true,
  "sidebarCollapsed": false,
  "density": "regular",
  "showAlerts": true,
  "accent": "#22D3EE"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = useState_a('overview');
  const [chatVisible, setChatVisible] = useState_a(t.chatVisible);
  const [sidebarCollapsed, setSidebarCollapsed] = useState_a(t.sidebarCollapsed);

  useEffect_a(() => {
    document.body.classList.toggle('dark-canvas', !!t.darkCanvas);
    document.body.classList.toggle('density-compact', t.density === 'compact');
    document.documentElement.style.setProperty('--accent-cyan', t.accent);
    setChatVisible(!!t.chatVisible);
    setSidebarCollapsed(!!t.sidebarCollapsed);
  }, [t.darkCanvas, t.density, t.accent, t.chatVisible, t.sidebarCollapsed]);

  let viewContent;
  if (route === 'overview') viewContent = <OverviewView showAlerts={t.showAlerts} />;
  else if (route === 'containers') viewContent = <DockerView />;
  else if (route === 'topology') viewContent = <TopologyView />;
  else viewContent = <PlaceholderView route={route} />;

  return (
    <div className="desktop-frame with-chrome">
      <LabTitlebar />
      <div className={'app-shell' + (sidebarCollapsed ? ' collapsed' : '')}>
        <LabSidebar
          route={route}
          onNav={setRoute}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => { setSidebarCollapsed(v => !v); setTweak('sidebarCollapsed', !sidebarCollapsed); }}
        />
        <div className="workspace">
          <LabTopbar
            route={route}
            chatVisible={chatVisible}
            onToggleChat={() => { setChatVisible(v => !v); setTweak('chatVisible', !chatVisible); }}
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={() => { setSidebarCollapsed(v => !v); setTweak('sidebarCollapsed', !sidebarCollapsed); }}
          />
          <div className={'lab-shell ' + (chatVisible ? '' : 'no-chat')}>
            <div className="canvas-area lab-canvas">
              {viewContent}
            </div>
            {chatVisible && <ChatRail onClose={() => { setChatVisible(false); setTweak('chatVisible', false); }} />}
          </div>
          <LabStatusbar />
        </div>
      </div>

      <TweaksPanel>
        <TweakSection label="Surface" />
        <TweakToggle label="Dark canvas" value={t.darkCanvas} onChange={(v) => setTweak('darkCanvas', v)} />
        <TweakToggle label="Collapse sidebar" value={t.sidebarCollapsed} onChange={(v) => setTweak('sidebarCollapsed', v)} />
        <TweakToggle label="Show bot console" value={t.chatVisible} onChange={(v) => setTweak('chatVisible', v)} />
        <TweakToggle label="Show alerts strip" value={t.showAlerts} onChange={(v) => setTweak('showAlerts', v)} />
        <TweakRadio
          label="Density"
          value={t.density}
          options={['compact', 'regular']}
          onChange={(v) => setTweak('density', v)}
        />
        <TweakSection label="Accent" />
        <TweakColor
          label="Brand accent"
          value={t.accent}
          options={['#22D3EE', '#10B981', '#A78BFA', '#F59E0B']}
          onChange={(v) => setTweak('accent', v)}
        />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
