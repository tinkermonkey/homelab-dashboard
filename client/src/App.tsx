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
  children: React.ReactNode;
}

const ShellLayout: React.FC<ShellLayoutProps> = ({
  sidebarCollapsed,
  setSidebarCollapsed,
  darkCanvas,
  setDarkCanvas,
  children,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const currentRoute = ROUTES.find(r => r.path === location.pathname) || ROUTES[0];

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  return (
    <div className="shell-layout">
      <Titlebar title="Homelab" />

      <div className="shell-layout__main">
        {/* Sidebar */}
        <nav className={`sidebar ${sidebarCollapsed ? 'sidebar--collapsed' : ''}`}>
          <div className="sidebar__nav">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.path)}
                className={`nav-item ${location.pathname === item.path ? 'nav-item--active' : ''}`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span className="nav-item__icon">
                  <Icon name={item.icon} size={20} />
                </span>
                {!sidebarCollapsed && <span className="nav-item__label">{item.label}</span>}
              </button>
            ))}
          </div>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="sidebar__toggle"
            title="Toggle sidebar"
          >
            {sidebarCollapsed ? '▶' : '◀'}
          </button>
        </nav>

        {/* Main content */}
        <div className="shell-layout__content">
          {/* Topbar */}
          <div className="topbar">
            <div style={{ fontSize: '14px', fontWeight: 500, color: `rgb(var(--canvas-fg-1))` }}>
              {currentRoute.display}
            </div>

            <button
              onClick={() => setDarkCanvas(!darkCanvas)}
              className="btn btn--primary btn--sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Icon name={darkCanvas ? 'sun' : 'moon'} size={16} />
              {darkCanvas ? 'Light' : 'Dark'}
            </button>
          </div>

          {/* Canvas content */}
          <div className="shell-layout__canvas">
            {children}
          </div>

          {/* Statusbar */}
          <div className="statusbar">
            <div className="statusbar__slot statusbar__slot--left">Ready</div>
            <div className="statusbar__slot statusbar__slot--right">Cluster Status: OK</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = usePersistedState('sidebarCollapsed', false);
  const [darkCanvas, setDarkCanvas] = usePersistedState('darkCanvas', true);

  useEffect(() => {
    document.body.classList.toggle('dark-canvas', darkCanvas);
  }, [darkCanvas]);

  return (
    <ShellLayout
      sidebarCollapsed={sidebarCollapsed}
      setSidebarCollapsed={setSidebarCollapsed}
      darkCanvas={darkCanvas}
      setDarkCanvas={setDarkCanvas}
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
