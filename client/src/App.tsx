import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  ShellLayout,
  Icon as HeimdallIcon,
  Button,
} from '@tinkermonkey/heimdall-ui';
import '@tinkermonkey/heimdall-ui';
import './styles/heimdall.css';
import './styles/globals.css';
import { usePersistedState } from './utils/localStorage';
import { useCluster } from './hooks/useAPI';
import { CommandPalette } from './components/shell/CommandPalette';
import { StatusbarContent } from './components/shell/Statusbar';
import { OverviewView } from './components/overview/OverviewView';
import { ContainersView } from './components/containers/ContainersView';
import { TopologyView } from './components/topology/TopologyView';
import { PlaceholderView } from './components/shared/PlaceholderView';
import { ErrorView } from './components/shared/ErrorView';
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

const AppContent: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = usePersistedState('sidebarCollapsed', false);
  const [darkCanvas, setDarkCanvas] = usePersistedState('darkCanvas', true);
  const [chatVisible, setChatVisible] = usePersistedState('chatVisible', false);
  const [activeBot, setActiveBot] = usePersistedState('activeBot', 'ops-bot');
  const [density, setDensity] = usePersistedState('density', 'regular');
  const [showAlerts, setShowAlerts] = usePersistedState('showAlerts', true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { data: clusterData, isLoading, error } = useCluster();

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

  const iconMap: Record<string, string> = {
    dashboard: 'dashboard',
    layers: 'layout',
    globe: 'graph',
    cpu: 'settings',
    link: 'link',
    zap: 'alert',
    database: 'settings',
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
        icon: (iconMap[item.icon] || 'dashboard') as any,
      })),
    },
  ];

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
    <>
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
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowAlerts(!showAlerts)}
                title="Toggle alerts visibility"
              >
                <HeimdallIcon name="bell" size={16} />
                {!sidebarCollapsed && 'Alerts'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDensity(density === 'compact' ? 'regular' : 'compact')}
                title="Toggle compact density"
              >
                <HeimdallIcon name="layout" size={16} />
                {!sidebarCollapsed && 'Density'}
              </Button>
              <Button
                variant={chatVisible ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setChatVisible(!chatVisible)}
                title="Toggle bot console"
              >
                <HeimdallIcon name="user" size={16} />
                {!sidebarCollapsed && 'Bot'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDarkCanvas(!darkCanvas)}
                title="Toggle dark/light mode"
              >
                <HeimdallIcon name={darkCanvas ? 'sun' : 'moon'} size={16} />
                {!sidebarCollapsed && (darkCanvas ? 'Light' : 'Dark')}
              </Button>
            </div>
          ),
        }}
        statusbar={{
          left: <StatusbarContent clusterData={clusterData} />,
        }}
      >
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          commands={commandPaletteCommands}
        />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <Routes>
              <Route path="/" element={<Navigate to="/cluster/overview" replace />} />
              <Route path="/cluster/overview" element={viewContent} />
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
          </div>
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
      </ShellLayout>
    </>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};
