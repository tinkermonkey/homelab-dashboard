# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A monitoring & control dashboard for a 4-host homelab cluster (`asgard`: nyx, helios, aether, vega). It will be a frontend SPA backed by a lightweight server that proxies data from MCP servers in two sibling repos:

- `../phone-home` — FastAPI server; also exposes an MCP endpoint at `http://agent:3210/mcp/`
- `../homelab` — Ansible-managed homelab; the real infrastructure described by the dashboard

No production app exists yet. The `design/` directory contains the full design reference as runnable HTML/JSX prototypes.

## Design Reference

**Open `design/index.html` in a browser** to see the running design. It uses React 18 + Babel-standalone (single-file, no build step) — this is not the target stack, just a live prototype.

The design reference is the canonical source of truth for:
- Visual layout, colour tokens, typography, spacing, radius
- Data shapes for every entity (see `design/README.md` → "Data Shape" section)
- Interaction behaviour (persisted UI state, polling cadences, etc.)

Three views are fully designed: **Overview** (`/cluster/overview`), **Containers** (`/cluster/containers`), **Topology** (`/cluster/topology`). Seven other sidebar routes are placeholder stubs.

## Architecture Intent

```
Browser SPA
  ├── App shell: titlebar / sidebar (256px) / topbar / statusbar
  ├── Canvas area: routed views (Overview, Containers, Topology, stubs)
  └── Bot console rail (380px, collapsible) — chat with homelab agents

Server (thin, to be built)
  └── Proxies data from MCP servers in ../phone-home and ../homelab
      via the MCP HTTP endpoint: http://agent:3210/mcp/
```

## Visual Language (non-negotiable from design)

The dashboard is a **two-surface** layout:
1. **Shell** — always dark (`#0B0F14` family): titlebar, sidebar, topbar, statusbar, bot console
2. **Canvas** — dark by default (`#14191F` family), light mode available. The 8px top-left radius seam where canvas meets shell is a visual signature.

Accent: cyan (`#22D3EE`). Used only for: active nav indicator, focus rings, primary CTAs, status pulses, env badges.

Fonts: **Inter** (UI/body) and **JetBrains Mono** (all identifiers, eyebrow labels, table headers, stat numbers, kbd glyphs). Both from Google Fonts.

Icons: Lucide-style outline, 24×24 viewBox, **1.75 stroke**, `currentColor`, round caps+joins. Names mapped in `design/icons.jsx`. No emoji anywhere, ever.

All CSS tokens are in `design/styles/tokens.css` (palette/type) and `design/styles/studio.css` (shell/canvas/components). These are the source of truth — do not derive values; use or migrate the tokens directly.

## Key Design Tokens

```
Shell:      --shell-bg #0B0F14  --shell-fg-1 #E6EDF3  --shell-border #1E2733
Canvas dark: --canvas-bg #14191F  --canvas-fg-1 #E6EDF3  --canvas-bd #2A323C
Canvas light: --canvas-bg #FFFFFF  --canvas-fg-1 #0B1220
Accent:     --accent-cyan #22D3EE  --accent-amber #F59E0B
            --accent-violet #A78BFA  --accent-emerald #10B981  --accent-rose #F43F5E
Host tints: nyx=cyan, helios=emerald, aether=violet, vega=amber
Status:     ok/running=emerald  warn/degraded=amber  err/failed=rose  updating=cyan
```

## Persisted UI State

These must survive page reloads (localStorage or equivalent):
- `sidebarCollapsed: boolean`
- `chatVisible: boolean`
- `darkCanvas: boolean` (default `true`)
- `density: "compact" | "regular"`
- `showAlerts: boolean`
- Active route
- Active bot in topology/console

## Polling Cadences

- Cluster metrics: 15s
- Docker scrape: 30s
- Statusbar live numbers (cpu, ping, network): ~2.2s tick for liveness feel

## Sibling Repo Context

`../phone-home/mcp-config.json` shows the MCP server endpoint used by agents:
```json
{ "mcpServers": { "austinsand-macbook": { "type": "http", "url": "http://agent:3210/mcp/" } } }
```

The server component for this dashboard should consume the same MCP endpoint to fetch live homelab data, translating it into the data shapes documented in `design/README.md`.

## Routes

```
overview      /cluster/overview       — implemented in design
containers    /cluster/containers     — implemented in design
topology      /cluster/topology       — implemented in design
servers       placeholder
network       placeholder
apps          placeholder
storage       placeholder
bots          placeholder
logs          placeholder
settings      placeholder
```
