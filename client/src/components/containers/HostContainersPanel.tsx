import React, { useMemo, useState, useCallback } from 'react';
import type { DockerHost, Container } from '@homelab/shared';
import { Panel, Table, Chip, RowMenu, ConfirmDialog, Toast } from '@tinkermonkey/heimdall-ui';
import type { Column, RowMenuAction, ToastVariant } from '@tinkermonkey/heimdall-ui';

interface HostContainersPanelProps {
  host: DockerHost;
  query: string;
}

const HEALTH_COLOR: Record<string, 'emerald' | 'amber' | 'rose' | 'cyan' | 'neutral'> = {
  healthy: 'emerald',
  degraded: 'amber',
  unhealthy: 'rose',
  failed: 'rose',
  pulling: 'cyan',
  exited: 'neutral',
  stopped: 'neutral',
  idle: 'neutral',
};

const CSTATE_COLOR: Record<string, 'emerald' | 'cyan' | 'neutral'> = {
  running: 'emerald',
  exited: 'neutral',
  updating: 'cyan',
};

const CTN_ACTIONS: RowMenuAction[] = [
  { id: 'restart', label: 'Restart', icon: 'reload' },
  { id: 'logs', label: 'View logs', icon: 'eye' },
  { id: 'stop', label: 'Stop', icon: 'x' },
  { type: 'separator' },
  { id: 'remove', label: 'Remove', icon: 'trash', danger: true },
];

type ContainerRow = Container & { _key: string };

interface PendingAction {
  actionId: 'restart' | 'stop' | 'remove';
  containerName: string;
}

interface ToastState {
  title: string;
  subtitle?: string;
  variant: ToastVariant;
}

const CONFIRM_CONFIG: Record<PendingAction['actionId'], { title: string; message: (name: string) => string; confirmLabel: string; variant: 'primary' | 'danger' }> = {
  restart: {
    title: 'Restart container',
    message: (name) => `Restart "${name}"? The container will be stopped and restarted.`,
    confirmLabel: 'Restart',
    variant: 'primary',
  },
  stop: {
    title: 'Stop container',
    message: (name) => `Stop "${name}"? The container will be halted.`,
    confirmLabel: 'Stop',
    variant: 'primary',
  },
  remove: {
    title: 'Remove container',
    message: (name) => `Permanently remove "${name}"? This cannot be undone.`,
    confirmLabel: 'Remove',
    variant: 'danger',
  },
};

const STATIC_COLUMNS: Column<ContainerRow>[] = [
  {
    key: 'name',
    label: 'Container',
    width: '24%',
    render: (_v, row) => (
      <div>
        <div className="cell-name">{row.name}</div>
        <div className="cell-sub">{row.id.slice(0, 12)}</div>
      </div>
    ),
  },
  {
    key: 'image',
    label: 'Image',
    width: '26%',
    render: (_v, row) => (
      <div className="cell-mono">
        {row.image}
        <span style={{ color: 'rgb(var(--accent-primary-deep))' }}>:{row.tag}</span>
      </div>
    ),
  },
  {
    key: 'state',
    label: 'State',
    width: '11%',
    render: (v) => {
      const state = String(v);
      return <Chip variant={CSTATE_COLOR[state] ?? 'neutral'}>{state}</Chip>;
    },
  },
  {
    key: 'health',
    label: 'Health',
    width: '11%',
    render: (v) => {
      const health = String(v);
      return <Chip variant={HEALTH_COLOR[health] ?? 'neutral'}>{health}</Chip>;
    },
  },
  {
    key: 'ports',
    label: 'Ports',
    width: '16%',
    render: (v) => {
      const ports = v as string[];
      return ports.length > 0
        ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {ports.map((p, i) => (
              <span key={i} className="port-pill">{p.split('/')[0]}</span>
            ))}
          </div>
        )
        : <span className="cell-mono" style={{ color: 'rgb(var(--canvas-fg-4))' }}>—</span>;
    },
  },
  {
    key: 'cpu',
    label: 'CPU · MEM',
    width: '8%',
    render: (_v, row) => (
      <span className="cell-mono">
        {row.cpu}% · {row.mem ? (row.mem / 1024).toFixed(1) + 'g' : '0'}
      </span>
    ),
  },
];

export const HostContainersPanel: React.FC<HostContainersPanelProps> = ({ host, query }) => {
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const handleAction = useCallback((actionId: string, containerName: string) => {
    if (actionId === 'restart' || actionId === 'stop' || actionId === 'remove') {
      setPendingAction({ actionId, containerName });
    } else if (actionId === 'logs') {
      setToast({ title: 'Log streaming not yet available', subtitle: 'Connect the backend API to stream container logs.', variant: 'info' });
    }
  }, []);

  const columns = useMemo((): Column<ContainerRow>[] => [
    ...STATIC_COLUMNS,
    {
      key: 'id',
      label: '',
      width: '4%',
      render: (_v, row) => (
        <RowMenu
          actions={CTN_ACTIONS}
          onAction={(actionId) => handleAction(actionId, row.name)}
        />
      ),
    },
  ], [handleAction]);

  const containers = useMemo((): ContainerRow[] => {
    const list = query
      ? host.containers.filter(c =>
          c.name.toLowerCase().includes(query) || c.image.toLowerCase().includes(query)
        )
      : host.containers;
    return list.map(c => ({ ...c, _key: c.id }));
  }, [host, query]);

  if (containers.length === 0 && query) return null;

  const running = host.containers.filter(c => c.state === 'running').length;
  const confirm = pendingAction ? CONFIRM_CONFIG[pendingAction.actionId] : null;

  return (
    <>
      <Panel
        className="panel-flush"
        title={host.id}
        subtitle={`${host.engine} · ${host.compose} · ${running}/${host.containers.length} running`}
      >
        <Table columns={columns} data={containers} rowKey="_key" />
      </Panel>
      {confirm && pendingAction && (
        <ConfirmDialog
          isOpen
          onClose={() => setPendingAction(null)}
          onConfirm={() => {
            setPendingAction(null);
            setToast({ title: 'Backend not connected', subtitle: 'Container actions require the backend API to be running.', variant: 'warning' });
          }}
          title={confirm.title}
          message={confirm.message(pendingAction.containerName)}
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
