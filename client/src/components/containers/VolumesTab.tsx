import React from 'react';
import type { DockerHost, Volume } from '@homelab/shared';
import { Panel, Table } from '@tinkermonkey/heimdall-ui';
import type { Column } from '@tinkermonkey/heimdall-ui';

interface VolumesTabProps {
  hosts: DockerHost[];
}

type VolumeRow = Volume & { host: string; _key: string };

const COLUMNS: Column<VolumeRow>[] = [
  {
    key: 'name',
    label: 'Volume',
    width: '20%',
    render: (v) => <span className="cell-name" style={{ fontSize: 12.5 }}>{String(v)}</span>,
  },
  {
    key: 'host',
    label: 'Host',
    width: '10%',
    render: (v) => <span className="cell-mono">{String(v)}</span>,
  },
  {
    key: 'driver',
    label: 'Driver',
    width: '10%',
    render: (v) => <span className="tag-pill">{String(v)}</span>,
  },
  {
    key: 'size',
    label: 'Size',
    width: '12%',
    render: (v) => <span className="cell-mono">{String(v)}</span>,
  },
  {
    key: 'usedBy',
    label: 'Used by',
    width: '20%',
    render: (v) => {
      const used = v as string[];
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {used.map((u, i) => <span key={i} className="tag-pill">{u}</span>)}
        </div>
      );
    },
  },
  {
    key: 'mount',
    label: 'Mountpoint',
    width: '28%',
    render: (v) => (
      <span className="cell-mono" style={{ color: 'rgb(var(--canvas-fg-3))' }}>{String(v)}</span>
    ),
  },
];

export const VolumesTab: React.FC<VolumesTabProps> = ({ hosts }) => {
  const rows: VolumeRow[] = [];
  hosts.forEach(h =>
    h.volumes.forEach(v =>
      rows.push({ ...v, host: h.id, _key: `${h.id}/${v.name}` })
    )
  );

  return (
    <Panel
      className="panel-flush"
      title="Volumes"
      subtitle={`${rows.length} local volumes`}
    >
      <Table columns={COLUMNS} data={rows} rowKey="_key" />
    </Panel>
  );
};
