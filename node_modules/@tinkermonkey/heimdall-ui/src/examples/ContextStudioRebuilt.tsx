import { useState } from 'react'
import {
  Button,
  Chip,
  Icon,
  StatTile,
  ShellLayout,
} from '../index'

export default function ContextStudioRebuilt() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const sidebarSections = [
    {
      title: 'Workspace',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' as const },
        { id: 'schema', label: 'Schema', icon: 'schema' as const, count: 128 },
        { id: 'individuals', label: 'Individuals', icon: 'data' as const, count: 12480 },
        { id: 'pipelines', label: 'Pipelines', icon: 'pipeline' as const, count: 17 },
        { id: 'reference', label: 'Reference', icon: 'link' as const },
        { id: 'settings', label: 'Settings', icon: 'settings' as const },
      ],
    },
  ]

  return (
    <ShellLayout
      appTitle={{ title: 'Context Studio', version: 'v0.4.1' }}
      topbar={{
        breadcrumbs: [
          { label: 'Workspace · default' },
          { label: 'Dashboard' },
        ],
        searchPlaceholder: 'Search entities...',
      }}
      sidebar={{
        collapsed: sidebarCollapsed,
        onCollapse: setSidebarCollapsed,
        sections: sidebarSections,
        activeItemId: 'dashboard',
      }}
      statusbar={{
        left: <span>Context Studio</span>,
        right: <span>UI · Design System</span>,
      }}
    >
      <div className="px-6 py-5 max-w-5xl">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Chip variant="cyan">workspace · default</Chip>
            <span className="text-xs text-canvas-fg-3">
              last sync 2 min ago
            </span>
          </div>
          <h1 className="m-0 text-2xl font-bold text-canvas-fg-1 mb-2">
            Dashboard
          </h1>
          <span className="text-sm text-canvas-fg-2">
            /workspace/default
          </span>
          <p className="m-0 mt-3 text-sm text-canvas-fg-2">
            Curate knowledge graphs for retrieval-augmented generation and agents.
          </p>
        </div>

        {/* Stat Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatTile label="Taxonomies" value="3" color="cyan" />
          <StatTile
            label="Classes"
            value="128"
            color="violet"
            delta={{ value: 4, label: 'this week', direction: 'up' }}
          />
          <StatTile
            label="Individuals"
            value="12,480"
            color="emerald"
            delta={{ value: 38, label: 'last run', direction: 'up' }}
          />
          <StatTile
            label="Pipelines"
            value="1/17"
            color="amber"
            delta={{ value: 1, label: 'running', direction: 'up' }}
          />
        </div>

        {/* Main Content Area */}
        <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: '1.55fr 1fr' }}>
          {/* Knowledge Graph Structure Panel */}
          <div className="border border-canvas-border rounded-lg overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-canvas-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Icon name="schema" size={14} />
                Knowledge Graph Structure
              </div>
              <Button variant="ghost" size="sm">
                Open
              </Button>
            </div>
            <div className="p-4 text-canvas-fg-2 text-sm">
              <div className="mb-3">
                <div className="text-xs font-semibold uppercase mb-1.5">
                  3 taxonomies · 128 classes
                </div>
                <p className="m-0 mb-3">Core structure with 128 domain classes organized across 3 taxonomies</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Chip variant="cyan">organism</Chip>
                <Chip variant="violet">climate</Chip>
                <Chip variant="emerald">software</Chip>
              </div>
            </div>
          </div>

          {/* Recent Activity Panel */}
          <div className="border border-canvas-border rounded-lg overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-canvas-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Icon name="clock" size={14} />
                Recent activity
              </div>
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </div>
            <div className="p-4 text-canvas-fg-2 text-sm">
              <div className="mb-3 pb-3 border-b border-canvas-border">
                <div className="text-xs font-semibold uppercase mb-1 text-canvas-fg-3">
                  UPDATE
                </div>
                <div>Updated <span className="font-medium">organism class</span> — Added 4 new properties</div>
                <div className="text-xs mt-1 text-canvas-fg-3">2m ago · by system</div>
              </div>
              <div className="mb-3 pb-3 border-b border-canvas-border">
                <div className="text-xs font-semibold uppercase mb-1 text-canvas-fg-3">
                  SYNC
                </div>
                <div>Synced <span className="font-medium">individuals dataset</span> — 38 new records</div>
                <div className="text-xs mt-1 text-canvas-fg-3">12m ago · by pipeline</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase mb-1 text-canvas-fg-3">
                  CREATE
                </div>
                <div>Created <span className="font-medium">climate taxonomy</span> — Initialized with 2 classes</div>
                <div className="text-xs mt-1 text-canvas-fg-3">1h ago · by user</div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Pipelines */}
        <div className="border border-canvas-border rounded-lg overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-canvas-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Icon name="pipeline" size={14} />
              Active pipelines
            </div>
            <Button variant="ghost" size="sm">
              All pipelines
            </Button>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4">
            {[
              { name: 'Ingestion Pipeline', status: 'running', progress: 75 },
              { name: 'Entity Linking', status: 'completed', progress: 100 },
            ].map((pipeline) => (
              <div key={pipeline.name} className="border border-canvas-border rounded-sm p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{pipeline.name}</span>
                  <Chip variant={pipeline.status === 'running' ? 'cyan' : 'emerald'}>
                    {pipeline.status}
                  </Chip>
                </div>
                <div className="w-full h-1 bg-canvas-border rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-status-cyan transition-all duration-300"
                    style={{ width: `${pipeline.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Access */}
        <div>
          <h3 className="m-0 mb-3 text-sm font-semibold">Quick access</h3>
          <p className="m-0 mb-3 text-xs text-canvas-fg-2">
            Jump to common workflows
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Taxonomies', description: 'Manage top-level domains', icon: 'schema' as const },
              { label: 'Classes', description: 'Define knowledge structure', icon: 'graph' as const },
              { label: 'Properties', description: 'Property definitions', icon: 'edit' as const },
              { label: 'Individuals', description: 'Browse populated instances', icon: 'data' as const },
              { label: 'Pipelines', description: 'Configure & run workflows', icon: 'pipeline' as const },
              { label: 'Reference', description: 'External data sources', icon: 'link' as const },
            ].map((item) => (
              <button
                key={item.label}
                className="px-3.5 py-3 border border-canvas-border rounded-sm bg-transparent cursor-pointer flex items-center gap-3 text-left transition-all duration-150 hover:bg-canvas-surface hover:border-canvas-border-strong"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-sm bg-canvas-surface flex-shrink-0">
                  <Icon name={item.icon} size={16} />
                </div>
                <div>
                  <div className="font-medium text-sm mb-0.5">
                    {item.label}
                  </div>
                  <div className="text-xs text-canvas-fg-3">
                    {item.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </ShellLayout>
  )
}
