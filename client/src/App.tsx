import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './styles/heimdall.css';
import './styles/globals.css';
import { usePersistedState } from './utils/localStorage';
import { Titlebar } from './components/shell/Titlebar';
import { PlaceholderView } from './components/shared/PlaceholderView';

const ROUTES = [
  { path: '/', name: 'Overview', display: 'Overview' },
  { path: '/cluster/overview', name: 'Overview', display: 'Overview' },
  { path: '/cluster/containers', name: 'Containers', display: 'Containers' },
  { path: '/cluster/topology', name: 'Topology', display: 'Topology' },
  { path: '/cluster/servers', name: 'Servers', display: 'Servers' },
  { path: '/cluster/network', name: 'Network', display: 'Network' },
  { path: '/cluster/apps', name: 'Apps', display: 'Apps' },
  { path: '/cluster/storage', name: 'Storage', display: 'Storage' },
  { path: '/cluster/bots', name: 'Bots', display: 'Bots' },
  { path: '/cluster/logs', name: 'Logs', display: 'Logs' },
  { path: '/cluster/settings', name: 'Settings', display: 'Settings' },
];

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: 'dashboard', path: '/cluster/overview' },
  { id: 'containers', label: 'Containers', icon: 'layers', path: '/cluster/containers' },
  { id: 'topology', label: 'Topology', icon: 'globe', path: '/cluster/topology' },
  { id: 'servers', label: 'Servers', icon: 'cpu', path: '/cluster/servers' },
  { id: 'network', label: 'Network', icon: 'link', path: '/cluster/network' },
  { id: 'apps', label: 'Apps', icon: 'zap', path: '/cluster/apps' },
  { id: 'storage', label: 'Storage', icon: 'database', path: '/cluster/storage' },
  { id: 'bots', label: 'Bots', icon: 'bot', path: '/cluster/bots' },
  { id: 'logs', label: 'Logs', icon: 'history', path: '/cluster/logs' },
  { id: 'settings', label: 'Settings', icon: 'settings', path: '/cluster/settings' },
];

interface ShellLayoutProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (value: boolean) => void;
  darkCanvas: boolean;
  setDarkCanvas: (value: boolean) => void;
  activeRoute: string;
  setActiveRoute: (value: string) => void;
  children: React.ReactNode;
}

const ShellLayout: React.FC<ShellLayoutProps> = ({
  sidebarCollapsed,
  setSidebarCollapsed,
  darkCanvas,
  setDarkCanvas,
  activeRoute,
  setActiveRoute,
  children,
}) => {
  const location = useLocation();

  useEffect(() => {
    setActiveRoute(location.pathname);
  }, [location.pathname, setActiveRoute]);

  const sidebarWidth = sidebarCollapsed ? 64 : 256;
  const currentRoute = ROUTES.find(r => r.path === activeRoute) || ROUTES[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Titlebar title="Homelab" />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <nav
          style={{
            width: `${sidebarWidth}px`,
            background: 'var(--shell-bg)',
            borderRight: '1px solid var(--shell-border)',
            display: 'flex',
            flexDirection: 'column',
            padding: '12px 0',
            overflow: 'auto',
            transition: 'width 0.2s ease',
          }}
        >
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveRoute(item.path)}
              style={{
                flex: 'none',
                padding: sidebarCollapsed ? '8px 12px' : '12px 16px',
                background: activeRoute === item.path ? 'rgba(34, 211, 238, 0.1)' : 'transparent',
                border: 'none',
                color: activeRoute === item.path ? 'var(--accent-primary)' : 'var(--shell-fg-2)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: sidebarCollapsed ? 0 : 12,
                fontSize: '14px',
                fontWeight: 500,
                borderLeft: activeRoute === item.path ? '2px solid var(--accent-primary)' : '2px solid transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <span style={{ display: 'inline-block', width: '20px', textAlign: 'center' }}>
                {item.icon === 'dashboard' && '◇'}
                {item.icon === 'layers' && '▦'}
                {item.icon === 'globe' && '◎'}
                {item.icon === 'cpu' && '⬛'}
                {item.icon === 'link' && '⟂'}
                {item.icon === 'zap' && '⚡'}
                {item.icon === 'database' && '◉'}
                {item.icon === 'bot' && '⦿'}
                {item.icon === 'history' && '⟲'}
                {item.icon === 'settings' && '⚙'}
              </span>
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              padding: '8px 12px',
              background: 'transparent',
              border: 'none',
              color: 'var(--shell-fg-2)',
              cursor: 'pointer',
              fontSize: '12px',
              borderTop: '1px solid var(--shell-border)',
              transition: 'all 0.2s ease',
            }}
            title="Toggle sidebar"
          >
            {sidebarCollapsed ? '▶' : '◀'}
          </button>
        </nav>

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Topbar */}
          <div
            style={{
              height: '44px',
              borderBottom: '1px solid var(--shell-border)',
              background: 'var(--shell-bg)',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--canvas-fg-1)' }}>
              {currentRoute.display}
            </div>

            <button
              onClick={() => setDarkCanvas(!darkCanvas)}
              style={{
                padding: '6px 12px',
                background: 'var(--accent-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              {darkCanvas ? '☀️' : '🌙'}
            </button>
          </div>

          {/* Canvas content */}
          <div style={{ flex: 1, overflow: 'auto' }}>{children}</div>

          {/* Statusbar */}
          <div
            style={{
              height: '32px',
              borderTop: '1px solid var(--shell-border)',
              background: 'var(--shell-bg)',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: 'var(--shell-fg-2)',
            }}
          >
            <div>Ready</div>
            <div>Cluster Status: OK</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = usePersistedState('sidebarCollapsed', false);
  const [darkCanvas, setDarkCanvas] = usePersistedState('darkCanvas', true);
  const [activeRoute, setActiveRoute] = usePersistedState('activeRoute', '/cluster/overview');

  useEffect(() => {
    document.body.classList.toggle('dark-canvas', darkCanvas);
  }, [darkCanvas]);

  return (
    <ShellLayout
      sidebarCollapsed={sidebarCollapsed}
      setSidebarCollapsed={setSidebarCollapsed}
      darkCanvas={darkCanvas}
      setDarkCanvas={setDarkCanvas}
      activeRoute={activeRoute}
      setActiveRoute={setActiveRoute}
    >
      <Routes>
        <Route path="/" element={<Navigate to="/cluster/overview" replace />} />
        <Route path="/cluster/overview" element={<PlaceholderView routeName="Overview" />} />
        <Route path="/cluster/containers" element={<PlaceholderView routeName="Containers" />} />
        <Route path="/cluster/topology" element={<PlaceholderView routeName="Topology" />} />
        <Route path="/cluster/servers" element={<PlaceholderView routeName="Servers" />} />
        <Route path="/cluster/network" element={<PlaceholderView routeName="Network" />} />
        <Route path="/cluster/apps" element={<PlaceholderView routeName="Apps" />} />
        <Route path="/cluster/storage" element={<PlaceholderView routeName="Storage" />} />
        <Route path="/cluster/bots" element={<PlaceholderView routeName="Bots" />} />
        <Route path="/cluster/logs" element={<PlaceholderView routeName="Logs" />} />
        <Route path="/cluster/settings" element={<PlaceholderView routeName="Settings" />} />
      </Routes>
    </ShellLayout>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};
