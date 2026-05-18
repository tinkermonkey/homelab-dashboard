import React from 'react';
import type { DockerHost } from '@homelab/shared';
import { HostVolumesPanel } from './HostVolumesPanel';

interface VolumesTabProps {
  hosts: DockerHost[];
}

export const VolumesTab: React.FC<VolumesTabProps> = ({ hosts }) => {
  return (
    <div className="volumes-tab">
      {hosts.map(host => (
        <HostVolumesPanel key={host.id} host={host} />
      ))}
    </div>
  );
};
