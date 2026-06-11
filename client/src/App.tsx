import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import '@tinkermonkey/heimdall-ui/fonts';
import '@tinkermonkey/heimdall-ui/css';
import './styles/lab.css';
import './styles/globals.css';
import { Icon, Sidebar, Topbar, Statusbar } from '@tinkermonkey/heimdall-ui';
import { usePersistedState } from './utils/localStorage';
import { useCluster, useStatus } from './hooks/useAPI';
import { CommandPalette } from './components/shell/CommandPalette';
import { NAV_TREE, PATH_TO_NAV_ID, NAV_ID_TO_PATH } from './components/shell/sidebarNav';
import { OverviewView } from './components/overview/OverviewView';
import { ContainersView } from './components/containers/ContainersView';
import { TopologyView } from './components/topology/TopologyView';
import { NetworkView } from './components/network/NetworkView';
import { ServersView } from './components/servers/ServersView';
import { ApplicationsView } from './components/applications/ApplicationsView';
import { StorageView } from './components/storage/StorageView';
import { BotsView } from './components/bots/BotsView';
import { LogsView } from './components/logs/LogsView';
import { SettingsView } from './components/settings/SettingsView';
import { ErrorView } from './components/shared/ErrorView';
import { BotConsole } from './components/chat/BotConsole';

