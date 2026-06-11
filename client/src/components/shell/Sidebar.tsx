import React from 'react';
import { Icon } from '../shared/Icon';
import { NAV_TREE, NAV_ID_TO_PATH } from './sidebarNav';
import type { NavChild, NavEntry } from './sidebarNav';

interface SidebarProps {
  activeId: string;        // current nav item id from PATH_TO_NAV_ID
  clusterName: string;
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  onNavigate: (path: string) => void;
  // Live API data for dynamic nav counts & sub-items
  servers?: { id: string; role: string; containers: number }[];
  apps?: { id: string }[];
  bots?: { id: string; label: string; role: string }[];
}

/** Build the live nav tree by injecting counts and sub-items from API data. */
function buildNavTree(
  servers: SidebarProps['servers'] = [],
  apps: SidebarProps['apps'] = [],
  bots: SidebarProps['bots'] = [],
): NavEntry[] {
  const totalContainers = servers.reduce((n, s) => n + s.containers, 0);

  const serverChildren: NavChild[] = servers.map(s => ({
    id: `servers/${s.id}`,
    label: s.id,
    count: s.role,
  }));

  const botChildren: NavChild[] = bots.map(b => ({
    id: `bots/${b.id}`,
    label: b.id,
    count: b.role,
  }));

  return NAV_TREE.map(item => {
    switch (item.id) {
      case 'servers':
        return {
          ...item,
          count: servers.length > 0 ? String(servers.length) : undefined,
          children: serverChildren.length > 0 ? serverChildren : undefined,
        };
      case 'containers':
        return {
          ...item,
          count: totalContainers > 0 ? String(totalContainers) : undefined,
        };
      case 'apps':
        return {
          ...item,
          count: apps.length > 0 ? String(apps.length) : undefined,
        };
      case 'bots':
        return {
          ...item,
          count: bots.length > 0 ? String(bots.length) : undefined,
          children: botChildren.length > 0 ? botChildren : undefined,
        };
      default:
        return item;
    }
  });
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeId,
  clusterName,
  collapsed,
  onCollapse,
  onNavigate,
  servers,
  apps,
  bots,
}) => {
  const navTree = buildNavTree(servers, apps, bots);

  const isActive = (id: string) => activeId === id || activeId.startsWith(id + '/');
  const isLeafActive = (id: string) => activeId === id;
  const isExpanded = (id: string) => isActive(id);

  const handleItemClick = (item: NavEntry) => {
    const target = item.children
      ? NAV_ID_TO_PATH[item.id] || NAV_ID_TO_PATH[item.children[0].id] || '/cluster/overview'
      : NAV_ID_TO_PATH[item.id] || '/cluster/overview';
    onNavigate(target);
  };

  return (
    <aside className={`shell-rail${collapsed ? ' collapsed' : ''}`}>
      {/* Brand row */}
      <div className="brand-row">
        <span className="brand-mark"><i /></span>
        <div className="brand-name">
          {clusterName || 'homelab'}
          <span>homelab · v3.2</span>
        </div>
        <button
          className="rail-collapse"
          onClick={() => onCollapse(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Icon name={collapsed ? 'chevRight' : 'chevLeft'} size={11} />
        </button>
      </div>

      {/* Nav */}
      <nav className="nav-section">
        {navTree.flatMap((item) => {
          const expanded = isExpanded(item.id);
          const rows: React.ReactNode[] = [];

          rows.push(
            <div
              key={item.id}
              className={[
                'nav-item',
                item.children
                  ? (isActive(item.id) ? 'active-parent' : '')
                  : (isLeafActive(item.id) ? 'active' : ''),
              ].join(' ').trim()}
              onClick={() => handleItemClick(item)}
              title={collapsed ? item.label : undefined}
              role="button"
            >
              <Icon name={item.icon} size={15} />
              <span className="nav-label">{item.label}</span>
              {item.count != null && !item.children && (
                <span className="nav-count">{item.count}</span>
              )}
              {item.children && !collapsed && (
                <Icon name={expanded ? 'chevDown' : 'chevRight'} size={12} />
              )}
            </div>
          );

          if (item.children && expanded && !collapsed) {
            rows.push(
              <div key={item.id + ':sub'} className="nav-sub">
                {item.children.map((c) => (
                  <div
                    key={c.id}
                    className={`nav-item${isLeafActive(c.id) ? ' active' : ''}`}
                    onClick={() => onNavigate(NAV_ID_TO_PATH[c.id] ?? NAV_ID_TO_PATH[c.id.split('/')[0]] ?? '/cluster/overview')}
                    role="button"
                  >
                    <span className="nav-label">{c.label}</span>
                    {c.count != null && <span className="nav-count">{c.count}</span>}
                  </div>
                ))}
              </div>
            );
          }

          return rows;
        })}
      </nav>

      {/* Rail footer */}
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
  );
};
