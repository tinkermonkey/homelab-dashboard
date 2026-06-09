// lab-app.jsx — composition root. Real shell components (Sidebar, Topbar,
// Statusbar, AppTitle via Sidebar) frame the routed views + bot rail.

const VIEWS = {
  overview: OverviewView, servers: ServersView, containers: ContainersView,
  topology: TopologyView, network: NetworkView, apps: AppsView, bots: BotsView,
  storage: StorageView, logs: LogsView, settings: SettingsView,
};

const ROUTE_LABEL = {
  overview: 'Overview', servers: 'Servers', containers: 'Containers', topology: 'Topology',
  network: 'Network', apps: 'Applications', bots: 'Bots', storage: 'Storage', logs: 'Logs', settings: 'Settings',
};

const ACCENTS = {
  amber: ['251 191 36', '245 158 11', '180 83 9'],
  cyan: ['34 211 238', '6 182 212', '14 116 144'],
  violet: ['167 139 250', '139 92 246', '109 40 217'],
};

const DEFAULTS = {
  darkCanvas: true, chatVisible: true, sidebarCollapsed: false,
  showAlerts: true, density: 'regular', accent: 'amber', route: 'overview',
};

function loadState() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('lab_ui') || '{}') }; }
  catch (e) { return { ...DEFAULTS }; }
}

function navTree() {
  const ctn = DOCKER_DATA.hosts.reduce((n, h) => n + h.containers.length, 0);
  const nets = DOCKER_DATA.hosts.reduce((n, h) => n + h.networks.length, 0);
  const vols = DOCKER_DATA.hosts.reduce((n, h) => n + h.volumes.length, 0);
  return [
    { title: 'asgard', items: [
      { id: 'overview', label: 'Overview', icon: 'dashboard' },
      { id: 'servers', label: 'Servers', icon: 'server', count: LAB_DATA.servers.length },
      { id: 'docker', label: 'Containers', icon: 'box', count: ctn, children: [
        { id: 'containers', label: 'All containers', count: ctn },
        { id: 'containers/networks', label: 'Networks', count: nets },
        { id: 'containers/volumes', label: 'Volumes', count: vols },
      ] },
      { id: 'topology', label: 'Topology', icon: 'graph' },
      { id: 'network', label: 'Network', icon: 'network' },
      { id: 'apps', label: 'Applications', icon: 'workflow', count: LAB_DATA.apps.length },
      { id: 'bots', label: 'Bots', icon: 'bot', count: LAB_DATA.bots.length },
    ] },
    { title: 'platform', items: [
      { id: 'storage', label: 'Storage', icon: 'hardDrive' },
      { id: 'logs', label: 'Logs', icon: 'file' },
      { id: 'settings', label: 'Settings', icon: 'settings' },
    ] },
  ];
}

function App() {
  const [state, setState] = React.useState(loadState);
  const [tweaksOpen, setTweaksOpen] = React.useState(false);
  const sections = React.useMemo(navTree, []);

  const set = (k, v) => setState(s => {
    const next = { ...s, [k]: v };
    try { localStorage.setItem('lab_ui', JSON.stringify(next)); } catch (e) {}
    try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*'); } catch (e) {}
    return next;
  });

  // tweaks-mode protocol
  React.useEffect(() => {
    const onMsg = (e) => {
      if (!e.data) return;
      if (e.data.type === '__activate_edit_mode') setTweaksOpen(true);
      if (e.data.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', onMsg);
    try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch (e) {}
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // apply canvas mode + density + accent
  React.useEffect(() => {
    document.body.classList.toggle('dark-canvas', !!state.darkCanvas);
    document.body.classList.toggle('density-compact', state.density === 'compact');
    const a = ACCENTS[state.accent] || ACCENTS.amber;
    const r = document.documentElement;
    r.style.setProperty('--accent-primary', a[0]);
    r.style.setProperty('--accent-primary-hover', a[1]);
    r.style.setProperty('--accent-primary-deep', a[2]);
  }, [state.darkCanvas, state.density, state.accent]);

  const [top, sub] = state.route.split('/');
  const ViewComp = VIEWS[top] || OverviewView;
  const expanded = top === 'containers' ? ['docker'] : [];

  const crumbs = [{ label: 'asgard' }, { label: ROUTE_LABEL[top] || 'Overview' }];
  if (sub) crumbs.push({ label: sub.charAt(0).toUpperCase() + sub.slice(1) });

  const sbLeft = [
    { kind: 'pulse', tone: 'emerald', label: 'asgard · live', mono: true },
    { kind: 'divider' },
    { kind: 'icon', icon: 'server', label: `${LAB_DATA.servers.length} hosts up`, mono: true },
    { kind: 'divider' },
    { kind: 'icon', icon: 'box', label: `${DOCKER_DATA.hosts.reduce((n, h) => n + h.containers.length, 0)} containers`, mono: true },
  ];
  const sbRight = [
    { kind: 'icon', icon: 'power', label: `${LAB_DATA.cluster.powerDraw} W`, mono: true },
    { kind: 'divider' },
    { kind: 'icon', icon: 'cpu', label: 'load 2.9', mono: true },
    { kind: 'divider' },
    { kind: 'icon', icon: 'bot', label: 'heimdall v0.3.0', mono: true },
  ];

  return (
    <div className="lab-shell" data-screen-label={state.route}>
      <div className="lab-main">
        <div className="lab-sidebar-col">
          <Sidebar
            sections={sections}
            activeItemId={state.route}
            collapsed={state.sidebarCollapsed}
            onCollapse={(v) => set('sidebarCollapsed', v)}
            onSelectItem={(id) => set('route', id)}
            defaultExpandedIds={expanded}
            appTitle={{ title: 'Heimdall', version: 'asgard' }}
            footer={
              <div className="rail-user">
                <Avatar name="ops" color="amber" size="sm" shape="rounded" decorative />
                <div className="rail-user__info">
                  <span className="n">operator</span>
                  <span className="e">you@lab.local</span>
                </div>
              </div>
            }
          />
        </div>

        <div className="lab-content">
          <Topbar
            breadcrumbs={crumbs}
            onSearch={() => {}}
            searchPlaceholder="Search hosts, containers, services…"
            searchHint={<span>⌘K</span>}
            leadingContent={<button className="tb-ws"><span className="dot" />asgard</button>}
          >
            <span className="tb-env"><span className="dot" />live</span>
            <button className="tb-ico" aria-label="Alerts"><Icon name="bell" size={17} /><span className="ind" /></button>
            <button className={`tb-ico ${state.chatVisible ? 'tb-ico--active' : ''}`} aria-label="Toggle bot console"
              onClick={() => set('chatVisible', !state.chatVisible)}><Icon name="bot" size={17} /></button>
          </Topbar>

          <main className="lab-canvas">
            <div className="lab-page">
              <ViewComp showAlerts={state.showAlerts} subroute={sub} setRoute={(r) => set('route', r)} />
            </div>
          </main>
        </div>

        {state.chatVisible && <BotConsole onClose={() => set('chatVisible', false)} />}
      </div>

      <Statusbar left={sbLeft} right={sbRight} />

      {tweaksOpen && <TweaksPanel state={state} set={set}
        onClose={() => { setTweaksOpen(false); try { window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); } catch (e) {} }} />}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('app')).render(<App />);
