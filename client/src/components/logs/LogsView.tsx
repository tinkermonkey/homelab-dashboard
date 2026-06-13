import React, { useMemo, useState } from 'react';
import { PageHeader, Panel, Chip, Select, AlertStrip, LogStream } from '@tinkermonkey/heimdall-ui';
import type { LogEntry } from '@tinkermonkey/heimdall-ui';
import { asEyebrow } from '../../utils/pageHeader';

type LogLevel = LogEntry['level'];

const LOG_OPS: [LogLevel, string, string, string][] = [
  ['INFO',  'ops-bot',   'nyx',    'docker compose up -d jellyfin → recreated 1 container'],
  ['INFO',  'watch-bot', 'aether', 'prometheus rule eval ok · 142 series'],
  ['WARN',  'watch-bot', 'aether', 'MEM 81% sustained 12m on aether — threshold 80%'],
  ['ERROR', 'sync-bot',  'helios', 'nextcloud healthcheck failed: redis connection refused'],
  ['INFO',  'sync-bot',  'helios', 'restic backup completed · 2.4 GB · 1m41s'],
  ['DEBUG', 'lab-bot',   'nyx',    'routed intent "disk usage" → watch-bot'],
  ['INFO',  'ops-bot',   'vega',   'pulling whisper.cpp:large-v3 · 64%'],
  ['INFO',  'traefik',   'aether', '200 GET grafana.lab.local 14ms'],
  ['WARN',  'pihole',    'aether', 'blocklist update: 3 lists stale > 7d'],
  ['INFO',  'ops-bot',   'vega',   'ollama loaded llama3.1:70b into 2× RTX 4090'],
];

function synthLogs(): LogEntry[] {
  const now = Date.now();
  return Array.from({ length: 40 }, (_, i) => {
    const [level, op, target, message] = LOG_OPS[i % LOG_OPS.length];
    return { id: `l${i}`, timestamp: new Date(now - (40 - i) * 37000), level, op, target, message };
  });
}

export const LogsView: React.FC = () => {
  const [level, setLevel] = useState('');
  const all = useMemo(() => synthLogs(), []);
  const entries = level ? all.filter(e => e.level === level) : all;

  return (
    <>
      <PageHeader
        eyebrow={asEyebrow(
          <span className="eyebrow-row">
            <Chip variant="cyan">logs · loki</Chip>
            <span className="mono-meta">ingest 412 lps · retain 30d</span>
          </span>
        )}
        idChip="/cluster/asgard/logs"
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
      <AlertStrip
        alerts={[{ id: 'sample-data', severity: 'warn', message: 'Sample Data: Log service unavailable. Showing fabricated sample entries — these do not reflect real cluster activity.' }]}
        style={{ marginBottom: '24px' }}
      />
      <Panel title="Live stream" subtitle={`${entries.length} lines`} className="panel-flush">
        <LogStream entries={entries} showOps follow={false} maxRows={60} />
      </Panel>
    </>
  );
};
