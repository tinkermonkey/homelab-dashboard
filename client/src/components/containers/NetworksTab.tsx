import React from 'react';
import type { DockerHost } from '@homelab/shared';
import { HostNetworksPanel } from './HostNetworksPanel';

interface NetworksTabProps {
  hosts: DockerHost[];
}

export const NetworksTab: React.FC<NetworksTabProps> = ({ hosts }) => {
  return (
    <div className="networks-tab">
      {hosts.map(host => (
        <HostNetworksPanel key={host.id} host={host} />
      ))}
    </div>
  );
};
