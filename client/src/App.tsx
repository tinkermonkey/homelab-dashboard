import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  ShellLayout,
  Icon as HeimdallIcon,
  type IconName,
} from '@tinkermonkey/heimdall-ui';
import './styles/heimdall.css';
import './styles/globals.css';
import { usePersistedState } from './utils/localStorage';
import { useCluster } from './hooks/useAPI';
import { CommandPalette } from './components/shell/CommandPalette';
import { useStatusbarContent } from './components/shell/Statusbar';
import { OverviewView } from './components/overview/OverviewView';
import { ContainersView } from './components/containers/ContainersView';
import { TopologyView } from './components/topology/TopologyView';
import { NetworkView } from './components/network/NetworkView';
import { PlaceholderView } from './components/shared/PlaceholderView';
import { ErrorView } from './components/shared/ErrorView';
import { ChatRail } from './components/chat/ChatRail';

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

const AppContent: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = usePersistedState('sidebarCollapsed', false);
  const [darkCanvas] = usePersistedState('darkCanvas', true);
  const [chatVisible, setChatVisible] = usePersistedState('chatVisible', true);
  const [activeBot, setActiveBot] = usePersistedState('activeBot', 'lab-bot');
  const [activeRoute, setActiveRoute] = usePersistedState('activeRoute', '/cluster/overview');
  const [density] = usePersistedState('density', 'regular');
  const [showAlerts, setShowAlerts] = usePersistedState('showAlerts', true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { data: clusterData, isLoading, error, refetch } = useCluster();
  const statusbarContent = useStatusbarContent(clusterData);

  const currentRoute = ROUTES.find(r => r.path === location.pathname) || ROUTES[0];

  const commandPaletteCommands = ROUTES.filter(r => r.icon).map(r => ({
    id: r.path,
    label: r.display,
    path: r.path,
    icon: r.icon || 'dashboard',
    category: 'Navigation',
  }));

  useEffect(() => {
    document.body.classList.toggle('dark-canvas', darkCanvas);
  }, [darkCanvas]);

  useEffect(() => {
    document.body.classList.toggle('density-compact', density === 'compact');
  }, [density]);

  useEffect(() => {
    setActiveRoute(location.pathname);
  }, [location.pathname, setActiveRoute]);

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

  const iconMap: Record<string, IconName> = {
    dashboard: 'dashboard',
    layers: 'layout',
    globe: 'graph',
    cpu: 'info',
    link: 'link',
    zap: 'alert',
    database: 'data',
    bot: 'user',
    history: 'reload',
    settings: 'settings',
  };

  const sidebarSections = [
    {
      title: 'Cluster',
      items: NAV_ITEMS.map(item => ({
        id: item.id,
        label: item.label,
        icon: iconMap[item.icon] || 'dashboard',
      })),
    },
  ];

  const iconButtonBaseStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    color: 'rgb(var(--shell-fg-1))',
  };

  const viewContent = isLoading ? (
    <PlaceholderView routeName="Overview" />
  ) : error ? (
    <ErrorView
      title="Failed to Load Overview"
      message="Could not fetch cluster data. Please try again in a moment."
      isDegraded={false}
    />
  ) : clusterData ? (
    <OverviewView
      data={clusterData}
      showAlerts={showAlerts}
    />
  ) : (
    <ErrorView
      title="No Data Available"
      message="No cluster data could be loaded."
      isDegraded={false}
    />
  );

  return (
    <ShellLayout
        appTitle={{
          title: 'Homelab',
          version: 'asgard',
        }}
        sidebar={{
          sections: sidebarSections,
          activeItemId: NAV_ITEMS.find(i => i.path === location.pathname)?.id,
          collapsed: sidebarCollapsed,
          onCollapse: setSidebarCollapsed,
          onSelectItem: (itemId) => {
            const item = NAV_ITEMS.find(i => i.id === itemId);
            if (item) navigate(item.path);
          },
        }}
        topbar={{
          breadcrumbs: [
            { label: 'cluster', onClick: () => navigate('/cluster/overview') },
            { label: currentRoute.display },
          ],
          children: (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
              <button
                onClick={() => setShowAlerts(!showAlerts)}
                title="Activity"
                style={iconButtonBaseStyle}
              >
                <HeimdallIcon name="bell" size={16} />
              </button>
              <button
                onClick={() => refetch()}
                title="Refresh"
                style={iconButtonBaseStyle}
              >
                <HeimdallIcon name="reload" size={16} />
              </button>
              <button
                onClick={() => setChatVisible(!chatVisible)}
                title={chatVisible ? 'Close bot console' : 'Open bot console'}
                style={{
                  ...iconButtonBaseStyle,
                  background: chatVisible ? 'rgb(var(--shell-surface))' : 'none',
                  color: chatVisible ? 'rgb(var(--accent-cyan))' : 'rgb(var(--shell-fg-1))',
                }}
              >
                <HeimdallIcon name="user" size={16} />
              </button>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: 'rgb(var(--accent-cyan))',
                  marginLeft: '8px',
                  paddingLeft: '8px',
                  borderLeft: '1px solid rgb(var(--shell-border))',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'rgb(var(--accent-cyan))',
                  }}
                />
                main
              </span>
            </div>
          ),
        }}
        statusbar={statusbarContent}
      >
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          commands={commandPaletteCommands}
        />
        <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflow: 'auto', height: '100%' }}>
            <Routes>
              <Route path="/" element={<Navigate to={activeRoute} replace />} />
              <Route path="/cluster/overview" element={viewContent} />
              <Route path="/cluster/containers" element={<ContainersView />} />
              <Route path="/cluster/topology" element={<TopologyView />} />
              <Route path="/cluster/servers" element={<PlaceholderView routeName="Servers" />} />
              <Route path="/cluster/network" element={<NetworkView />} />
              <Route path="/cluster/apps" element={<PlaceholderView routeName="Apps" />} />
              <Route path="/cluster/storage" element={<PlaceholderView routeName="Storage" />} />
              <Route path="/cluster/bots" element={<PlaceholderView routeName="Bots" />} />
              <Route path="/cluster/logs" element={<PlaceholderView routeName="Logs" />} />
              <Route path="/cluster/settings" element={<PlaceholderView routeName="Settings" />} />
            </Routes>
          </div>
          {chatVisible && (
            <ChatRail
              bots={clusterData?.bots ?? []}
              threadByBot={clusterData?.threadByBot ?? {}}
              activeBot={activeBot}
              onActiveBotChange={setActiveBot}
            />
          )}
        </div>
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
