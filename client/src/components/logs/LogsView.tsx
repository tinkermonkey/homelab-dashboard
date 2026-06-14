import React, { useMemo, useState } from 'react';
import { PageHeader, Panel, Chip, Select, AlertStrip, LogStream } from '@tinkermonkey/heimdall-ui';
import type { LogEntry } from '@tinkermonkey/heimdall-ui';
import { asEyebrow } from '../../utils/pageHeader';
import { useLogs, useCluster } from '../../hooks/useAPI';

export const LogsView: React.FC = () => {
  const [level, setLevel] = useState('');
  const { data, isLoading } = useLogs();
  const clusterName = useCluster().data?.cluster?.name;

  const all = useMemo<LogEntry[]>(
    () => (data?.entries ?? []).map(e => ({ ...e, timestamp: new Date(e.timestamp) })),
    [data]
  );
  const entries = level ? all.filter(e => e.level === level) : all;

  const idChip = `/cluster/${(clusterName ?? 'cluster').toLowerCase()}/logs`;
  const unavailable = data?.source === 'unavailable' || all.length === 0;

  return (
    <>
      <PageHeader
        eyebrow={asEyebrow(
          <span className="eyebrow-row">
            <Chip variant="cyan">logs · signoz</Chip>
            <span className="mono-meta">{all.length} entries · retain 30d</span>
          </span>
        )}
        idChip={idChip}
        title="Logs"
        subtitle="Unified operational log stream across hosts and agents."
        actions={
          <div style={{ width: 180 }}>
            <Select
              value={level}
              onChange={value => setLevel(value)}
              ariaLabel="Level filter"
            >
              <Select.Item value="">All levels</Select.Item>
              <Select.Item value="INFO">INFO</Select.Item>
              <Select.Item value="WARN">WARN</Select.Item>
              <Select.Item value="ERROR">ERROR</Select.Item>
              <Select.Item value="DEBUG">DEBUG</Select.Item>
            </Select>
          </div>
        }
      />
      {isLoading ? (
        <Panel title="Live stream" className="panel-flush">
          Loading…
        </Panel>
      ) : unavailable ? (
        <AlertStrip
          alerts={[{ id: 'logs-unavailable', severity: 'warn', message: 'Log service unavailable — no entries to display.' }]}
          style={{ marginBottom: '24px' }}
        />
      ) : (
        <Panel title="Live stream" subtitle={`${entries.length} lines`} className="panel-flush">
          <LogStream entries={entries} showOps follow={false} maxRows={60} />
        </Panel>
      )}
    </>
  );
};
