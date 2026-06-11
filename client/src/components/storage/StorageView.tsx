import React, { useMemo, useState } from 'react';
import type { Volume } from '@homelab/shared';
import {
  PageHeader, StatGrid, StatTile, Panel, QuickAccessGrid, Table, Chip, Button, Toast,
} from '@tinkermonkey/heimdall-ui';
import type { Column, QuickAccessGridItem, ToastVariant } from '@tinkermonkey/heimdall-ui';
import { useDocker } from '../../hooks/useAPI';
import { Icon } from '@tinkermonkey/heimdall-ui';
import { ErrorView } from '../shared/ErrorView';
import { asEyebrow } from '../../utils/pageHeader';
import { DegradationBanner } from '../shared/DegradationBanner';

interface VolumeRow extends Volume {
  host: string;
  _key: string;
}

const STORAGE_POOLS: QuickAccessGridItem[] = [
  { id: 'tank', icon: 'data', title: 'tank · ZRAID2', description: '8×16 TB · 52.1/90 TB used' },
  { id: 'fast', icon: 'trending-up', title: 'fast · NVMe mirror', description: '2×2 TB · 1.2/2 TB used' },
  { id: 'backup', icon: 'lock', title: 'backup · restic', description: 'offsite B2 · last 04:00' },
  { id: 'cache', icon: 'layout', title: 'l2arc cache', description: '480 GB · 78% hit rate' },
];

const COLUMNS: Column<VolumeRow>[] = [
  {
    key: 'name',
    label: 'Volume',
    width: '24%',
    render: (v) => <span className="cell-name" style={{ fontSize: 12.5 }}>{String(v)}</span>,
  },
  {
    key: 'host',
    label: 'Host',
    width: '12%',
    render: (v) => <span className="cell-mono">{String(v)}</span>,
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
    width: '24%',
    render: (v) => (
      <div className="row row--wrap" style={{ gap: 4 }}>
        {(v as string[]).map((u, i) => <span key={i} className="tag-pill">{u}</span>)}
      </div>
    ),
  },
  {
    key: 'mount',
    label: 'Mountpoint',
    width: '28%',
    render: (v) => <span className="cell-mono muted">{String(v)}</span>,
  },
];

interface ToastState {
  title: string;
  subtitle?: string;
  variant: ToastVariant;
}

export const StorageView: React.FC = () => {
  const { data, isLoading, error } = useDocker();
  const [toast, setToast] = useState<ToastState | null>(null);

  const volumes = useMemo((): VolumeRow[] => {
    if (!data) return [];
    const rows: VolumeRow[] = [];
    data.hosts.forEach(h =>
      h.volumes.forEach(v => rows.push({ ...v, host: h.id, _key: `${h.id}-${v.name}` }))
    );
    return rows;
  }, [data]);

  if (isLoading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (error || !data) return (
    <ErrorView
      title="Failed to Load Storage Data"
      message={error instanceof Error ? error.message : 'Could not fetch Docker data. Please try again in a moment.'}
    />
  );

  return (
    <>
      <PageHeader
        eyebrow={asEyebrow(
          <span className="eyebrow-row">
            <Chip variant="emerald">storage · helios</Chip>
            <span className="mono-meta">TrueNAS Core · ZFS</span>
          </span>
        )}
        idChip="/cluster/asgard/storage"
        title="Storage"
        subtitle="Pools, datasets and Docker volumes across the cluster."
        actions={
          <Button variant="secondary" size="sm">
            <Icon name="download" size={13} />
            Snapshot now
          </Button>
        }
      />
      <DegradationBanner degraded={data?.degraded} />
      <StatGrid columns={4}>
        <StatTile color="emerald" label="Capacity used" value="53.3 TB" meta="of 92 TB" metaIcon="pie-chart" />
        <StatTile color="cyan" label="Volumes" value={volumes.length} meta="docker · local" metaIcon="copy" />
        <StatTile color="violet" label="Snapshots" value="1,284" meta="retain 30d" metaIcon="copy" />
        <StatTile color="amber" label="Last backup" value="04:00" meta="restic → B2" metaIcon="lock" />
      </StatGrid>
      <Panel title="Pools & jobs" subtitle="ZFS pools and backup targets">
        <QuickAccessGrid
          columns={4}
          tiles={STORAGE_POOLS}
          onAction={() => setToast({ title: 'Pool management not yet available', subtitle: 'Storage pool details will be available once the backend is connected.', variant: 'info' })}
        />
      </Panel>
      <Panel className="panel-flush" title="Docker volumes" subtitle={`${volumes.length} volumes`}>
        <Table columns={COLUMNS} data={volumes} rowKey="_key" />
      </Panel>
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
