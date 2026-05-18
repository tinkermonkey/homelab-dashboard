import React from 'react';
import type { Container } from '@homelab/shared';

interface ContainerRowProps {
  container: Container;
}

const getStateColor = (state: string): string => {
  switch (state) {
    case 'running':
      return 'emerald';
    case 'exited':
      return 'neutral';
    case 'updating':
      return 'cyan';
    default:
      return 'neutral';
  }
};

const getHealthColor = (health: string): string => {
  switch (health) {
    case 'healthy':
      return 'emerald';
    case 'unhealthy':
    case 'failed':
      return 'rose';
    case 'degraded':
      return 'amber';
    case 'pulling':
      return 'cyan';
    default:
      return 'neutral';
  }
};

export const ContainerRow: React.FC<ContainerRowProps> = ({ container }) => {
  const showHealthBadge = container.health &&
    container.health !== 'healthy' &&
    !['running', 'exited', 'updating'].includes(container.state);

  return (
    <div className="container-row">
      <div className={`container-row-status-dot status-dot status-dot--${getStateColor(container.state)}`} />

      <div className="container-row-id-section">
        <div className="container-row-name">
          {container.name}
          <span className="container-row-cid">{container.id.slice(0, 12)}</span>
        </div>
        <div className="container-row-image">
          {container.image}
          <span className="container-row-tag">:{container.tag}</span>
        </div>
        <div className="container-row-badges">
          <span className={`status-badge status-badge--${getStateColor(container.state)}`}>{container.state}</span>
          {showHealthBadge && (
            <span className={`status-badge status-badge--${getHealthColor(container.health)}`}>
              {container.health}
            </span>
          )}
          {container.health === 'healthy' && (
            <span className="status-badge status-badge--emerald">healthy</span>
          )}
        </div>
      </div>

      <div className="container-row-details">
        {container.ports.length > 0 && (
          <div className="container-row-detail-row">
            <span className="detail-key">PORTS</span>
            <span className="detail-values">
              {container.ports.map((p, i) => (
                <PortPill key={i} port={p} />
              ))}
            </span>
          </div>
        )}
        {container.mounts.length > 0 && (
          <div className="container-row-detail-row">
            <span className="detail-key">MOUNTS</span>
            <span className="detail-values">
              {container.mounts.map((m, i) => (
                <MountPill key={i} mount={m} />
              ))}
            </span>
          </div>
        )}
        {container.networks.length > 0 && (
          <div className="container-row-detail-row">
            <span className="detail-key">NET</span>
            <span className="detail-values networks">
              {container.networks.map(n => (
                <NetPill key={n} network={n} />
              ))}
            </span>
          </div>
        )}
      </div>

      <div className="container-row-stats">
        <span className="stat-uptime">↑ {container.uptime}</span>
        <span className="stat-size">{container.size}</span>
        {container.cpu > 0 && (
          <span className="stat-resources">
            cpu <span className="stat-value">{container.cpu}%</span>
            <span className="stat-separator">·</span>
            mem <span className="stat-value">{container.mem >= 1024 ? (container.mem / 1024).toFixed(1) + ' GB' : container.mem + ' MB'}</span>
          </span>
        )}
        {container.gpu != null && container.gpu > 0 && (
          <span className="stat-resources">
            gpu <span className="stat-value stat-value--amber">{container.gpu}%</span>
          </span>
        )}
      </div>
    </div>
  );
};

const PortPill: React.FC<{ port: string }> = ({ port }) => {
  const [hostPort, rest] = port.split(':');
  const [containerPort, proto] = (rest || '').split('/');

  return (
    <span className="port-pill" title={port}>
      {hostPort}
      <span className="pill-arrow">→</span>
      {containerPort}
      <span className="pill-proto">{proto}</span>
    </span>
  );
};

const MountPill: React.FC<{ mount: any }> = ({ mount }) => {
  const isBind = mount.type === 'bind';
  const source = isBind ? mount.host : mount.name;
  const isReadOnly = mount.mode === 'ro';

  return (
    <span className="mount-pill" title={isBind ? `${mount.host} → ${mount.container}` : `${mount.name} → ${mount.container}`}>
      <span className={`mount-type mount-type--${mount.type}`}>{isBind ? 'B' : 'V'}</span>
      <span className="mount-source">{source}</span>
      <span className="pill-arrow">→</span>
      <span className="mount-target">{mount.container}</span>
      {isReadOnly && <span className="mount-ro">ro</span>}
    </span>
  );
};

const NetPill: React.FC<{ network: string }> = ({ network }) => {
  const getNetworkColor = (name: string): string => {
    const colorMap: Record<string, string> = {
      proxy_net: 'cyan',
      iot_net: 'amber',
      media_net: 'violet',
      dev_net: 'emerald',
      ai_net: 'rose',
      obs_net: 'cyan',
      cloud_net: 'emerald',
      backup_net: 'cyan',
      net_net: 'violet',
      cni0: 'amber',
    };
    return colorMap[name] || 'neutral';
  };

  return (
    <span className={`net-pill net-pill--${getNetworkColor(network)}`}>
      <span className="net-dot" />
      {network}
    </span>
  );
};
