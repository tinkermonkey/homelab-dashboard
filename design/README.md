# Handoff: Homelab Dashboard

A monitoring & control dashboard for a 4-host homelab cluster, with a persistent bot console for chatting with the agents that manage it.

---

## About the Design Files

The files in this bundle are **design references created in HTML/JSX** — runnable prototypes that show intended look, layout, and behaviour. They are **not production code to copy directly**.

Your task is to **recreate these screens in the target codebase's existing environment** (React, Vue, SvelteKit, SwiftUI, native, whatever), using its established component library, routing, state management, and data-fetching patterns.

If no environment exists yet, pick the most appropriate framework for the team and implement the designs there. The HTML reference uses React 18 + Babel-standalone purely so it can run from a single static `index.html` — that is not a recommendation for production.

Open `index.html` in a browser to see the running design. Use the sidebar to switch between the three implemented views.

---

## Fidelity

**High-fidelity.** All visible colours, typography, spacing, radii, shadows, and interaction states are intended to ship as drawn. They are derived from the **Context Studio** design system (see `styles/tokens.css` for base palette/type and `styles/studio.css` for the shell/canvas/component layer). Treat the design tokens listed in this README as the canonical contract.

Three views are designed in full detail:
- **Overview** (`/cluster/overview`)
- **Containers** (`/cluster/containers`) — docker view
- **Topology** (`/cluster/topology`) — bot graph

Seven other sidebar routes (Servers, Network, Applications, Storage, Bots, Logs, Configuration) are present in the nav as **placeholders** — out of scope for this handoff.

---

## Visual Language

The dashboard is a **two-surface** layout:

1. **Shell** — dark IDE chrome (`#0B0F14` family): titlebar, left sidebar, topbar, right bot console, bottom statusbar. Always dark.
2. **Canvas** — the work surface inside the shell. Defaults to **dark canvas** (`#14191F` family) for monitoring contexts, with light mode available via a tweak. The canvas attaches to the shell with an 8px top-left radius — this seam is the visual signature of the system.

Accent colour is **cyan** (`#22D3EE` / `#0E7EA3`). Reserved for: active nav indicator, focus rings, primary actions, status pulses, env badges, brand mark.

Mono (JetBrains Mono) is used for all identifiers, hostnames, paths, IPs, eyebrow labels (`PORTS`, `MOUNTS`, `UPTIME`), table headers, kbd glyphs, status bar text. Inter for everything else.

No emoji anywhere. Outline icons only, 1.75 stroke, currentColor.

---

## App Shell

The shell wraps every view identically.

### Titlebar (36px)
- Three "traffic light" buttons (close/min/max), Macos style — purely decorative
- App name `Homelab`, workspace path chip `~/lab/asgard`
- Right-aligned: command-palette launcher `Search or run… ⌘K`

### Sidebar (256px expanded, 64px collapsed)
- Brand mark (cyan→deep-cyan gradient square, 3-dot stamp)
- Brand wordmark: `asgard` with `homelab · v3.2` eyebrow
- Collapse chevron in the brand row
- Nav items with icon + label + optional right-aligned count:
  | id | label | icon | count |
  | --- | --- | --- | --- |
  | `overview` | Overview | dashboard | — |
  | `servers` | Servers | cpu | 4 |
  | `containers` | Containers | layers | 31 |
  | `network` | Network | globe | — |
  | `apps` | Applications | workflow | 28 |
  | `storage` | Storage | database | 90 TB |
  | `bots` | Bots | bot | 4 |
  | `topology` | Topology | graph | — |
  | `logs` | Logs | history | — |
  | `settings` | Configuration | settings | — |
- Active state: 2px cyan bar at the left edge of the item + `shell-surface` background
- Footer: user avatar tile (`YN`) + `you / ssh · main`
- Collapsed mode: icons centered, all labels/counts/footer text hidden

### Topbar (52px)
Left → right:
- Sidebar toggle (chevron) — collapses/expands the sidebar
- Workspace chip `asgard` (cyan dot + name)
- Breadcrumb path (mono, `/` separators, last segment highlighted)
- Command palette launcher (stretches to fill remaining space, ⌘K hint)
- Icon buttons: bell (activity), refresh, bot (toggle console) — the bot button is highlighted cyan when console is open
- Env pill `main` (cyan)

### Statusbar (26px, bottom)
Dense, mono, two groups:
- **Left:** prometheus `:9090` (green pulse) · `4 hosts · 28 apps · 47 containers` · amber dot `2 alerts open · aether MEM 81%`
- **Right:** `ping 11 ms` · `↓ 412 ↑ 88 Mbps` · `cluster cpu 24%` · `synced 14s ago`
- Numbers in the right group should mildly fluctuate every ~2.2s to feel live (current design jitters via `setInterval`)

