import React, { useMemo, useState, useCallback } from 'react';
import type { Server } from '@homelab/shared';
import {
  PageHeader, Panel, Table, ProgressBar, Chip, RowMenu, Button, ConfirmDialog, Toast,
} from '@tinkermonkey/heimdall-ui';
import type { Column, RowMenuAction, StatusColor, ToastVariant } from '@tinkermonkey/heimdall-ui';
import { useCluster } from '../../hooks/useAPI';
import { Icon } from '@tinkermonkey/heimdall-ui';
import { ErrorView } from '../shared/ErrorView';
import { asEyebrow } from '../../utils/pageHeader';
import { ROLE_COLOR, getInitials, cpuTone, memTone, diskTone } from '../../utils/hostUtils';
import { DegradationBanner } from '../shared/DegradationBanner';

const SRV_ACTIONS: RowMenuAction[] = [
  { id: 'ssh', label: 'Open SSH' },
  { id: 'metrics', label: 'Grafana metrics', icon: 'bar-chart' },
  { id: 'reboot', label: 'Reboot' },
  { type: 'separator' },
  { id: 'drain', label: 'Drain & cordon', icon: 'slash', danger: true },
];

interface PendingAction {
  actionId: 'reboot' | 'drain';
  serverId: string;
}

interface ToastState {
  title: string;
  subtitle?: string;
  variant: ToastVariant;
}

const CONFIRM_CONFIG: Record<PendingAction['actionId'], { title: string; message: (id: string) => string; confirmLabel: string; variant: 'primary' | 'danger' }> = {
  reboot: {
    title: 'Reboot server',
    message: (id) => `Reboot "${id}"? All running containers on this host will be interrupted.`,
    confirmLabel: 'Reboot',
    variant: 'primary',
  },
  drain: {
    title: 'Drain & cordon',
    message: (id) => `Drain and cordon "${id}"? The host will be made unavailable for scheduling.`,
    confirmLabel: 'Drain',
    variant: 'danger',
  },
};

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

const STATIC_COLUMNS: Column<Server>[] = [
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
];

export const ServersView: React.FC = () => {
  const { data, isLoading, error } = useCluster();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const handleAction = useCallback((actionId: string, serverId: string) => {
    if (actionId === 'reboot' || actionId === 'drain') {
      setPendingAction({ actionId, serverId });
    } else if (actionId === 'ssh') {
      setToast({ title: 'SSH access not yet available', subtitle: 'Terminal access will be available once the backend is connected.', variant: 'info' });
    } else if (actionId === 'metrics') {
      setToast({ title: 'Grafana metrics not yet available', subtitle: 'Metrics dashboard integration not yet configured.', variant: 'info' });
    }
  }, []);

  const columns = useMemo((): Column<Server>[] => [
    ...STATIC_COLUMNS,
    {
      key: 'containers',
      label: '',
      width: '6%',
      render: (v, row) => (
        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <span className="tag-pill">{String(v)} ctr</span>
          <RowMenu actions={SRV_ACTIONS} onAction={(actionId) => handleAction(actionId, row.id)} />
        </div>
      ),
    },
  ], [handleAction]);

  if (isLoading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (error || !data) return (
    <ErrorView
      title="Failed to Load Server Data"
      message={error instanceof Error ? error.message : 'Could not fetch cluster data. Please try again in a moment.'}
    />
  );

  const servers = data.servers ?? [];
  const reachable = servers.filter(s => s.status !== 'err').length;
  const confirm = pendingAction ? CONFIRM_CONFIG[pendingAction.actionId] : null;

  return (
    <>
      <PageHeader
        eyebrow={asEyebrow(
          <span className="eyebrow-row">
            <Chip variant="cyan">hosts · {servers.length}</Chip>
            <span className="mono-meta">{reachable} reachable · polled 15 s</span>
          </span>
        )}
        idChip="/cluster/asgard/servers"
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
        <Table columns={columns} data={servers} rowKey="id" />
      </Panel>
      {confirm && pendingAction && (
        <ConfirmDialog
          isOpen
          onClose={() => setPendingAction(null)}
          onConfirm={() => {
            setPendingAction(null);
            setToast({ title: 'Backend not connected', subtitle: 'Server actions require the backend API to be running.', variant: 'warning' });
          }}
          title={confirm.title}
          message={confirm.message(pendingAction.serverId)}
          confirmLabel={confirm.confirmLabel}
          variant={confirm.variant}
        />
      )}
      {toast && (
        <Toast
          isOpen
          onClose={() => setToast(null)}
          title={toast.title}
          subtitle={toast.subtitle}
          variant={toast.variant}
          duration={4000}
        />
      )}
    </>
  );
};
