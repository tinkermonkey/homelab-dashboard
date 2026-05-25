// Main app composition — shell + route switch + chat rail + tweaks

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "darkCanvas": true,
  "chatVisible": true,
  "sidebarCollapsed": false,
  "showAlerts": true,
  "density": "regular",
  "route": "overview"
}/*EDITMODE-END*/;

function useTick(intervalMs) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return tick;
}

const Views = {
  overview:   OverviewView,
  servers:    ServersView,
  containers: ContainersView,
  network:    NetworkView,
  apps:       AppsView,
  storage:    StorageView,
  bots:       BotsView,
  topology:   TopologyView,
  logs:       LogsView,
  settings:   SettingsView,
};

const App = () => {
  const [state, setState] = React.useState(TWEAK_DEFAULTS);
  const [tweaksOpen, setTweaksOpen] = React.useState(false);

  const set = (k, v) => {
    setState(s => ({ ...s, [k]: v }));
    try {
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*');
    } catch (e) {}
  };

  // Tweaks mode protocol — register listener BEFORE announcing availability
  React.useEffect(() => {
    const onMsg = (e) => {
      if (e.data && e.data.type === '__activate_edit_mode')   setTweaksOpen(true);
      if (e.data && e.data.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  React.useEffect(() => {
    document.body.classList.toggle('dark-canvas', !!state.darkCanvas);
    document.body.classList.toggle('density-compact', state.density === 'compact');
  }, [state.darkCanvas, state.density]);

  const tick = useTick(2200);
  const [top, sub] = state.route.split('/');
  const ViewComp = Views[top] || OverviewView;

  return (
    <div className="desktop" data-screen-label={state.route}>
      <div className={`app-shell ${state.chatVisible ? 'with-chat' : 'no-chat'}`}>
        <Sidebar
          route={state.route}
          setRoute={(r) => set('route', r)}
          collapsed={state.sidebarCollapsed}
          setCollapsed={(v) => set('sidebarCollapsed', v)}
        />
        <div className="workspace">
          <Topbar
            route={state.route}
            sidebarCollapsed={state.sidebarCollapsed}
            setSidebarCollapsed={(v) => set('sidebarCollapsed', v)}
            chatVisible={state.chatVisible}
            setChatVisible={(v) => set('chatVisible', v)}
            alertsCount={LAB_DATA.cluster.activeAlerts}
          />
          <main className="canvas-area">
            <div className="canvas-inner">
              <ViewComp showAlerts={state.showAlerts} subroute={sub} />
            </div>
          </main>
        </div>
        {state.chatVisible && <BotConsole onClose={() => set('chatVisible', false)} />}
      </div>
      <Statusbar tick={tick} />
      {tweaksOpen && (
        <TweaksPanel state={state} set={set}
          onClose={() => {
            setTweaksOpen(false);
            try { window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*'); } catch (e) {}
          }} />
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('app')).render(<App />);
