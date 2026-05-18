import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import './styles/heimdall.css';
import './styles/globals.css';
import { usePersistedState } from './utils/localStorage';
import { useCluster } from './hooks/useAPI';
import { Titlebar } from './components/shell/Titlebar';
import { CommandPalette } from './components/shell/CommandPalette';
import { Topbar } from './components/shell/Topbar';
import { Statusbar } from './components/shell/Statusbar';
import { OverviewView } from './components/overview/OverviewView';
import { ContainersView } from './components/containers/ContainersView';
import { TopologyView } from './components/topology/TopologyView';
import { PlaceholderView } from './components/shared/PlaceholderView';
import { Icon } from './components/shared/Icon';
import { ChatRail } from './components/chat/ChatRail';
import { CHAT_DATA } from './data/chatData';

const ROUTES = [
  { path: '/', name: 'Overview', display: 'Overview' },
  { path: '/cluster/overview', name: 'Overview', display: 'Overview', icon: 'dashboard' },
  { path: '/cluster/containers', name: 'Containers', display: 'Containers', icon: 'layers' },
  { path: '/cluster/topology', name: 'Topology', display: 'Topology', icon: 'globe' },
  { path: '/cluster/servers', name: 'Servers', display: 'Servers', icon: 'cpu' },
  { path: '/cluster/network', name: 'Network', display: 'Network', icon: 'link' },
  { path: '/cluster/apps', name: 'Apps', display: 'Apps', icon: 'zap' },
  { path: '/cluster/storage', name: 'Storage', display: 'Storage', icon: 'database' },
  { path: '/cluster/bots', name: 'Bots', display: 'Bots', icon: 'bot' },
  { path: '/cluster/logs', name: 'Logs', display: 'Logs', icon: 'history' },
  { path: '/cluster/settings', name: 'Settings', display: 'Settings', icon: 'settings' },
];

interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
}

const NAV_ITEMS: NavItem[] = ROUTES
  .filter(r => r.icon)
  .map(r => ({
    id: r.path.split('/').pop() || 'overview',
    label: r.display,
    icon: r.icon!,
    path: r.path,
  }));

interface ShellLayoutProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (value: boolean) => void;
  darkCanvas: boolean;
  setDarkCanvas: (value: boolean) => void;
  chatVisible: boolean;
  setChatVisible: (value: boolean) => void;
  activeBot: string;
  setActiveBot: (value: string) => void;
  density: string;
  setDensity: (value: string) => void;
  showAlerts: boolean;
  setShowAlerts: (value: boolean) => void;
  clusterData?: any;
  children: React.ReactNode;
}

const ShellLayout: React.FC<ShellLayoutProps> = ({
  sidebarCollapsed,
  setSidebarCollapsed,
  darkCanvas,
  setDarkCanvas,
  chatVisible,
  setChatVisible,
  activeBot,
  setActiveBot,
  density,
  setDensity,
  showAlerts,
  setShowAlerts,
  clusterData,
  children,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const currentRoute = ROUTES.find(r => r.path === location.pathname) || ROUTES[0];

  const commandPaletteCommands = ROUTES.filter(r => r.icon).map(r => ({
    id: r.path,
    label: r.display,
    path: r.path,
    icon: r.icon || 'dashboard',
    category: 'Navigation',
  }));

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      } else if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen]);

  return (
    <div className="shell-layout">
      <Titlebar
        title="Homelab"
        onCommandPaletteClick={() => setCommandPaletteOpen(true)}
      />
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        commands={commandPaletteCommands}
      />

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
          <Topbar
            currentRoute={currentRoute.display}
            onDarkModeToggle={() => setDarkCanvas(!darkCanvas)}
            darkMode={darkCanvas}
            onChatToggle={() => setChatVisible(!chatVisible)}
            chatVisible={chatVisible}
            onDensityChange={() => setDensity(density === 'compact' ? 'regular' : 'compact')}
            onShowAlertsToggle={() => setShowAlerts(!showAlerts)}
          />

          {/* Canvas + Chat Rail wrapper */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* Canvas content */}
            <div className="shell-layout__canvas">
              {children}
            </div>

            {/* Chat Rail */}
            {chatVisible && (
              <ChatRail
                bots={CHAT_DATA.bots}
                threadByBot={CHAT_DATA.threadByBot}
                activeBot={activeBot}
                onActiveBotChange={setActiveBot}
                onClose={() => setChatVisible(false)}
              />
            )}
          </div>

          {/* Statusbar */}
          <Statusbar clusterData={clusterData} />
        </div>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = usePersistedState('sidebarCollapsed', false);
  const [darkCanvas, setDarkCanvas] = usePersistedState('darkCanvas', true);
  const [chatVisible, setChatVisible] = usePersistedState('chatVisible', false);
  const [activeBot, setActiveBot] = usePersistedState('activeBot', 'ops-bot');
  const [density, setDensity] = usePersistedState('density', 'regular');
  const [showAlerts, setShowAlerts] = usePersistedState('showAlerts', true);
  const { data: clusterData, isLoading, error } = useCluster();

  useEffect(() => {
    document.body.classList.toggle('dark-canvas', darkCanvas);
  }, [darkCanvas]);

  useEffect(() => {
    document.body.classList.toggle('density-compact', density === 'compact');
  }, [density]);

  return (
    <ShellLayout
      sidebarCollapsed={sidebarCollapsed}
      setSidebarCollapsed={setSidebarCollapsed}
      darkCanvas={darkCanvas}
      setDarkCanvas={setDarkCanvas}
      chatVisible={chatVisible}
      setChatVisible={setChatVisible}
      activeBot={activeBot}
      setActiveBot={setActiveBot}
      density={density}
      setDensity={setDensity}
      showAlerts={showAlerts}
      setShowAlerts={setShowAlerts}
      clusterData={clusterData}
    >
      <Routes>
        <Route path="/" element={<Navigate to="/cluster/overview" replace />} />
        <Route path="/cluster/overview" element={
          isLoading ? <PlaceholderView routeName="Overview" /> :
          error ? <PlaceholderView routeName="Overview" /> :
          clusterData ? <OverviewView data={clusterData} showAlerts={showAlerts} /> :
          <PlaceholderView routeName="Overview" />
        } />
        <Route path="/cluster/containers" element={<ContainersView />} />
        <Route path="/cluster/topology" element={<TopologyView />} />
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
