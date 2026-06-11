import React, { useMemo, useState } from 'react';
import { PageHeader, Panel, Chip, Select } from '@tinkermonkey/heimdall-ui';
import type { StatusColor } from '@tinkermonkey/heimdall-ui';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  op: string;
  target: string;
  message: string;
}

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

const LEVEL_COLOR: Record<LogLevel, StatusColor> = {
  INFO:  'cyan',
  WARN:  'amber',
  ERROR: 'rose',
  DEBUG: 'neutral',
};

function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

interface LogStreamProps {
  entries: LogEntry[];
}

const LogStream: React.FC<LogStreamProps> = ({ entries }) => (
  <div style={{ overflowY: 'auto', maxHeight: 460, fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
    {entries.map(e => (
      <div
        key={e.id}
        className="row"
        style={{
          gap: 12,
          padding: '5px 14px',
          borderBottom: '1px solid rgb(var(--canvas-border))',
          alignItems: 'baseline',
        }}
      >
        <span style={{ color: 'rgb(var(--canvas-fg-3))', flexShrink: 0, width: 80 }}>
          {formatTime(e.timestamp)}
        </span>
        <span style={{ flexShrink: 0, width: 48 }}>
          <Chip variant={LEVEL_COLOR[e.level]}>
            {e.level}
          </Chip>
        </span>
        <span style={{ color: 'rgb(var(--canvas-fg-2))', flexShrink: 0, width: 80 }}>
          {e.op}
        </span>
        <span style={{ color: 'rgb(var(--canvas-fg-3))', flexShrink: 0, width: 56 }}>
          {e.target}
        </span>
        <span style={{ color: 'rgb(var(--canvas-fg-1))', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {e.message}
        </span>
      </div>
    ))}
  </div>
);

export const LogsView: React.FC = () => {
  const [level, setLevel] = useState('');
  const all = useMemo(() => synthLogs(), []);
  const entries = level ? all.filter(e => e.level === level) : all;

  return (
    <>
      <PageHeader
        eyebrow={
          (<span className="eyebrow-row">
            <Chip variant="cyan">logs · loki</Chip>
            <span className="mono-meta">ingest 412 lps · retain 30d</span>
          </span>) as unknown as string
        }
        idChip="/cluster/asgard/logs"
        title="Logs"
        subtitle="Unified operational log stream across hosts and agents."
        actions={
          <div style={{ width: 180 }}>
            <Select
              value={level}
              onChange={e => setLevel((e.target as HTMLSelectElement).value)}
              aria-label="Level filter"
            >
              <option value="">All levels</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
              <option value="DEBUG">DEBUG</option>
            </Select>
          </div>
        }
      />
      <Panel title="Live stream" subtitle={`${entries.length} lines`} className="panel-flush">
        <LogStream entries={entries} />
      </Panel>
    </>
  );
};
