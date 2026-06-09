# Heimdall · Homelab Dashboard — asgard

A monitoring & control surface for the **asgard** 4-host homelab, rebuilt on the
**real Heimdall component library** (`github.com/tinkermonkey/heimdall`). The original
source `.tsx`/`.css` was imported verbatim; the dashboard composes those actual
components rather than re-implementing them.

Open `Homelab Dashboard.html` in any modern browser — no build step.

---

## How it works

The Heimdall library is TypeScript + React. To run it from a single static file with no
bundler, `heimdall-boot.js` does a tiny in-browser build at load:

1. Fetches each real Heimdall source file (listed in `HEIM_FILES`).
2. Strips only the `import`/`export` **statements** (textual, safe).
3. Lets **Babel** strip the **types** and transpile JSX (reliable).
4. Wraps each file in an IIFE — mirroring real ES-module scoping — and exposes every
   component on `window`.

The compiled library is cached in `localStorage` (`heimdall_bundle_v2`), so only the
**first load** pays the compile cost (~a few seconds, behind the boot splash); reloads are
instant. The app layer is always recompiled fresh. If you change Heimdall source, bump the
cache key in `heimdall-boot.js`.

> Because the artifact compiles real `.tsx` at runtime, it depends on the source files
> staying in place plus Babel from the CDN. For a fully self-contained export, inline first.

---

## File layout

```
Homelab Dashboard.html   Entry — splash + React/Babel + heimdall-boot.js
heimdall-boot.js         Runtime compiler/loader + cache for the real library

styles/
  heimdall.css           Real Heimdall tokens + every component's CSS (aggregated)
  lab.css                Project chrome only: 3-column frame, boot splash, host
                         metric card, gateway grid, topology stage, tweaks panel
  fonts/                 Self-hosted Inter + JetBrains Mono

src/                     Real imported Heimdall library source (boot fetches these):
  components/            Every component .tsx + statusColors/dropdownPlacement/
                         chartColors/chartTone .ts
  hooks/                 usePanZoom, useDropdownMenu, useFocusTrap, useBodyOverflow,
                         useVirtualList
  utils/                 dateUtils, heatmapUtils, graph, graphLayout

app/                     Project-specific app layer (always recompiled fresh):

data.js                  LAB_DATA — cluster, servers, gateway, apps, bots, alerts
data-ext.js              DOCKER_DATA (per-host inventory) + TOPOLOGY_DATA (agent mesh)

lab-icons.jsx            Extends the real ICONS map with a few homelab glyphs
view-overview.jsx        Overview  · PageHeader, AlertStrip, StatGrid/StatTile, host
                         cards (Panel + MetricRow), gateway (KVGrid + LineChart), apps (TabBar + Table)
view-containers.jsx      Containers/Networks/Volumes · TabBar, FilterBar, Table, RowMenu
view-topology.jsx        Topology · GraphCanvas (force layout) + TopologyNode + GraphInspector
view-network.jsx         Network · StatGrid, LineChart, KVGrid, Table
view-other.jsx           Servers · Bots · Apps · Storage · Logs(LogStream) · Settings(Field/Select/TriState)
chat-rail.jsx            Bot console · ChatContainer/ChatMessage/ChatComposer/ChatSuggestions/ChatDivider
lab-tweaks.jsx           Tweaks panel (SegmentedControl + toggles + accent swatches)
lab-app.jsx              Composition root — Sidebar/Topbar/Statusbar shell + routing
```

## Real Heimdall components used

Shell: `Sidebar` (with `AppTitle`), `Topbar`, `Statusbar`. Primitives: `Button`, `Chip`,
`Badge`, `Avatar`, `VersionPill`, `Icon`, `SegmentedControl`, `TabBar`. Data display:
`Panel`, `StatGrid`/`StatTile`, `MetricRow`, `ProgressBar`, `Sparkline`, `LineChart`,
`Table`, `KVGrid`, `AlertStrip`, `PageHeader`, `FilterBar`, `RowMenu`, `ConfigTile`,
`QuickAccessGrid`, `LogStream`, `Field`, `TextInput`, `TriState`, `Select`. Graph:
`GraphCanvas`, `TopologyNode`, `GraphInspector`. Chat: `ChatContainer`, `ChatMessage`,
`ChatComposer`, `ChatSuggestions`, `ChatDivider`.

Project-specific composites (the only bespoke pieces): the app frame, boot splash, the host
metric card head/foot, the gateway grid, the topology stage wrapper, and the tweaks panel.
```
