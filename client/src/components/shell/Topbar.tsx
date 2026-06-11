import React from 'react';
import { Icon } from '../shared/Icon';

// Build breadcrumb path from nav id
// e.g., 'containers/networks' → ['/', 'cluster', 'asgard', 'containers', 'networks']
function crumbsFor(navId: string, clusterName: string): string[] {
  const parts = navId.split('/').filter(Boolean);
  const base = ['/', 'cluster', clusterName || 'homelab'];
  return [...base, ...parts.map(s => s.toLowerCase())];
}

interface TopbarProps {
  navId: string;            // current active nav id
  clusterName: string;
  alertsCount: number;
  chatVisible: boolean;
  sidebarCollapsed: boolean;
  onSidebarCollapse: (v: boolean) => void;
  onChatToggle: () => void;
  onRefresh: () => void;
  onOpenCommandPalette: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  navId,
  clusterName,
  alertsCount,
  chatVisible,
  sidebarCollapsed,
  onSidebarCollapse,
  onChatToggle,
  onRefresh,
  onOpenCommandPalette,
}) => {
  const crumbs = crumbsFor(navId, clusterName);

  return (
    <header className="topbar">
      {/* Sidebar toggle */}
      <button
        className="topbar-ico"
        title="Toggle sidebar"
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        onClick={() => onSidebarCollapse(!sidebarCollapsed)}
      >
        <Icon name={sidebarCollapsed ? 'chevRight' : 'chevLeft'} size={14} />
      </button>

      {/* Workspace chip */}
      <button className="ws-chip">
        <span className="ws-chip-dot" />
        <span>{clusterName || 'homelab'}</span>
        <Icon name="chevDown" size={11} />
      </button>

      {/* Breadcrumbs */}
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

      {/* Command palette button */}
      <button className="topbar-palette" onClick={onOpenCommandPalette}>
        <Icon name="search" size={13} />
        <span className="label">Search hosts, containers, apps, bots… or run a command</span>
        <span className="kbd">⌘K</span>
      </button>

      {/* Alert bell */}
      <button
        className="topbar-ico"
        title="Alerts"
        aria-label={alertsCount > 0 ? `${alertsCount} alerts` : 'No alerts'}
      >
        <Icon name="bell" size={15} />
        {alertsCount > 0 && <span className="ind" />}
      </button>

      {/* Refresh */}
      <button className="topbar-ico" title="Refresh" aria-label="Refresh" onClick={onRefresh}>
        <Icon name="refresh" size={15} />
      </button>

      {/* Bot console toggle */}
      <button
        className={`topbar-ico${chatVisible ? ' active' : ''}`}
        title={chatVisible ? 'Close bot console' : 'Open bot console'}
        aria-label={chatVisible ? 'Close bot console' : 'Open bot console'}
        onClick={onChatToggle}
      >
        <Icon name="bot" size={15} />
      </button>

      {/* Env pill */}
      <span className="env-pill">
        <span className="dot" />
        main
      </span>
    </header>
  );
};
