import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import './styles/heimdall.css';
import './styles/globals.css';
import { usePersistedState } from './utils/localStorage';
import { Titlebar } from './components/shell/Titlebar';
import { PlaceholderView } from './components/shared/PlaceholderView';
import { getIconSvgPath } from './utils/icons';

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

interface IconProps {
  name: string;
  size?: number;
}

const Icon: React.FC<IconProps> = ({ name, size = 24 }) => {
  const pathData = getIconSvgPath(name);
  if (!pathData) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g dangerouslySetInnerHTML={{ __html: pathData }} />
    </svg>
  );
};

interface ShellLayoutProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (value: boolean) => void;
  darkCanvas: boolean;
  setDarkCanvas: (value: boolean) => void;
  density: 'compact' | 'regular';
  setDensity: (value: 'compact' | 'regular') => void;
  children: React.ReactNode;
}

const ShellLayout: React.FC<ShellLayoutProps> = ({
  sidebarCollapsed,
  setSidebarCollapsed,
  darkCanvas,
  setDarkCanvas,
  density: _density,
  setDensity: _setDensity,
  children,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const sidebarWidth = sidebarCollapsed ? 64 : 256;
  const currentRoute = ROUTES.find(r => r.path === location.pathname) || ROUTES[0];

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Titlebar title="Homelab" />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <nav
          style={{
            width: `${sidebarWidth}px`,
            background: `rgb(var(--shell-bg))`,
            borderRight: `1px solid rgb(var(--shell-border))`,
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
              onClick={() => handleNavClick(item.path)}
              style={{
                flex: 'none',
                padding: sidebarCollapsed ? '8px 12px' : '12px 16px',
                background: location.pathname === item.path ? 'rgba(34, 211, 238, 0.1)' : 'transparent',
                border: 'none',
                color: location.pathname === item.path ? `rgb(var(--accent-primary))` : `rgb(var(--shell-fg-2))`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: sidebarCollapsed ? 0 : 12,
                fontSize: '14px',
                fontWeight: 500,
                borderLeft: location.pathname === item.path ? `2px solid rgb(var(--accent-primary))` : '2px solid transparent',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <span style={{ display: 'inline-flex', width: '24px', height: '24px', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={item.icon} size={20} />
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
              color: `rgb(var(--shell-fg-2))`,
              cursor: 'pointer',
              fontSize: '12px',
              borderTop: `1px solid rgb(var(--shell-border))`,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
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
              borderBottom: `1px solid rgb(var(--shell-border))`,
              background: `rgb(var(--shell-bg))`,
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 500, color: `rgb(var(--canvas-fg-1))` }}>
              {currentRoute.display}
            </div>

            <button
              onClick={() => setDarkCanvas(!darkCanvas)}
              style={{
                padding: '6px 12px',
                background: `rgb(var(--accent-primary))`,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Icon name={darkCanvas ? 'sparkle' : 'sparkle'} size={16} />
              {darkCanvas ? 'Light' : 'Dark'}
            </button>
          </div>

          {/* Canvas content */}
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              background: `rgb(var(--canvas-bg))`,
              color: `rgb(var(--canvas-fg-1))`,
              borderTopLeftRadius: '8px',
            }}
          >
            {children}
          </div>

          {/* Statusbar */}
          <div
            style={{
              height: '32px',
              borderTop: `1px solid rgb(var(--shell-border))`,
              background: `rgb(var(--shell-bg))`,
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: `rgb(var(--shell-fg-2))`,
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
  const [density, setDensity] = usePersistedState<'compact' | 'regular'>('density', 'regular');

  useEffect(() => {
    document.body.classList.toggle('dark-canvas', darkCanvas);
  }, [darkCanvas]);

  return (
    <ShellLayout
      sidebarCollapsed={sidebarCollapsed}
      setSidebarCollapsed={setSidebarCollapsed}
      darkCanvas={darkCanvas}
      setDarkCanvas={setDarkCanvas}
      density={density}
      setDensity={setDensity}
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
