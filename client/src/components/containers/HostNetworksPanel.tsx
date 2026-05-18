import React from 'react';
import type { DockerHost } from '@homelab/shared';
import { ROLE_BY_HOST, getNetworkColor } from './constants';

interface HostNetworksPanelProps {
  host: DockerHost;
}

export const HostNetworksPanel: React.FC<HostNetworksPanelProps> = ({ host }) => {
  const totalAttached = host.networks.reduce((a, n) => a + (n.attached || 0), 0);

  return (
    <div className="panel host-networks-panel">
      <div className="host-panel-header">
        <div className="host-panel-mark" data-role={ROLE_BY_HOST[host.id]}>
          {host.id.slice(0, 2).toUpperCase()}
        </div>

        <div className="host-panel-info">
          <div className="host-panel-name">{host.id}</div>
          <div className="host-panel-meta">{host.networks.length} networks</div>
        </div>

        <div className="host-panel-counts">
          <span>
            <strong>{totalAttached}</strong> <span className="label">ATTACHED</span>
          </span>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="docker-table">
          <thead>
            <tr>
              <th>Network</th>
              <th>Driver</th>
              <th>Subnet</th>
              <th>Gateway</th>
              <th>Scope</th>
              <th className="num-right">Attached</th>
            </tr>
          </thead>
          <tbody>
            {host.networks.map(n => (
              <tr key={n.name}>
                <td>
                  <span className="network-name-cell">
                    <span className={`network-dot network-dot--${getNetworkColor(n.name)}`} />
                    {n.name}
                  </span>
                </td>
                <td>
                  <span className="driver-pill">{n.driver}</span>
                </td>
                <td className="mono-cell">{n.subnet}</td>
                <td className="mono-cell">{n.gateway}</td>
                <td className="mono-cell">{n.scope}</td>
                <td className="num-right">{n.attached}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