// Build package Sidebar sections from nav tree + live cluster data
function buildNavSections(
  servers: { id: string; role: string; containers: number }[] = [],
  apps: { id: string }[] = [],
  bots: { id: string; label: string; role: string }[] = [],
) {
  const totalContainers = servers.reduce((n, s) => n + s.containers, 0);

  return [{
    title: '',
    items: NAV_TREE.map(item => {
      switch (item.id) {
        case 'servers':
          return {
            ...item,
            count: servers.length || undefined,
            children: servers.map(s => ({ id: `servers/${s.id}`, label: s.id })),
          };
        case 'containers':
          return { ...item, count: totalContainers || undefined };
        case 'apps':
          return { ...item, count: apps.length || undefined };
        case 'bots':
          return {
            ...item,
            count: bots.length || undefined,
            children: bots.map(b => ({ id: `bots/${b.id}`, label: b.id })),
          };
        default:
          return { ...item };
      }
    }),
  }];
}

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
  const { data: statusData } = useStatus();

  const clusterName = clusterData?.cluster?.name ?? 'homelab';
  const activeNavId = PATH_TO_NAV_ID[location.pathname] ?? 'overview';

  const navSections = useMemo(
    () => buildNavSections(clusterData?.servers, clusterData?.apps, clusterData?.bots),
    [clusterData],
  );

  const crumbs = useMemo(() => {
    const parts = activeNavId.split('/').filter(Boolean);
    return ['/', 'cluster', clusterName, ...parts.map(s => s.toLowerCase())];
  }, [activeNavId, clusterName]);

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

  const overviewContent = isLoading ? null : error ? (
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

  // Statusbar metrics
  const hostCount = clusterData?.servers?.length ?? 0;
  const appCount = clusterData?.apps?.length ?? 0;
  const containerCount = clusterData?.servers?.reduce((sum, s) => sum + s.containers, 0) ?? 0;
  const alertCount = clusterData?.cluster?.activeAlerts ?? 0;
  const primaryAlert = (() => {
    if (!clusterData?.servers?.length) return null;
    const warnServer = clusterData.servers.find(s => s.status === 'warn');
    return warnServer ? `${warnServer.id.toUpperCase()} MEM ${Math.round(warnServer.mem.v)}%` : null;
  })();
  const downMbps = statusData?.downMbps ?? 0;
  const upMbps = statusData?.upMbps ?? 0;
  const cpu = statusData?.cpu ?? 0;
  const ping = statusData?.ping ?? 0;

  return (
    <div className="desktop">
      <div className={`app-shell${chatVisible ? ' with-chat' : ' no-chat'}`}>

        {/* Sidebar — package component, wrapped with brand row + footer */}
        <aside className={`shell-rail${sidebarCollapsed ? ' collapsed' : ''}`}>
          <div className="brand-row">
            <span className="brand-mark"><i /></span>
            <div className="brand-name">
              {clusterName}
              <span>homelab · v3.2</span>
            </div>
            <button
              className="rail-collapse"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Icon name={sidebarCollapsed ? 'chevronRight' : 'chevronLeft'} size={11} />
            </button>
          </div>

          <Sidebar
            sections={navSections}
            activeItemId={activeNavId}
            collapsed={sidebarCollapsed}
            onSelectItem={(id) => navigate(NAV_ID_TO_PATH[id] ?? '/cluster/overview')}
          />

          <div className="rail-footer">
            <div className="rail-user">
              <span className="avatar">YN</span>
              <div className="rail-user-info">
                <div className="n">you</div>
                <div className="e">ssh · main</div>
              </div>
            </div>
          </div>
        </aside>

        <div className="workspace">
          {/* Topbar — package component; all chrome passed as children */}
          <Topbar>
            <button
              className="topbar-ico"
              title="Toggle sidebar"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              <Icon name={sidebarCollapsed ? 'chevronRight' : 'chevronLeft'} size={14} />
            </button>
            <button className="ws-chip">
              <span className="ws-chip-dot" />
              <span>{clusterName}</span>
              <Icon name="chevronDown" size={11} />
            </button>
            <div className="crumbs">
              {crumbs.map((c, i) => (
                <React.Fragment key={i}>
                  {i > 0 && i !== 1 && <span className="sep">/</span>}
                  {i === 0
                    ? <span className="sep">{c}</span>
                    : <span className={i === crumbs.length - 1 ? 'last' : ''}>{c}</span>
                  }
                </React.Fragment>
              ))}
            </div>
            <button className="topbar-palette" onClick={() => setCommandPaletteOpen(true)}>
              <Icon name="search" size={13} />
              <span className="label">Search hosts, containers, apps, bots… or run a command</span>
              <span className="kbd">⌘K</span>
            </button>
            <button
              className="topbar-ico"
              title="Alerts"
              aria-label={alertCount > 0 ? `${alertCount} alerts` : 'No alerts'}
            >
              <Icon name="bell" size={15} />
              {alertCount > 0 && <span className="ind" />}
            </button>
            <button
              className="topbar-ico"
              title="Refresh"
              aria-label="Refresh"
              onClick={() => refetch()}
            >
              <Icon name="reload" size={15} />
            </button>
            <button
              className={`topbar-ico${chatVisible ? ' active' : ''}`}
              title={chatVisible ? 'Close bot console' : 'Open bot console'}
              aria-label={chatVisible ? 'Close bot console' : 'Open bot console'}
              onClick={() => setChatVisible(!chatVisible)}
            >
              <Icon name="bot" size={15} />
            </button>
            <span className="env-pill">
              <span className="dot" />
              main
            </span>
          </Topbar>

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
                <Route path="/cluster/servers" element={<ServersView />} />
                <Route path="/cluster/network" element={<NetworkView />} />
                <Route path="/cluster/applications" element={<ApplicationsView />} />
                <Route path="/cluster/storage" element={<StorageView />} />
                <Route path="/cluster/bots" element={<BotsView />} />
                <Route path="/cluster/logs" element={<LogsView />} />
                <Route path="/cluster/configuration" element={<SettingsView />} />
                <Route path="/cluster/apps" element={<Navigate to="/cluster/applications" replace />} />
                <Route path="/cluster/settings" element={<Navigate to="/cluster/configuration" replace />} />
              </Routes>
            </div>
          </main>
        </div>

        {chatVisible && (
          <BotConsole
            bots={clusterData?.bots ?? []}
            threadByBot={clusterData?.threadByBot ?? {}}
            activeBot={activeBot}
            onActiveBotChange={setActiveBot}
            onClose={() => setChatVisible(false)}
          />
        )}
      </div>

      {/* Statusbar — package component with left/right content slots */}
      <Statusbar
        left={
          <div className="statusbar-group">
            <div className="sb-item">
              <span className="pulse emerald xs" />
              prometheus<strong className="strong">:9090</strong>
            </div>
            {hostCount > 0 && (
              <>
                <span className="sb-divider" />
                <div className="sb-item">
                  <strong className="strong">{hostCount}</strong> host{hostCount !== 1 ? 's' : ''}&ensp;·&ensp;
                  <strong className="strong">{appCount}</strong> app{appCount !== 1 ? 's' : ''}&ensp;·&ensp;
                  <strong className="strong">{containerCount}</strong> container{containerCount !== 1 ? 's' : ''}
                </div>
              </>
            )}
            {alertCount > 0 && (
              <>
                <span className="sb-divider" />
                <div className="sb-item">
                  <span className="pulse amber xs" />
                  <strong className="strong">{alertCount}</strong> alert{alertCount !== 1 ? 's' : ''} open
                  {primaryAlert && <>&ensp;·&ensp;<strong className="strong">{primaryAlert}</strong></>}
                </div>
              </>
            )}
          </div>
        }
        right={
          <div className="statusbar-group">
            <div className="sb-item">ping&ensp;<strong className="strong">{ping} ms</strong></div>
            <span className="sb-divider" />
            <div className="sb-item">
              ↓&ensp;<strong className="strong">{downMbps}</strong>&ensp;↑&ensp;<strong className="strong">{upMbps}</strong>&ensp;Mbps
            </div>
            <span className="sb-divider" />
            <div className="sb-item">cluster cpu&ensp;<strong className="strong">{cpu}%</strong></div>
            <span className="sb-divider" />
            <div className="sb-item">
              <Icon name="check" size={10} />
              &ensp;synced&ensp;<strong className="strong">{clusterData?.cluster?.lastSync ?? '—'}</strong>
            </div>
          </div>
        }
      />
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
