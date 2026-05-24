import React, { useState } from 'react';
import { PieChart, Table, type Column } from '@tinkermonkey/heimdall-ui';
import type { NETWORK_DATA, NetworkClient } from '@homelab/shared';

interface ClientBreakdownPanelProps {
  clients: NETWORK_DATA['clients'];
}

interface TableRow {
  hostname: string;
  ip: string;
  type: 'Wired' | 'Wireless';
  signal: string;
  bytes: number;
  bytesLabel: string;
  uptimeLabel: string;
}

function formatBytes(b: number): string {
  if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GB`;
  if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
  if (b >= 1e3) return `${(b / 1e3).toFixed(0)} KB`;
  return `${b} B`;
}

function formatUptime(s: number): string {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function toTableRows(clients: NetworkClient[]): TableRow[] {
  return clients.map(c => ({
    hostname: c.hostname || c.ip,
    ip: c.ip,
    type: c.isWired ? 'Wired' : 'Wireless',
    signal: c.signalDbm != null ? `${c.signalDbm} dBm` : '—',
    bytes: c.bytesTx + c.bytesRx,
    bytesLabel: formatBytes(c.bytesTx + c.bytesRx),
    uptimeLabel: formatUptime(c.uptimeS),
  }));
}

const COLUMNS: Column<TableRow>[] = [
  { key: 'hostname', label: 'Host', sortable: true, width: '130px' },
  { key: 'ip', label: 'IP', width: '110px', render: (v) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{String(v)}</span> },
  { key: 'type', label: 'Type', width: '72px', render: (v) => (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '9px',
      fontWeight: 600,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: v === 'Wired' ? 'rgb(var(--accent-cyan))' : 'rgb(var(--accent-violet))',
    }}>{String(v)}</span>
  )},
  { key: 'signal', label: 'Signal', width: '76px', render: (v) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{String(v)}</span> },
  { key: 'bytesLabel', label: 'Data', sortable: true, width: '80px', render: (v) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{String(v)}</span> },
  { key: 'uptimeLabel', label: 'Up', width: '62px', render: (v) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{String(v)}</span> },
];

export const ClientBreakdownPanel: React.FC<ClientBreakdownPanelProps> = ({ clients }) => {
  const [sortKey, setSortKey] = useState<'hostname' | 'bytesLabel'>('hostname');
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>('asc');

  const segments = [
    { name: 'Wired', value: clients.wired, color: 'rgb(var(--accent-cyan))' },
    { name: 'Wireless', value: clients.wireless, color: 'rgb(var(--accent-violet))' },
  ].filter(s => s.value > 0);

  const allClients = [...clients.topTalkers].sort((a, b) => {
    if (sortKey === 'bytesLabel') {
      const diff = (b.bytesTx + b.bytesRx) - (a.bytesTx + a.bytesRx);
      return sortDir === 'desc' ? diff : -diff;
    }
    const diff = a.hostname.localeCompare(b.hostname);
    return sortDir === 'desc' ? -diff : diff;
  });

  const rows = toTableRows(allClients);

  const handleSort = (key: string, dir: 'asc' | 'desc' | null) => {
    setSortKey(key as 'hostname' | 'bytesLabel');
    setSortDir(dir);
  };

  return (
    <>
      <div className="client-breakdown__summary">
        <div className="client-breakdown__chart-wrap">
          <PieChart segments={segments} width={120} height={120} legend={false} />
        </div>
        <div className="client-breakdown__kv">
          <div className="client-kv-row">
            <span className="client-kv-row__label">Total</span>
            <span className="client-kv-row__value">{clients.total}</span>
          </div>
          <div className="client-kv-row">
            <span className="client-kv-row__label">Wired</span>
            <span className="client-kv-row__value" style={{ color: 'rgb(var(--accent-cyan))' }}>{clients.wired}</span>
          </div>
          <div className="client-kv-row">
            <span className="client-kv-row__label">Wireless</span>
            <span className="client-kv-row__value" style={{ color: 'rgb(var(--accent-violet))' }}>{clients.wireless}</span>
          </div>
        </div>
      </div>

      {rows.length > 0 ? (
        <Table
          columns={COLUMNS}
          data={rows}
          rowKey="hostname"
          onSort={handleSort}
        />
      ) : (
        <div className="network-empty">No client data available</div>
      )}
    </>
  );
};
