import React from 'react';
import type { DockerHost } from '@homelab/shared';
import { HostContainersPanel } from './HostContainersPanel';

interface ContainersTabProps {
  hosts: DockerHost[];
  query: string;
}

export const ContainersTab: React.FC<ContainersTabProps> = ({ hosts, query }) => {
  return (
    <div className="containers-tab">
      {hosts.map(host => (
        <HostContainersPanel key={host.id} host={host} query={query} />
      ))}
    </div>
  );
};
