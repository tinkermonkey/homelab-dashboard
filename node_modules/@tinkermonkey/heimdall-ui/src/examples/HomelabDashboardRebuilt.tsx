import { useState } from 'react'
import {
  Button,
  Chip,
  Icon,
  StatTile,
  ShellLayout,
} from '../index'

export default function HomelabDashboardRebuilt() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const sidebarSections = [
    {
      title: 'Monitoring',
      items: [
        { id: 'overview', label: 'Overview', icon: 'dashboard' as const },
        { id: 'servers', label: 'Servers', icon: 'data' as const, count: 4 },
        { id: 'network', label: 'Network', icon: 'link' as const },
        { id: 'applications', label: 'Applications', icon: 'component' as const, count: 24 },
        { id: 'alerts', label: 'Alerts', icon: 'alert' as const, count: 2 },
      ],
    },
  ]

  return (
    <ShellLayout
      appTitle={{ title: 'Homelab', version: 'v1.0.0' }}
      topbar={{
        breadcrumbs: [
          { label: 'Cluster · asgard' },
          { label: 'Overview' },
        ],
        searchPlaceholder: 'Search services...',
      }}
      sidebar={{
        collapsed: sidebarCollapsed,
        onCollapse: setSidebarCollapsed,
        sections: sidebarSections,
        activeItemId: 'overview',
      }}
      statusbar={{
        left: <span>Homelab Infrastructure</span>,
        right: <span>UI · Design System</span>,
      }}
    >
      <div className="px-6 py-5 max-w-6xl">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="m-0 text-2xl font-bold text-canvas-fg-1 mb-2">
            Overview
          </h1>
          <span className="text-sm text-canvas-fg-2">
            /cluster/asgard
          </span>
          <p className="m-0 mt-3 text-sm text-canvas-fg-2">
            Monitor distributed compute, storage, and network infrastructure.
          </p>
        </div>

        {/* Alerts Strip */}
        <div className="mb-6 p-2.5 rounded border border-rose-200 bg-rose-50 flex items-center gap-3">
          <Icon name="alert" size={13} className="text-rose-600 flex-shrink-0" />
          <div className="flex items-center gap-2 text-sm flex-1 overflow-x-auto">
            <span className="text-rose-700">
              <span className="inline-block px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded">WARN</span>
              <span className="ml-1">MEM 81% on aether · 12m</span>
            </span>
            <span className="text-canvas-fg-3">·</span>
            <span className="text-rose-700">
              <span className="inline-block px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded">WARN</span>
              <span className="ml-1">forgejo-act runner offline · 2h</span>
            </span>
          </div>
          <button className="ml-auto text-rose-700 text-sm font-medium hover:opacity-80 whitespace-nowrap">
            Open in watch-bot →
          </button>
        </div>

        {/* Stat Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatTile label="Power draw" value="847 W" color="cyan" delta={{ value: 58, label: 'vs 7d avg', direction: 'up' }} />
          <StatTile
            label="Active alerts"
            value="2"
            color="amber"
          />
          <StatTile
            label="Egress today"
            value="12.4 GB"
            color="violet"
            delta={{ value: 8, label: 'vs 7d', direction: 'down' }}
          />
          <StatTile
            label="Cluster uptime"
            value="217 days"
            color="emerald"
          />
        </div>

        {/* Servers Section */}
        <div className="mb-8">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-canvas-fg-1 mb-1">
                  Servers
                </h2>
                <span className="text-xs text-canvas-fg-3">
                  /cluster/asgard · 4 hosts
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block"></span>
                <span className="text-canvas-fg-2">ALL UP · LAST POLL 14s AGO</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Server Card */}
            <div className="border border-canvas-border rounded-lg overflow-hidden bg-canvas-bg">
              <div className="px-3.5 py-3 bg-shell-surface border-b border-canvas-border flex items-center gap-3">
                <div className="w-7 h-7 rounded bg-cyan-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                  NYX
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-canvas-fg-1">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    nyx-a
                  </div>
                  <div className="text-xs text-canvas-fg-3 font-mono">
                    nyx-a.local · 192.168.1.41
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-canvas-fg-3 font-mono uppercase tracking-widest">Uptime</div>
                  <div className="text-sm font-bold text-canvas-fg-1">217d</div>
                </div>
              </div>

              <div className="px-3.5 py-3 space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs items-center">
                  <div className="col-span-2 font-mono uppercase text-canvas-fg-3 text-xs font-bold">CPU</div>
                  <div className="col-span-6 h-1 bg-canvas-bd rounded overflow-hidden">
                    <div className="h-full bg-cyan-500" style={{ width: '42%' }}></div>
                  </div>
                  <div className="col-span-4 text-right font-mono font-semibold text-canvas-fg-1">42%</div>
                </div>
                <div className="grid grid-cols-12 gap-2 text-xs items-center">
                  <div className="col-span-2 font-mono uppercase text-canvas-fg-3 text-xs font-bold">MEM</div>
                  <div className="col-span-6 h-1 bg-canvas-bd rounded overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: '78%' }}></div>
                  </div>
                  <div className="col-span-4 text-right font-mono font-semibold text-canvas-fg-1">32/40 GB</div>
                </div>
                <div className="grid grid-cols-12 gap-2 text-xs items-center">
                  <div className="col-span-2 font-mono uppercase text-canvas-fg-3 text-xs font-bold">DISK</div>
                  <div className="col-span-6 h-1 bg-canvas-bd rounded overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: '65%' }}></div>
                  </div>
                  <div className="col-span-4 text-right font-mono font-semibold text-canvas-fg-1">1.8/2.7 TB</div>
                </div>
              </div>

              <div className="px-3.5 py-3 border-t border-canvas-border grid grid-cols-4 gap-3 bg-canvas-bg text-xs">
                <div>
                  <div className="font-mono uppercase text-canvas-fg-3 text-xs font-bold mb-1">Model</div>
                  <div className="font-semibold text-canvas-fg-1">Ryzen 9 5950X</div>
                </div>
                <div>
                  <div className="font-mono uppercase text-canvas-fg-3 text-xs font-bold mb-1">Temp</div>
                  <div className="font-semibold text-canvas-fg-1">52°C</div>
                </div>
                <div>
                  <div className="font-mono uppercase text-canvas-fg-3 text-xs font-bold mb-1">Load</div>
                  <div className="font-mono text-canvas-fg-1 text-xs">2.14 2.08 1.96</div>
                </div>
                <div>
                  <div className="font-mono uppercase text-canvas-fg-3 text-xs font-bold mb-1">Containers</div>
                  <div className="font-semibold text-canvas-fg-1">14</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Applications Section */}
        <div className="mb-8">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-canvas-fg-1 mb-1">
                  Applications
                </h2>
                <span className="text-xs text-canvas-fg-3">
                  /services · 24 deployed
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-canvas-fg-2">
                <span>
                  <span className="text-emerald-500">●</span> 22 RUNNING
                </span>
                <span>
                  <span className="text-amber-500">●</span> 1 DEGRADED
                </span>
                <span>
                  <span className="text-rose-500">●</span> 1 FAILED
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* App Cell */}
            <div className="p-3 bg-canvas-bg border border-canvas-border rounded-md flex items-center gap-2.5">
              <div className="w-10 h-10 rounded bg-cyan-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                PG
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-sm font-bold text-canvas-fg-1 truncate">
                  postgres
                </div>
                <div className="text-xs text-canvas-fg-3 font-mono truncate">
                  15.2 · nyx-a · primary
                </div>
              </div>
              <div className="text-right flex-shrink-0 text-xs">
                <div className="flex items-center gap-1 text-emerald-600 font-bold">
                  <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span>
                  running
                </div>
              </div>
            </div>

            <div className="p-3 bg-canvas-bg border border-canvas-border rounded-md flex items-center gap-2.5">
              <div className="w-10 h-10 rounded bg-emerald-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                AR
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-sm font-bold text-canvas-fg-1 truncate">
                  archivebox
                </div>
                <div className="text-xs text-canvas-fg-3 font-mono truncate">
                  0.7.1 · helios-a
                </div>
              </div>
              <div className="text-right flex-shrink-0 text-xs">
                <div className="flex items-center gap-1 text-emerald-600 font-bold">
                  <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span>
                  running
                </div>
              </div>
            </div>

            <div className="p-3 bg-canvas-bg border border-canvas-border rounded-md flex items-center gap-2.5">
              <div className="w-10 h-10 rounded bg-amber-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                CF
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-sm font-bold text-canvas-fg-1 truncate">
                  comfyui
                </div>
                <div className="text-xs text-canvas-fg-3 font-mono truncate">
                  0.1.2 · vega-b
                </div>
              </div>
              <div className="text-right flex-shrink-0 text-xs">
                <div className="flex items-center gap-1 text-amber-500 font-bold">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                  degraded
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Network Gateway Section */}
        <div className="mb-8">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-canvas-fg-1 mb-1">
                  Network gateway
                </h2>
                <span className="text-xs text-canvas-fg-3">
                  /gateway/wan0 · Starry
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block"></span>
                <span className="text-canvas-fg-2">ONLINE · 7 days 14h</span>
              </div>
            </div>
          </div>

          <div className="border border-canvas-border rounded-lg overflow-hidden bg-canvas-bg">
            <div className="px-4 py-3 bg-shell-surface border-b border-canvas-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-canvas-fg-1">
                <Icon name="link" size={14} />
                Internet connection
                <span className="text-xs text-canvas-fg-3 font-mono">wan0</span>
              </div>
              <div className="flex items-center gap-2">
                <Chip variant="emerald">
                  <span className="inline-block w-1.5 h-1.5 bg-emerald-600 rounded-full mr-1"></span>
                  healthy
                </Chip>
                <Button variant="ghost" size="sm">
                  <Icon name="arrowRight" size={12} /> Run speedtest
                </Button>
              </div>
            </div>

            <div className="px-4 py-4 grid grid-cols-2 gap-8">
              {/* Gateway Info */}
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-bold text-canvas-fg-1 mb-3 flex items-center gap-2">
                    <Icon name="link" size={11} />
                    Connection
                    <span className="text-xs bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded font-bold ml-auto">
                      1GbE
                    </span>
                  </div>
                  <dl className="space-y-2 text-xs">
                    <div>
                      <dt className="font-mono uppercase text-canvas-fg-3 text-xs font-bold">ISP</dt>
                      <dd className="text-canvas-fg-1 font-mono">Starry</dd>
                    </div>
                    <div>
                      <dt className="font-mono uppercase text-canvas-fg-3 text-xs font-bold">Public IP</dt>
                      <dd className="text-canvas-fg-1 font-mono">203.0.113.42</dd>
                    </div>
                    <div>
                      <dt className="font-mono uppercase text-canvas-fg-3 text-xs font-bold">Ping</dt>
                      <dd className="text-canvas-fg-1 font-mono">12 ms · jitter 2 ms</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-mono uppercase text-canvas-fg-3 text-xs font-bold mb-2">Ingress · today</div>
                  <div className="text-2xl font-bold text-canvas-fg-1">
                    42.3
                    <span className="text-sm text-canvas-fg-3 ml-1">GB</span>
                  </div>
                </div>
                <div>
                  <div className="font-mono uppercase text-canvas-fg-3 text-xs font-bold mb-2">Egress · today</div>
                  <div className="text-2xl font-bold text-canvas-fg-1">
                    18.7
                    <span className="text-sm text-canvas-fg-3 ml-1">GB</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ShellLayout>
  )
}
