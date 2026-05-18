import React, { useState, useMemo } from 'react';
import type { DockerHost } from '@homelab/shared';
import { ContainerRow } from './ContainerRow';
import { Icon } from '../shared/Icon';

interface HostContainersPanelProps {
  host: DockerHost;
  query: string;
}

const ROLE_BY_HOST: Record<string, string> = {
  nyx: 'compute',
  helios: 'storage',
  aether: 'k8s',
  vega: 'gpu',
};

export const HostContainersPanel: React.FC<HostContainersPanelProps> = ({ host, query }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const containers = useMemo(() => {
    if (!query) return host.containers;
    const q = query.toLowerCase();
    return host.containers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.image.toLowerCase().includes(q) ||
      c.tag.toLowerCase().includes(q)
    );
  }, [host, query]);

  if (containers.length === 0 && query) return null;

  const running = host.containers.filter(c => c.state === 'running').length;

  return (
    <div className="panel host-containers-panel">
      <div className="host-panel-header">
        <button
          className="host-panel-collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <Icon name={isCollapsed ? 'chevron-right' : 'chevron-down'} size={16} />
        </button>

        <div className="host-panel-mark" data-role={ROLE_BY_HOST[host.id]}>
          {host.id.slice(0, 2).toUpperCase()}
        </div>

        <div className="host-panel-info">
          <div className="host-panel-name">
            {host.id}
            <span className="host-panel-engine">{host.engine}</span>
          </div>
          <div className="host-panel-meta">{host.compose}</div>
        </div>

        <div className="host-panel-counts">
          <span>
            <strong>{running}</strong>/{host.containers.length} <span className="label">RUNNING</span>
          </span>
        </div>
      </div>

      {!isCollapsed && (
        <div className="container-list">
          {containers.map(c => (
            <ContainerRow key={c.id} container={c} />
          ))}
        </div>
      )}
    </div>
  );
};