### Bot console (right, 380px, collapsible)
Always docked to the right edge when open. Toggle via the topbar bot icon, the X button in its own header, or the tweak. Persists state. Detailed in the [Bot Console](#bot-console) section.

---

## View: Overview

Default landing screen. Vertical stack inside the canvas:

### 1. Page header
- Eyebrow: cyan chip `cluster · asgard` + muted mono `rack-01 · basement · last sync 2 min ago`
- H1: `Overview` (24px / 700, tight letter-spacing -0.015em) with a muted mono id-tag `/cluster/asgard`
- Subtitle: `Resource state across hosts, gateway health, and deployed services. All systems polled every 15 s.`
- Right actions: `Refresh` (ghost button), `Ask lab-bot` (primary button, opens chat)

### 2. Alerts strip (optional, toggle via tweak)
Amber-tinted horizontal bar:
- 22px square icon (alert glyph, amber-on-amber background)
- Inline list of alerts: severity badge (`WARN`/`INFO`) + mono description, separated by `·`
- Right-aligned clear button: `Open in watch-bot →`

### 3. Cluster stat row
Four tiles, equal width, 14px gap. Each tile has a 2px coloured left bar:

| Tile | Color | Label | Value | Meta |
| --- | --- | --- | --- | --- |
| Power draw | cyan | `POWER DRAW` | `412 W` | `▲ 8 W` (emerald) `vs 7d avg` |
| Active alerts | amber | `ACTIVE ALERTS` | `2` | `2 warn · 0 error` |
| Egress today | violet | `EGRESS TODAY` | `48.3 GB` | `▼ 12%` `vs 7d` |
| Cluster uptime | emerald | `CLUSTER UPTIME` | `127 d 4h` | green pulse · `all hosts up` |

Stat number: 28px / 700 / -0.02em / tabular nums.

### 4. Servers (2×2 grid, 14px gap)
Each server card has four parts:

**Head (12/14 padding, 1px bottom border)**
- 28px role-tinted mark square with 2-letter monogram (`NX`, `HS`, `AE`, `VG`)
- Stack: bot-name in mono 14/600 with status pulse-dot (emerald/amber/rose) · sub-line `hostname.lab.local · 10.0.0.x` in mono 10.5
- Right: `UPTIME` (mono caps 10.5) / `42d 11h` (mono 11.5/500)

**Metric list (4 px-0 dashed-separated rows, 1 per metric)**
Each row is a 4-column grid: `44px label · 1fr bar · 56px value · 84px sparkline`
- **CPU** — % value, cyan/amber/rose bar (warn ≥75%, err ≥85%)
- **MEM** — `used/total GB`, violet bar
- **DISK** — `used/total TB|GB`, emerald bar
- **NET** — `↓124 ↑36 Mbps`, cyan bar (scaled `min(100, v*2)%`)
- **GPU** (vega only) — `73% · 38.4/48 GB`, amber bar

The bar is 6px tall, rounded-pill, with the fill colour matching the row's sparkline. Sparkline is an inline SVG line+area path over 48 data points (1 per 30 min).

**Foot (4-column 1px-gap grid on `canvas-bg-2` cells)**
Each cell: mono caps key + mono value. Keys: `MODEL`, `TEMP` (rose if ≥75°C), `LOAD`, `CONTAINERS`.

Servers in the design:

| id | role | hostname | IP | model | CPU | MEM | DISK | NET | extras |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `nyx` | compute | nyx.lab.local | 10.0.0.11 | Threadripper 7960X, 24c/48t | 38% | 79/128 GB | 5.2/7.3 TB | ↓124 ↑36 | temp 54°, 24 containers |
| `helios` | storage | helios.lab.local | 10.0.0.12 | TrueNAS Core, 8×16 TB ZRAID2 | 12% | 26.4/64 GB | 52.1/90 TB | ↓38 ↑202 | temp 47°, 6 containers |
| `aether` | k8s | aether.lab.local | 10.0.0.13 | k3s worker, i7-12700, 64 GB | 64% (warn) | 51.8/64 GB (warn) | 440/1024 GB | ↓88 ↑54 | temp 68°, 47 containers |
| `vega` | gpu | vega.lab.local | 10.0.0.14 | 2× RTX 4090, Xeon W5-2455X | 22% | 120.3/256 GB | 1.2/4 TB | ↓46 ↑24 | GPU 73%, 418 W, temp 74° |

Role marks colour-code: compute=cyan, storage=emerald, k8s=violet, gpu=amber.

### 5. Network gateway panel
One full-width panel:

**Header**: `🌐 Internet connection · gw.lab.local`, right side: emerald `healthy` chip + `Run speedtest` ghost button.

**Body** — two-column grid:

*Left column (gateway-info)* — `Connection · 10 Gbit symmetric` eyebrow then a 88px-key kv list:
- `ISP`: Sonic Fiber
- `ASN`: AS46375
- `PUBLIC IP`: 73.214.118.42 (with cyan `↗ ipv4` flag)
- `GEO`: San Francisco, CA
- `WAN IFACE`: wan0 · 10G SFP+
- `PING`: 11 ms · jitter 0.6 ms
- `LOSS 24H`: 0.00 %

*Right column (gateway-charts)* — two stacked line charts on a 1px-divider grid:
- **Throughput · 24h** — value `412 Mbps  ↓ now · ↑ 88`; dual-line chart (down=cyan solid, up=violet dashed) with filled areas, 3 y-axis grid lines, `-24h` / `now` x-axis labels
- **Latency · 24h** — value `11 ms`; single cyan area+line chart

**Stat strip (4 cells, 1px gap, on `canvas-bg-2` cells)**:
- `INGRESS · TODAY` `312.6 GB` `↓ 412 Mbps peak · 14:02`
- `EGRESS · TODAY` `48.3 GB` `↑ 1.42 TB this month`
- `DNS · PIHOLE` `1,421 q` `blocked 18% (314)`
- `VPN PEERS` `2/4` `wireguard · last handshake 41s`

### 6. Applications panel
Category filter chips at the top: `all (28) media (4) iot (4) ai (4) storage (4) dev (4) observability (4) network (4)`. Active chip: cyan text + cyan-tinted background.

Below, a panel containing a 4-column 1px-gap grid of app cells. Each cell:
- 2px left bar tinted by host (`nyx`=cyan, `helios`=emerald, `aether`=violet, `vega`=amber)
- 22px square initials box (`JE`, `IM`, `PL`…), mono 10/600, `canvas-bg-2` background, border
- Main: mono 12.5/500 name; below it mono 10 muted meta `1.40.4 · nyx · streams · 2 active`
- Right: mono 10 status pill with leading dot:
  - `RUNNING` — emerald
  - `DEGRADED` — amber
  - `FAILED` — rose
  - `STOPPED` — neutral grey
  - `UPDATING` — cyan

Above the grid: section eyebrow row with stat summary (`● 25 RUNNING · ● 1 DEGRADED · ● 1 FAILED` colour-dotted).

---

## View: Containers

Docker inventory across the 4 hosts.

### 1. Page header
Eyebrow: violet chip `docker · 4 hosts` + muted `scraped via docker socket · every 30s`. H1 `Containers /cluster/asgard/docker`. Subtitle describes purpose. Actions: `Refresh`, `Compose up…` primary.

### 2. Sub-tabs
Bottom-bordered tab row (overrides cyan in dark canvas):
- `Containers 25/31` (running/total count badge)
- `Networks 17`
- `Volumes 28`

Counts are aggregated across all hosts.

### 3. Toolbar
- Search input (cyan focus ring) with leading search icon — filters by name / image / tag (containers tab only)
- Host filter chips: `all hosts (31) · nyx (8) · helios (6) · aether (12) · vega (5)`. Same active-chip cyan treatment.

### 4a. Containers tab
One panel per host (after filter). Panel header:
- Role-tinted host mark
- Mono 14/600 `nyx · Docker 27.3.1` (engine inline as muted)
- Sub-line: `docker compose v2.30.1` (mono caps)
- Right: `7/8 RUNNING` summary

**Container row** (grid 18px / 230px / 1fr / 100px, 14px gaps):
- Col 1: 8px status dot (emerald running / grey exited / cyan updating / rose unhealthy/failed / amber degraded)
- Col 2 (id+health):
  - mono 13/600 name + mono 10 grey container ID
  - mono 11 image with `:tag` in cyan
  - badges: state badge (`running` emerald, `exited` grey, `updating` cyan) plus extra health badge if different (`healthy` emerald, `unhealthy`/`failed` rose, `degraded` amber, `pulling` cyan, `idle` neutral)
- Col 3 (detail): three optional sub-rows, each `56px key · 1fr pills`:
  - `PORTS` — `port-pill` per entry: cyan `8096 → 8096 tcp` (host → container · proto). One pill per port.
  - `MOUNTS` — `mount-pill`: `B|V` type prefix (violet for bind, amber for volume) + host-or-volume-name + `→ /container/path` + optional `RO` rose flag for read-only
  - `NET` — `net-pill`: colour-coded dot + network name (`proxy_net` cyan, `iot_net` amber, `media_net` violet, `dev_net` emerald, `ai_net` rose, `obs_net` cyan)
- Col 4 (stats, right-aligned mono): `↑ 18d 4h` uptime / size `142 MB` / `cpu 14% · mem 1.8 GB` (gpu shown amber for vega containers)

### 4b. Networks tab
Per-host panel, header counts attached. Table inside:

| Network | Driver | Subnet | Gateway | Scope | Attached |
| --- | --- | --- | --- | --- | --- |
| ● proxy_net | bridge pill | 172.20.0.0/16 | 172.20.0.1 | local | 6 |
| ● obs_net | bridge | 172.21.0.0/16 | … | … | 4 |

Network name has a leading 8px colour-coded dot matching the net-pill scheme. Driver shown as a small pill.

### 4c. Volumes tab
Per-host panel, header shows total size summed across volumes. Table inside:

| Volume | Driver | Size | Mount point | Used by |
| --- | --- | --- | --- | --- |
| jellyfin_cache | local | 4.2 GB | `/var/lib/docker/volumes/jellyfin_cache/_data` | `jellyfin` |
| immich_model_cache | local | 8.4 GB | … | `immich-server` `immich-ml` |

`Used by` shows one mono pill per container.

---

## View: Topology

Bot/MCP/project graph. **Minimum width 1560px** — canvas scrolls horizontally below that.

### 1. Page header
Eyebrow: violet chip `topology · 4 bots` + muted `bots · sidecar mcp servers · managed projects`. H1 `Bot topology`. Actions: `Refresh`, `Export DOT` ghost.

### 2. Stage + inspector
Single panel, two-column grid: `stage (1fr, min 1240px) · inspector (320px)`.

**Stage (1240×800 reference resolution)**
- Subtle 32px grid background with two radial cyan/violet glows
- **Server row** at top: 4-column grid of compact server headers (`role mark · name + sub · bot count badge`). For `vega`: dimmed and shows `— no bot —`.
- **Bot cards** (240×variable, absolutely positioned in their host's column):
  | bot | host | x | y |
  | --- | --- | --- | --- |
  | `lab-bot` | nyx | 30 | 88 |
  | `ops-bot` | nyx | 30 | 408 |
  | `sync-bot` | helios | 330 | 88 |
  | `watch-bot` | aether | 630 | 88 |
- **Vega placeholder** at (930, 88): 240px dashed-border tile reading `No bot on vega · GPU workloads are launched here by ops-bot via ssh-mcp; no resident agent.`
- **SVG edge overlay** drawing dashed-cyan bezier curves from lab-bot to each of its delegates (ops-bot, watch-bot, sync-bot), each labelled `delegates` mid-path on a small rounded pill
- **Legend** docked bottom-right: line styles (`delegation`, `MCP sidecar`) + host colour dots

**Bot card anatomy** (border `canvas-bd-2`, 8px radius, 12/12/10 padding):
- Head grid `26px av · 1fr name+role · auto pulse`:
  - 26px gradient avatar tile (each bot has its own gradient — see below)
  - Mono 13/600 bot name + mono 9.5 caps role
  - 7px status pulse dot: emerald (ok), amber (busy), grey (idle)
- 11px description line
- Mono pill `claude-sonnet-4` with leading cyan dot (model)
- Section eyebrow `MCP SIDECARS · 4` (mono caps 9 / count badge)
- Wrap of MCP chips: violet-tinted pills, mono 10, leading dot (filled for native, outlined for remote)
- Section eyebrow `MANAGES · 6` then wrap of project chips: mono 10, host-coloured leading dot, `:port` suffix divided by a 1px left border in mono 9
- For lab-bot: extra section `DELEGATES TO · 3` — cyan-tinted project chips listing the other bot ids

Selected bot card: 1px cyan border + 1px cyan outer ring.

**Inspector panel (320px)**
- Header: 32px gradient avatar + name 16/700 + mono caps role-and-host
- 12.5 paragraph of description
- 80px-key kv list: `MODEL · HOST · STATUS · MCPS · MANAGES · DELEGATES`
- `MCP SIDECARS · n` section — one mini-card per MCP:
  - Mono 12/600 name with leading dot (filled native / outlined remote)
  - Mono 10 muted `v0.3.1 · native`
  - 11px description line
- `MANAGED PROJECTS · n` — same project chip wrap as on the card
- `DELEGATES TO · n` — same cyan delegate chips (lab-bot only)

### Bot avatar gradients
- `lab-bot`: `linear-gradient(135deg, #C4B5FD, #6D28D9)` text white
- `ops-bot`: `linear-gradient(135deg, #22D3EE, #0E7EA3)` text `#0B0F14`
- `watch-bot`: `linear-gradient(135deg, #FCD34D, #B45309)` text `#29220A`
- `sync-bot`: `linear-gradient(135deg, #6EE7B7, #047857)` text `#062A1F`

---

## Bot Console (right rail, 380px)

Vertical layout, full height. Dark shell colours throughout (matches sidebar, not canvas).

### Head (1px bottom border)
- Cyan dot + `Bot console` 13/600
- Sub-line mono caps `4 BOTS · ONE-CLICK DELEGATE · ⌘ENTER`
- Right icons: history, settings, X close (close button only renders when host provides `onClose`)

### Bot tabs (4-column row, 1px bottom border, `shell-bg`)
Each tab is a vertical stack:
- Mono 11/500 name with leading 5px status dot (emerald ok / amber busy / grey idle)
- Mono 9 caps role (`ops`, `alerts`, `backup`, `concierge`)
- Active tab: cyan bottom border, cyan role text, `shell-bg-2` background

### Thread (scrollable, 14/14 padding, 14px gap)
- **Day dividers**: mono 9.5 caps `TODAY · 14:02` with 1px lines flanking
- **Message** (grid 22px av · 1fr body):
  - Bot avatar uses the same gradient as in topology
  - User avatar: `shell-surface` background + 1px border, `me` initials
  - Meta row: mono 11.5/600 name · mono 9 caps badge (role) · mono 10 right-aligned timestamp
  - Body: 12.5/1.55 sans, paragraphs separated by 6px margin
  - `<code>` in body: mono 11, cyan on `shell-bg`, 1px border 3px radius
  - Optional **tool-call block** (1px border 6px radius `shell-bg`):
    - Mono 10 caps head: lightning icon · tool name · emerald right-aligned `completed in 1.4s`
    - Mono 11 pre-wrapped body, key 11ch padded grey + value white, sparse colour for `add`/`del`/`+`
  - Optional **suggestion chips**: mono 10.5 pills with arrow glyph, `shell-surface` bg, click sends the suggestion as a user message

### Composer (1px top border, `shell-bg-2`)
- Composer tools row: `talking to lab-bot` scope line (with cyan bot name) + small pills `context`, `/cmd`
- Textarea (1px `shell-border-2`, 8px radius, cyan focus ring): 38px min-height, sans, placeholder hint includes example slash command
- Composer foot: `↵ send · ⇧↵ newline · / commands` left-aligned mono kbd hints; cyan `send` button right-aligned

---

## Interactions

| Action | Mechanism |
| --- | --- |
| Switch view | Click sidebar nav item — updates route state, re-renders canvas content |
| Collapse/expand sidebar | (1) Chevron in brand row; (2) Chevron in topbar leftmost; (3) `Collapse sidebar` toggle in Tweaks panel. Persisted. |
| Show/hide bot console | (1) Bot icon in topbar; (2) X in console header; (3) `Show bot console` toggle in Tweaks. Persisted. |
| Switch active bot | Click bot tab in console |
| Send a message | Type in composer + ⏎ (or click Send / click a suggestion). User message appears, then a canned bot reply ~immediately. Thread auto-scrolls. |
| Filter applications by category | Click category chip |
| Filter containers by host | Click host chip in Containers toolbar |
| Search containers | Type in toolbar input (filters by name/image/tag) |
| Select a bot in topology | Click bot card — inspector updates, selection ring appears |
| Toggle dark canvas | Tweaks panel |
| Toggle alerts strip | Tweaks panel |
| Change density | Tweaks panel (`compact` reduces spacing across server cards + canvas padding) |
| Change accent colour | Tweaks panel — overrides `--accent-cyan` CSS variable globally |

**Animations**
- Status pulse (live indicators): `1.6s ease-out infinite` scale 0.6→1.4 + opacity 0.5→0 on an absolutely-positioned glow circle behind a solid coloured dot
- Hover transitions: 80–180ms ease on background/border/colour
- Modal & dialog enter: 140–160ms ease-out (`paletteIn`, `paletteSlide`)
- No bouncy easing, no parallax, no transforms on press

---

## Data Shape

Two seeded data modules — `data.js` (live-feeling cluster state) and `data-ext.js` (docker inventory + topology graph). The shapes below are the source of truth for whatever real API/wire format you back this with.

### `LAB_DATA.cluster`
```ts
{
  name: string;            // e.g. "asgard"
  location: string;        // "rack-01 · basement"
  domain: string;          // "lab.local"
  powerDraw: number;       // watts
  powerAvg: number;        // watts, 7d avg
  uptimeDays: number;
  uptimeHours: number;
  egressTodayGB: number;
  egressDelta: number;     // % vs 7d (negative = down)
  activeAlerts: number;
  lastSync: string;        // "2 min ago"
}
```

### `LAB_DATA.servers[]`
```ts
{
  id: string;                    // "nyx"
  role: "compute"|"storage"|"k8s"|"gpu";
  mark: string;                  // 2-letter monogram
  hostname: string; ip: string; model: string;
  uptime: string;                // "42d 11h"
  status: "ok"|"warn"|"err";
  cpu: { v: number;  hist: number[]; };                      // % (48-point history)
  mem: { v: number;  hist: number[]; used: string; total: string; unit: "GB"|"TB"; };
  disk: { v: number; hist: number[]; used: string; total: string; unit: "GB"|"TB"; };
  net: { v: number;  hist: number[]; down: string; up: string; unit: "Mbps"; };
  gpu?: { v: number; hist: number[]; vram: string; power: string; }; // vega only
  temp: string; load: string; containers: number;
}
```

### `LAB_DATA.gateway`
```ts
{
  isp, plan, publicIp, hostname, geo, statusFor, asn, wanIf: string;
  status: "online"|"degraded"|"offline";
  pingMs: number; pingHist: number[];
  jitterMs: number; lossPct: number; lossHist: number[];
  downMbps: number; upMbps: number; downHist: number[]; upHist: number[];
  egressTodayGB: number; ingressTodayGB: number; egressMonthTB: number;
  blockedPct: number; dnsResolved: number; dnsBlocked: number;
  vpnPeers: number; vpnPeersActive: number;
}
```

### `LAB_DATA.apps[]`
```ts
{
  id: string;             // "jellyfin"
  host: "nyx"|"helios"|"aether"|"vega";
  cat: "media"|"iot"|"ai"|"storage"|"dev"|"obs"|"net";
  version: string;
  state: "running"|"degraded"|"failed"|"stopped"|"updating";
  meta: string;           // free-text right side: "streams · 2 active"
}
```

### `LAB_DATA.bots[]` + `LAB_DATA.threadByBot`
```ts
Bot = {
  id, label, role: string;
  avatar: string;            // 2 chars
  status: "ok"|"busy"|"idle";
  desc, model: string;
}
Thread = ThreadItem[]
ThreadItem =
  | { kind: "divider"; label: string }
  | { kind: "msg"; who: "user"|<botId>; name?: string; when: string;
      body: { p: string }[];        // p is HTML-safe paragraph
      tool?: { name: string; status: string; lines: { k?: string; v: string }[] };
      suggestions?: { t: string }[] }
```

### `DOCKER_DATA.hosts[]`
```ts
{
  id: string;                    // "nyx"
  engine: string;                // "Docker 27.3.1"
  compose: string;
  containers: Container[];
  networks: Network[];
  volumes: Volume[];
}
Container = {
  id: string;                    // short hex
  name: string;
  image: string; tag: string;
  state: "running"|"exited"|"updating";
  health: "healthy"|"unhealthy"|"degraded"|"failed"|"stopped"|"pulling"|"idle";
  uptime: string;
  ports: string[];               // "8096:8096/tcp"
  mounts: Mount[];
  networks: string[];
  size: string;                  // human "142 MB"
  cpu: number; mem: number;      // mem in MB
  gpu?: number;                  // %
}
Mount =
  | { type: "bind";   host: string; container: string; mode?: "ro" }
  | { type: "volume"; name: string; container: string; mode?: "ro" }
Network = {
  name: string; driver: string;
  subnet: string; gateway: string;
  scope: "local"|"swarm";
  attached: number;
}
Volume = {
  name: string; driver: string;
  size: string;                  // "4.2 GB"
  mount: string;                 // full host path
  usedBy: string[];              // container names
}
```

### `TOPOLOGY_DATA`
```ts
{
  hosts: string[];               // ["nyx", "helios", "aether", "vega"]
  bots: TopologyBot[];
}
TopologyBot = {
  id, label, role, host, model, desc, avatar: string;
  status: "ok"|"busy"|"idle";
  mcps: MCP[];
  delegates: string[];           // ids of other bots
  manages: { name: string; host: string; port: string }[];
}
MCP = {
  id, label, ver: string;
  kind: "native"|"remote";
  desc: string;
}
```

---

## Design Tokens

All canonical values in `styles/tokens.css` + `styles/studio.css`.

### Colour

**Shell (always dark)**
```
--shell-bg:        #0B0F14
--shell-bg-2:      #0F141B
--shell-surface:   #131A23
--shell-surface-2: #1A2230
--shell-border:    #1E2733
--shell-border-2:  #2A3645
--shell-fg-1:      #E6EDF3   /* primary text */
--shell-fg-2:      #A6B1BD
--shell-fg-3:      #6E7A87
--shell-fg-4:      #4A5563
```

**Canvas — light mode**
```
--canvas-bg:    #FFFFFF
--canvas-bg-2:  #F7F9FB
--canvas-card:  #FFFFFF
--canvas-bd:    #E5E9EE
--canvas-bd-2:  #D6DCE3
--canvas-fg-1:  #0B1220
--canvas-fg-2:  #475569
--canvas-fg-3:  #64748B
--canvas-fg-4:  #94A3B8
```

**Canvas — dark mode** (active by default for this dashboard, applied via `body.dark-canvas` overriding the same variables)
```
--canvas-bg:    #14191F
--canvas-bg-2:  #1B222A
--canvas-card:  #1B222A
--canvas-bd:    #2A323C
--canvas-bd-2:  #3A4452
--canvas-fg-1:  #E6EDF3
--canvas-fg-2:  #B0BAC5
--canvas-fg-3:  #7E8A98
--canvas-fg-4:  #5A6573
```

**Accent + semantic**
```
--accent-cyan:       #22D3EE   /* brand bright */
--accent-cyan-2:     #06B6D4   /* hover */
--accent-cyan-deep:  #0E7EA3   /* default CTA in light canvas */
--accent-amber:      #F59E0B
--accent-violet:     #A78BFA
--accent-emerald:    #10B981
--accent-rose:       #F43F5E
```

**Host/domain palette** (used in topology, app-cell left bars, server marks)
```
--dom-life:     #34D399    nyx-emerald  (helios in this design)
--dom-climate:  #FBBF24    amber/vega
--dom-software: #818CF8    violet/aether
--dom-default:  #22D3EE    cyan/nyx
```

**Status mapping**
| State | Colour token |
| --- | --- |
| ok / running / healthy | emerald |
| warn / degraded / pulling | amber |
| err / failed / unhealthy | rose |
| stopped / idle | neutral (fg-3/4) |
| updating / pulling | cyan |

### Typography

- **Sans**: Inter (Google Fonts) — UI, body, headings
- **Mono**: JetBrains Mono (Google Fonts) — every identifier, eyebrow label, table header, kbd, stat number, table cell

Scale (Tailwind-equivalent):
```
text-xs   12px   mono eyebrows, badges
text-sm   14px   body, button, table (default UI density)
text-base 16px
text-lg   18px
text-xl   20px
text-2xl  24px   page H1 (IDE density — much smaller than typical web H1)
text-3xl  30px
```

Weights: 400 normal, 500 medium (most UI), 600 semibold (headings, names), 700 bold (page H1, stat numbers).

Mono eyebrow labels: 10–11px, weight 500, **letter-spacing 0.06–0.12em**, **uppercase**, colour `canvas-fg-3`.

Headings: tight tracking (-0.015em to -0.025em).

### Spacing
Tailwind 4px scale. Density ranges:
- Compact (table rows, nav items, metric rows): 8–10px vertical padding
- Standard (panel headers, buttons, page padding): 12–14px
- Generous (page heads): 18–22px
- Canvas inner padding: `22px 26px 32px` (lab-canvas-inner) with `min-width: 1100px` to keep multi-column layouts intact below ~1100px canvas-area widths

### Radius
- 3–4px chips, badges, table cells, kg-node
- 6px buttons, inputs, nav items, network/port pills
- 8px panels, cards, stat tiles
- 10–12px modal, palette dialog

### Borders & shadows
- 1px hairline at low contrast does most of the structural work
- Cards: border only, **no shadow**
- Modal shadow: `0 24px 64px -16px rgba(0,0,0,0.55)`
- Toast: `0 14px 40px -16px rgba(0,0,0,0.5)`

### Focus & selection
- Focus ring on inputs/buttons: `0 0 0 3px rgba(34, 211, 238, 0.13–0.15)`
- Text selection: `rgba(34, 211, 238, 0.25)`
- Selected card: 1px cyan border + 1px cyan glow ring

---

## Iconography

Lucide-style outline, 24×24 viewBox, **1.75 stroke width**, `currentColor`, round caps + joins. Sizes 11–16px in UI, 18–22px in tile heads.

The reference renders icons via `<Icon name="…" size={…} />` from `icons.jsx`, which is a lookup of SVG path strings. Used icon names in this dashboard:
```
dashboard schema data pipeline graph reference dataset settings
search bell plus chevDown chevRight chevLeft alert ext edit
refresh filter more play pause rocket bot brain link zap globe
shield cpu layers doc workflow branch history tag table flask dot
sparkle database folder add arrow check x expand
```

In your codebase: map these names to your icon library (Lucide React names match for ~90%). The only filled icons in use are `play`, `pause`, `zap`, `dot`. Never use emoji.

---

## Implementation Notes

### Routing
The reference uses a single `route` string in App state with a hand-rolled switch. Wire to your real router (React Router, TanStack Router, etc.). Routes used:
```
overview · containers · topology · servers · network · apps · storage · bots · logs · settings
```

### Persisted UI state
Persist these across reloads (cookie / localStorage / user preferences):
- `sidebarCollapsed: boolean`
- `chatVisible: boolean`
- `darkCanvas: boolean` (default true for this dashboard)
- `density: "compact" | "regular"`
- `showAlerts: boolean`
- Currently-active route
- Currently-selected bot in topology and bot console

The reference uses a `Tweaks` panel (`tweaks-panel.jsx`) for live in-browser editing of these — you do not need to ship that panel. Use your own settings UI.

### Charts
Sparklines (`charts.jsx`) are pure functions over arrays — `sparkPaths(values, w, h)` returns line/fill paths for a fixed-size SVG. Gateway charts use the same logic plus an axis. For production, replace with `recharts`, `visx`, `uPlot`, or whatever your stack uses — match the visual treatment (no axis ticks, 3 dashed horizontal grid lines, mono 8.5px labels at min/mid/max + `-24h`/`now`).

### Polling
The design assumes 15s metric polling and 30s docker scrapes. Status bar synced-time + statusbar `cpu/mem/ping` numbers tick every ~2.2s purely as a liveness cue.

### Bot chat backing
The reference includes canned replies in `chat.jsx` for prototyping. Wire to your actual agent/LLM backend. Each bot is a different deployment with its own MCP sidecars and tool surface — see the `TopologyBot` shape for what each agent should be configured with.

### Min-widths and scrolling
- `lab-canvas-inner` has `min-width: 1100px` — the canvas-area is `overflow: auto` so it scrolls horizontally below that
- Topology stage-wrap has `min-width: 1560px` (1240px stage + 320px inspector). When the right rail is open and sidebar is open, narrow viewports will horizontally scroll
- Hint to users: collapse the sidebar and/or close the bot console to gain real estate on Topology

### Dark-canvas mode
`body.dark-canvas` flips a set of CSS variable overrides — see the bottom of `styles/studio.css` and `styles/homelab.css`. Chip background tints, status colours, button colours, and table hover all have explicit dark-mode treatments. Don't try to derive these via filter() or invert.

---

## File Manifest

```
index.html                         entry — loads css + js + jsx
styles/
  tokens.css                       Flowbite/Tailwind base palette + type scale
  studio.css                       Shell, canvas, components (the design system)
  homelab.css                      Overview + chat rail (homelab-specific)
  views.css                        Containers + Topology view styles
icons.jsx                          Outline icon set + <Icon> component
charts.jsx                         Sparkline + GwChart (gateway line chart)
data.js                            LAB_DATA (cluster, servers, gateway, apps, bots, threads)
data-ext.js                        DOCKER_DATA + TOPOLOGY_DATA
view-overview.jsx                  Overview screen composition
view-docker.jsx                    Containers screen (containers/networks/volumes tabs)
view-topology.jsx                  Topology graph + inspector
dashboard.jsx                      Reusable parts of overview: alerts, stats, servers, gateway, apps
chat.jsx                           Bot console rail
app.jsx                            App shell — titlebar/sidebar/topbar/statusbar + route switch
tweaks-panel.jsx                   Dev-only tweaks UI (do not ship)
```

---

## Out of Scope (placeholder routes)

These sidebar entries render an empty-state stub in the reference. Treat as separate future scope:
- `servers` — per-host detail page (drill-down from Overview's server cards)
- `network` — full gateway detail, DNS, VPN peer list, port forwards, firewall rules
- `apps` — full applications table, deployment manifests, restart/upgrade controls
- `storage` — per-pool ZFS view, dataset list, snapshot timeline
- `bots` — bot registry, model picker, audit log
- `logs` — Loki-backed log tail / search
- `settings` — workspace configuration, user prefs, integration credentials

---

## Questions for the dev team

If you hit ambiguity:
1. **Real polling vs WebSocket push?** The design assumes pull. Server pushes would let you drop the manual "Refresh" buttons.
2. **Auth model.** Currently single-user (`you`). Multi-user adds avatars on activity, audit attribution on bot tool-calls.
3. **Bot tool-call surfacing.** The chat shows tool-call blocks inline. Decide whether to render every invocation (verbose) or only ones that mutated state (terse).
4. **Container actions.** Containers tab has no action buttons in the reference. Wire `Start / Stop / Restart / Logs / Shell` per row when backend supports it.
5. **Topology data source.** Bots/MCPs/managed-projects mapping is hand-curated in `data-ext.js`. In production, derive from a service registry or a manifest each bot declares.
