import React from 'react';
import type { Server } from '@homelab/shared';
import {
  PageHeader, Panel, Table, ProgressBar, Chip, RowMenu, Button,
} from '@tinkermonkey/heimdall-ui';
import type { Column, RowMenuAction, StatusColor } from '@tinkermonkey/heimdall-ui';
import { useCluster } from '../../hooks/useAPI';
import { Icon } from '../shared/Icon';
import { DegradationBanner } from '../shared/DegradationBanner';

const ROLE_COLOR: Record<Server['role'], StatusColor> = {
  compute: 'cyan',
  storage: 'emerald',
  k8s: 'violet',
  gpu: 'amber',
};

const SRV_ACTIONS: RowMenuAction[] = [
  { id: 'ssh', label: 'Open SSH' },
  { id: 'metrics', label: 'Grafana metrics', icon: 'bar-chart' },
  { id: 'reboot', label: 'Reboot' },
  { type: 'separator' },
  { id: 'drain', label: 'Drain & cordon', icon: 'slash', danger: true },
];

function getInitials(id: string): string {
  return id.split('-').map(w => w[0]).join('').substring(0, 2).toUpperCase();
}

function cpuTone(v: number): StatusColor { return v >= 75 ? 'amber' : 'cyan'; }
function memTone(v: number): StatusColor { return v >= 80 ? 'amber' : 'violet'; }
function diskTone(v: number): StatusColor { return v >= 85 ? 'amber' : 'emerald'; }

function MetricBar({ percent, color }: { percent: number; color: StatusColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, minWidth: 60 }}>
        <ProgressBar percent={percent} color={color} height={6} />
      </div>
      <span className="cell-mono" style={{ width: 34, textAlign: 'right' }}>{percent}%</span>
    </div>
  );
}

const COLUMNS: Column<Server>[] = [
  {
    key: 'id',
    label: 'Host',
    width: '22%',
    render: (_v, row) => (
      <div className="row" style={{ gap: 10 }}>
        <div className="role-mark" data-role={row.role}>{getInitials(row.id)}</div>
        <div>
          <div className="cell-name">{row.id}</div>
          <div className="cell-sub">{row.ip}</div>
        </div>
      </div>
    ),
  },
  {
    key: 'role',
    label: 'Role',
    width: '12%',
    render: (v) => <Chip variant={ROLE_COLOR[v as Server['role']]}>{String(v)}</Chip>,
  },
  {
    key: 'cpu',
    label: 'CPU',
    width: '16%',
    render: (_v, row) => <MetricBar percent={row.cpu.v} color={cpuTone(row.cpu.v)} />,
  },
  {
    key: 'mem',
    label: 'Memory',
    width: '16%',
    render: (_v, row) => <MetricBar percent={row.mem.v} color={memTone(row.mem.v)} />,
  },
  {
    key: 'disk',
    label: 'Disk',
    width: '16%',
    render: (_v, row) => <MetricBar percent={row.disk.v} color={diskTone(row.disk.v)} />,
  },
  {
    key: 'uptime',
    label: 'Uptime',
    width: '12%',
    render: (v) => <span className="cell-mono">{String(v)}</span>,
  },
  {
    key: 'containers',
    label: '',
    width: '6%',
    render: (v) => (
      <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
        <span className="tag-pill">{String(v)} ctr</span>
        <RowMenu actions={SRV_ACTIONS} onAction={() => {}} />
      </div>
    ),
  },
];

export const ServersView: React.FC = () => {
  const { data } = useCluster();

  const servers = data?.servers ?? [];
  const clusterName = data?.cluster?.name ?? 'asgard';
  const reachable = servers.filter(s => s.status !== 'err').length;

  return (
    <>
      <PageHeader
        eyebrow={
          (<span className="eyebrow-row">
            <Chip variant="cyan">hosts · {servers.length}</Chip>
            <span className="mono-meta">{reachable} reachable · polled 15 s</span>
          </span>) as unknown as string
        }
        idChip={`/cluster/${clusterName.toLowerCase()}/servers`}
        title="Servers"
        subtitle="Physical and virtual hosts in the asgard cluster."
        actions={
          <Button variant="secondary" size="sm">
            <Icon name="plus" size={13} />
            Add host
          </Button>
        }
      />
      <DegradationBanner degraded={data?.degraded} />
      <Panel className="panel-flush">
        <Table columns={COLUMNS} data={servers} rowKey="id" />
      </Panel>
    </>
  );
};
