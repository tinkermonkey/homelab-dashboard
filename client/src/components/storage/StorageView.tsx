import React, { useMemo } from 'react';
import type { Volume, StorageFilesystem } from '@homelab/shared';
import {
  PageHeader, StatGrid, StatTile, Panel, QuickAccessGrid, Table, Chip, AlertStrip,
} from '@tinkermonkey/heimdall-ui';
import type { Column, QuickAccessGridItem } from '@tinkermonkey/heimdall-ui';
import { useDocker, useStorage, useCluster } from '../../hooks/useAPI';
import { ErrorView } from '../shared/ErrorView';
import { asEyebrow } from '../../utils/pageHeader';

interface VolumeRow extends Volume {
  host: string;
  _key: string;
}

/** Format a byte count to a human-readable GB/TB string with one decimal. */
function bytesToHuman(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 GB';
  const GB = 1024 ** 3;
  const TB = 1024 ** 4;
  if (bytes >= TB) return `${(bytes / TB).toFixed(1)} TB`;
  return `${(bytes / GB).toFixed(1)} GB`;
}

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

export const StorageView: React.FC = () => {
  const { data, isLoading, error } = useDocker();
  const { data: storage } = useStorage();
  const clusterName = useCluster().data?.cluster?.name;

  const volumes = useMemo((): VolumeRow[] => {
    if (!data) return [];
    const rows: VolumeRow[] = [];
    data.hosts.forEach(h =>
      h.volumes.forEach(v => rows.push({ ...v, host: h.id, _key: `${h.id}-${v.name}` }))
    );
    return rows;
  }, [data]);

  const filesystems = useMemo<StorageFilesystem[]>(
    () => storage?.filesystems ?? [],
    [storage]
  );

  const aggregates = useMemo(() => {
    const usedBytes = filesystems.reduce((sum, fs) => sum + (fs.usedBytes || 0), 0);
    const totalBytes = filesystems.reduce((sum, fs) => sum + (fs.totalBytes || 0), 0);
    const freeBytes = filesystems.reduce((sum, fs) => sum + (fs.freeBytes || 0), 0);
    const hosts = new Set(filesystems.map(fs => fs.host)).size;
    const avgUsedPct = filesystems.length
      ? Math.round(filesystems.reduce((sum, fs) => sum + (fs.usedPct || 0), 0) / filesystems.length)
      : 0;
    return { usedBytes, totalBytes, freeBytes, hosts, avgUsedPct };
  }, [filesystems]);

  const storageUnavailable = storage?.source === 'unavailable' || filesystems.length === 0;

  const fsTiles = useMemo<QuickAccessGridItem[]>(
    () => filesystems.map((fs) => ({
      id: `${fs.host}-${fs.mount}`,
      icon: 'data',
      title: `${fs.host} · ${fs.mount}`,
      description: `${bytesToHuman(fs.usedBytes)} / ${bytesToHuman(fs.totalBytes)} · ${Math.round(fs.usedPct)}% used`,
    })),
    [filesystems]
  );

  const idChip = `/cluster/${(clusterName ?? 'cluster').toLowerCase()}/storage`;

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
            <Chip variant="emerald">storage · {clusterName ?? 'cluster'}</Chip>
            <span className="mono-meta">Metricbeat · filesystem</span>
          </span>
        )}
        idChip={idChip}
        title="Storage"
        subtitle="Per-host filesystem capacity and Docker volumes across the cluster."
      />
      {data?.degraded && data.degraded.length > 0 && (
        <AlertStrip
          alerts={[{ id: 'degradation', severity: 'warn', message: `Partial Data: ${data.degraded.join(', ')} are temporarily unavailable. Showing cached data.` }]}
          style={{ marginBottom: '24px' }}
        />
      )}
      <StatGrid columns={4}>
        <StatTile color="emerald" label="Capacity used" value={bytesToHuman(aggregates.usedBytes)} meta={`of ${bytesToHuman(aggregates.totalBytes)}`} metaIcon="pie-chart" />
        <StatTile color="cyan" label="Free" value={bytesToHuman(aggregates.freeBytes)} meta={`${aggregates.avgUsedPct}% avg used`} metaIcon="bar-chart" />
        <StatTile color="violet" label="Filesystems" value={filesystems.length} meta={`${aggregates.hosts} hosts`} metaIcon="data" />
        <StatTile color="amber" label="Volumes" value={volumes.length} meta="docker · local" metaIcon="copy" />
      </StatGrid>
      <Panel title="Filesystems" subtitle="Per-host root filesystem capacity">
        {storageUnavailable ? (
          <span className="cell-mono muted">No filesystem metrics reported yet.</span>
        ) : (
          <QuickAccessGrid columns={4} tiles={fsTiles} />
        )}
      </Panel>
      <Panel className="panel-flush" title="Docker volumes" subtitle={`${volumes.length} volumes`}>
        {volumes.length === 0 ? (
          <span className="cell-mono muted">No container volumes reported yet.</span>
        ) : (
          <Table columns={COLUMNS} data={volumes} rowKey="_key" />
        )}
      </Panel>
    </>
  );
};
