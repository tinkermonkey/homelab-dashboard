import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import './styles/heimdall.css';
import './styles/globals.css';
import { usePersistedState } from './utils/localStorage';
import { useCluster } from './hooks/useAPI';
import { CommandPalette } from './components/shell/CommandPalette';
import { Sidebar } from './components/shell/Sidebar';
import { NAV_TREE, PATH_TO_NAV_ID, NAV_ID_TO_PATH } from './components/shell/sidebarNav';
import { Topbar } from './components/shell/Topbar';
import { Statusbar } from './components/shell/Statusbar';
import { OverviewView } from './components/overview/OverviewView';
import { ContainersView } from './components/containers/ContainersView';
import { TopologyView } from './components/topology/TopologyView';
import { NetworkView } from './components/network/NetworkView';
import { PlaceholderView } from './components/shared/PlaceholderView';
import { ErrorView } from './components/shared/ErrorView';
import { ChatRail } from './components/chat/ChatRail';

// Command palette commands derived from nav tree
const PALETTE_COMMANDS = NAV_TREE.map(item => ({
  id: item.id,
  label: item.label,
  path: NAV_ID_TO_PATH[item.id] ?? '/cluster/overview',
  icon: item.icon,
  category: 'Navigation',
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
  const [showAlerts] = usePersistedState('showAlerts', true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const { data: clusterData, isLoading, error, refetch } = useCluster();

  const clusterName = clusterData?.cluster?.name ?? 'homelab';
  const activeNavId = PATH_TO_NAV_ID[location.pathname] ?? 'overview';
  const alertsCount = clusterData?.cluster?.activeAlerts ?? 0;

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

  const overviewContent = isLoading ? (
    <PlaceholderView routeName="Overview" />
  ) : error ? (
    <ErrorView
      title="Failed to Load Overview"
      message="Could not fetch cluster data. Please try again in a moment."
      isDegraded={false}
    />
  ) : clusterData ? (
    <OverviewView data={clusterData} showAlerts={showAlerts} />
  ) : (
    <ErrorView
      title="No Data Available"
      message="No cluster data could be loaded."
      isDegraded={false}
    />
  );

  return (
    <div className="desktop">
      <div className={`app-shell${chatVisible ? ' with-chat' : ' no-chat'}`}>

        <Sidebar
          activeId={activeNavId}
          clusterName={clusterName}
          collapsed={sidebarCollapsed}
          onCollapse={setSidebarCollapsed}
          onNavigate={(path) => navigate(path)}
          servers={clusterData?.servers}
          apps={clusterData?.apps}
          bots={clusterData?.bots}
        />

        <div className="workspace">
          <Topbar
            navId={activeNavId}
            clusterName={clusterName}
            alertsCount={alertsCount}
            chatVisible={chatVisible}
            sidebarCollapsed={sidebarCollapsed}
            onSidebarCollapse={setSidebarCollapsed}
            onChatToggle={() => setChatVisible(!chatVisible)}
            onRefresh={() => refetch()}
            onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          />

          <main className="canvas-area">
            <div className="canvas-inner">
              <CommandPalette
                isOpen={commandPaletteOpen}
                onClose={() => setCommandPaletteOpen(false)}
                commands={PALETTE_COMMANDS}
              />
              <Routes>
                <Route path="/" element={<Navigate to={activeRoute} replace />} />
                <Route path="/cluster/overview" element={overviewContent} />
                <Route path="/cluster/containers" element={<ContainersView />} />
                <Route path="/cluster/topology" element={<TopologyView />} />
                <Route path="/cluster/servers" element={<PlaceholderView routeName="Servers" />} />
                <Route path="/cluster/network" element={<NetworkView />} />
                <Route path="/cluster/applications" element={<PlaceholderView routeName="Applications" />} />
                <Route path="/cluster/storage" element={<PlaceholderView routeName="Storage" />} />
                <Route path="/cluster/bots" element={<PlaceholderView routeName="Bots" />} />
                <Route path="/cluster/logs" element={<PlaceholderView routeName="Logs" />} />
                <Route path="/cluster/configuration" element={<PlaceholderView routeName="Configuration" />} />
                <Route path="/cluster/apps" element={<Navigate to="/cluster/applications" replace />} />
                <Route path="/cluster/settings" element={<Navigate to="/cluster/configuration" replace />} />
              </Routes>
            </div>
          </main>
        </div>

        {chatVisible && (
          <ChatRail
            bots={clusterData?.bots ?? []}
            threadByBot={clusterData?.threadByBot ?? {}}
            activeBot={activeBot}
            onActiveBotChange={setActiveBot}
            onClose={() => setChatVisible(false)}
          />
        )}
      </div>

      <Statusbar clusterData={clusterData} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};
