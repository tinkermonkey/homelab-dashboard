import React from 'react';
import type { DockerHost, Network } from '@homelab/shared';
import { Panel, Table } from '@tinkermonkey/heimdall-ui';
import type { Column } from '@tinkermonkey/heimdall-ui';

interface NetworksTabProps {
  hosts: DockerHost[];
}

type NetworkRow = Network & { host: string; _key: string };

const COLUMNS: Column<NetworkRow>[] = [
  {
    key: 'name',
    label: 'Network',
    width: '20%',
    render: (_v, row) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: `rgb(var(--status-cyan))`,
        }} />
        <span className="cell-name" style={{ fontSize: 12.5 }}>{row.name}</span>
      </span>
    ),
  },
  {
    key: 'host',
    label: 'Host',
    width: '12%',
    render: (v) => <span className="cell-mono">{String(v)}</span>,
  },
  {
    key: 'driver',
    label: 'Driver',
    width: '12%',
    render: (v) => <span className="tag-pill">{String(v)}</span>,
  },
  {
    key: 'subnet',
    label: 'Subnet',
    width: '18%',
    render: (v) => <span className="cell-mono">{String(v)}</span>,
  },
  {
    key: 'gateway',
    label: 'Gateway',
    width: '16%',
    render: (v) => <span className="cell-mono">{String(v)}</span>,
  },
  {
    key: 'scope',
    label: 'Scope',
    width: '10%',
    render: (v) => <span className="cell-mono">{String(v)}</span>,
  },
  {
    key: 'attached',
    label: 'Attached',
    width: '12%',
    render: (v) => <span className="cell-mono">{String(v)} ctr</span>,
  },
];

export const NetworksTab: React.FC<NetworksTabProps> = ({ hosts }) => {
  const rows: NetworkRow[] = [];
  hosts.forEach(h =>
    h.networks.forEach(n =>
      rows.push({ ...n, host: h.id, _key: `${h.id}/${n.name}` })
    )
  );

  return (
    <Panel
      className="panel-flush"
      title="Networks"
      subtitle={`${rows.length} bridge networks across ${hosts.length} hosts`}
    >
      <Table columns={COLUMNS} data={rows} rowKey="_key" />
    </Panel>
  );
};
