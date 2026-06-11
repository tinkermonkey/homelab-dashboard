import React, { useState, useMemo } from 'react';
import type { App } from '@homelab/shared';
import { Panel, TabBar, Table, VersionPill, Chip } from '@tinkermonkey/heimdall-ui';
import type { Column } from '@tinkermonkey/heimdall-ui';

interface AppsPanelProps {
  apps: App[];
}

const APP_CATS = [
  { id: 'all', label: 'all' },
  { id: 'media', label: 'media' },
  { id: 'iot', label: 'iot' },
  { id: 'ai', label: 'ai' },
  { id: 'storage', label: 'storage' },
  { id: 'dev', label: 'dev' },
  { id: 'obs', label: 'observability' },
  { id: 'net', label: 'network' },
];

const STATE_COLOR: Record<App['state'], 'emerald' | 'amber' | 'rose' | 'cyan' | 'neutral'> = {
  running: 'emerald',
  degraded: 'amber',
  failed: 'rose',
  updating: 'cyan',
  stopped: 'neutral',
};

type AppRow = App & { _key: string };

const COLUMNS: Column<AppRow>[] = [
  {
    key: 'id',
    label: 'Service',
    width: '32%',
    render: (v, row) => (
      <div>
        <div className="cell-name">{row.id}</div>
        <div className="cell-sub">{row.meta}</div>
      </div>
    ),
  },
  {
    key: 'host',
    label: 'Host',
    width: '14%',
    render: (v) => <span className="cell-mono">{String(v)}</span>,
  },
  {
    key: 'cat',
    label: 'Category',
    width: '16%',
    render: (v) => <span className="tag-pill">{String(v)}</span>,
  },
  {
    key: 'version',
    label: 'Version',
    width: '18%',
    render: (v) => <VersionPill>{String(v)}</VersionPill>,
  },
  {
    key: 'state',
    label: 'State',
    width: '20%',
    render: (v) => {
      const state = v as App['state'];
      return <Chip variant={STATE_COLOR[state] ?? 'neutral'}>{state}</Chip>;
    },
  },
];

export const AppsPanel: React.FC<AppsPanelProps> = ({ apps }) => {
  const [cat, setCat] = useState<string>('all');

  const tabs = useMemo(() =>
    APP_CATS.map(c => ({
      id: c.id,
      label: c.label,
      count: c.id === 'all' ? apps.length : apps.filter(a => a.cat === c.id).length,
    })),
    [apps],
  );

  const filtered = useMemo((): AppRow[] => {
    const list = cat === 'all' ? apps : apps.filter(a => a.cat === cat);
    return list.map(a => ({ ...a, _key: a.id }));
  }, [apps, cat]);

  const running = apps.filter(a => a.state === 'running').length;

  return (
    <Panel className="panel-flush">
      {/* Header rendered inside flush body */}
      <div className="panel__header">
        <div>
          <div className="panel__title">Applications</div>
          <div className="panel__subtitle">{apps.length} services · {running} running</div>
        </div>
      </div>
      <div style={{ padding: '8px 14px 0' }}>
        <TabBar tabs={tabs} activeTabId={cat} onSelectTab={setCat} />
      </div>
      <Table columns={COLUMNS} data={filtered} rowKey="_key" />
    </Panel>
  );
};
