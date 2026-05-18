import { useState } from 'react'
import { Table, Column } from '../components/Table'
import { StatGrid } from '../components/StatGrid'
import { StatTile } from '../components/StatTile'

interface TableRow {
  id: string
  name: string
  class: string
  status: string
  updated: string
}

export default function DataDisplayTestPage() {
  const [selectedRows, setSelectedRows] = useState<(string | number)[]>([])
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const tableData: TableRow[] = [
    { id: 'cls_4f3a', name: 'organism', class: 'life', status: 'active', updated: '2m ago' },
    { id: 'cls_8b21', name: 'station', class: 'climate', status: 'syncing', updated: '12m ago' },
    { id: 'cls_e007', name: 'service', class: 'software', status: 'error', updated: '1h ago' },
    { id: 'cls_f234', name: 'network', class: 'infrastructure', status: 'ok', updated: '5m ago' },
    { id: 'cls_g567', name: 'database', class: 'data', status: 'degraded', updated: '3m ago' },
  ]

  const tableColumns: Column<TableRow>[] = [
    {
      key: 'id',
      label: 'ID',
      width: '120px',
      sortable: true,
      render: (value: string) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{value}</span>,
    },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'class', label: 'Class', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    {
      key: 'updated',
      label: 'Updated',
      sortable: true,
      render: (value: string) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{value}</span>,
    },
  ]

  const handleSort = (key: string, direction: 'asc' | 'desc' | null) => {
    setSortKey(key)
    if (direction !== null) {
      setSortDirection(direction)
    }
  }

  return (
    <div style={{ padding: '22px 28px', backgroundColor: 'rgb(var(--canvas-bg))', minHeight: '100vh' }}>
      <section style={{ marginBottom: '32px' }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'rgb(var(--canvas-fg-3))',
            marginBottom: '14px',
          }}
        >
          Table Component · Interactive Behavior
        </div>
        <div style={{ overflowX: 'auto' }}>
          <Table<TableRow>
            columns={tableColumns}
            data={tableData}
            rowKey="id"
            selectable={true}
            selectedRows={selectedRows}
            onSelectRows={setSelectedRows}
            onSort={handleSort}
          />
        </div>
        <div style={{ marginTop: '14px', fontSize: '12px', color: 'rgb(var(--canvas-fg-2))' }}>
          Selected rows: {selectedRows.length > 0 ? selectedRows.join(', ') : 'none'}
        </div>
        {sortKey && (
          <div style={{ marginTop: '8px', fontSize: '12px', color: 'rgb(var(--canvas-fg-2))' }}>
            Sorted by: {sortKey} ({sortDirection})
          </div>
        )}
      </section>

      <section style={{ marginBottom: '32px' }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'rgb(var(--canvas-fg-3))',
            marginBottom: '14px',
          }}
        >
          StatGrid & StatTile Components
        </div>
        <StatGrid>
          <StatTile label="Uptime" value="99.9%" color="cyan" />
          <StatTile label="Requests/sec" value="12,453" color="cyan" />
          <StatTile label="Errors" value="23" color="amber" />
          <StatTile label="Latency" value="145ms" color="violet" />
        </StatGrid>
      </section>

      <section style={{ marginBottom: '32px' }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'rgb(var(--canvas-fg-3))',
            marginBottom: '14px',
          }}
        >
          StatTile · All Variants
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
          <StatTile label="OK Status" value="100%" color="emerald" />
          <StatTile label="Warning" value="50%" color="amber" />
          <StatTile label="Error" value="3" color="cyan" />
          <StatTile label="Neutral" value="—" color="violet" />
        </div>
      </section>
    </div>
  )
}
