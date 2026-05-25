# Heimdall · Homelab Dashboard — Implementation Handoff

A monitoring & control dashboard for the **asgard** 4-host homelab cluster, built end-to-end on the **Heimdall design system** (amber accent, slate-navy shell, dark canvas default).

This bundle is a runnable design reference, not production code. Open `Homelab Dashboard.html` in any modern browser — no build step. The stack is React 18 + Babel-standalone purely so the spec runs from a single static file; pick whatever framework, router, and data layer your team prefers when implementing.

---

## File layout

```
Homelab Dashboard.html        Entry — loads CSS + scripts in order
styles/
  tokens.css                  Heimdall token layer (135 CSS vars + dark-canvas overrides)
  app.css                     Composition layer — shell + canvas components
  fonts/                      Self-hosted Inter (300–900) + JetBrains Mono (400/500/600)

icons.jsx                     <Icon name="…" size=…> + ICONS map (Lucide-style outline, 1.75 stroke)
charts.jsx                    Spark + AreaChart — pure SVG, token-driven via style
components.jsx                Shared primitives: Pulse, Chip, Button, Panel, StatTile,
                              RoleMark, MetricRow, StatePill, MiniBadge

shell.jsx                     Sidebar (NAV_TREE), Topbar, Statusbar
chat.jsx                      Bot console — right-rail chat with 4 bots
tweaks.jsx                    Dev-only tweaks panel (do not ship)

view-overview.jsx             /cluster/asgard/overview
view-containers.jsx           /cluster/asgard/docker · 3 tabs
view-topology.jsx             /cluster/asgard/topology · bot graph + inspector
view-network.jsx              /cluster/asgard/network
view-other.jsx                Servers, Bots, Apps + Storage/Logs/Settings stubs

data.js                       LAB_DATA — cluster, servers, gateway, apps, bots
data-ext.js                   DOCKER_DATA, TOPOLOGY_DATA

app.jsx                       Composition + tweaks-mode protocol
```

---

## Visual language

**Two-surface architecture.** Shell (sidebar/topbar/statusbar/bot console) is always dark slate navy (`--shell-bg-2: #13203A`). Canvas (main work surface) defaults to dark navy (`--canvas-bg: #0B1426`) for this monitoring context — toggle to light via `body.dark-canvas` removal or the tweaks panel.

**The 8px top-left radius** where canvas meets the shell column is the system's signature.

**Accent.** Amber (`--accent-primary: #FBBF24`). Reserved for: active nav indicator (2px left bar), focus rings, primary CTAs, status pulses, env pill, selected node outline.

**Type.** Inter (UI/body) and JetBrains Mono (every identifier, eyebrow, hostname, port, ID, table header, kbd, stat number, statusbar text).

**Icons.** Lucide-style outline, 24×24 viewBox, **1.75 stroke**, `currentColor`, round caps/joins. Names mapped in `icons.jsx`. Only filled icons: `play`, `pause`, `zap`, `dot`. **No emoji.**

**Animations.** 80–180 ms ease on hover/border. The only continuous animation is the **status pulse** (`pulse-out`, 1.6s, on absolutely-positioned glow behind a solid dot) — used exclusively for "live" indicators.

---

## Design tokens — usage rules

`styles/tokens.css` is the **canonical** source. Every `var(--*)` reference in `app.css` reads from there. To restyle the dashboard, edit tokens, not component CSS.

**Light → dark canvas** is a single class on `<body>`: `body.dark-canvas` overrides ~25 CSS variables — canvas surfaces, foregrounds, borders, and the semantic chip palette. There is no per-component dark-mode logic; every dark treatment derives from this token swap.

**Never hardcode hex.** Use the token references. Three exceptions in this bundle, all intentional:
- Per-bot avatar gradients in `.bot-avatar[data-id="…"]` — explicit per-bot identity colors.
- The brand-mark inner 3-dot stamp (`rgba(15,23,41,0.75)`) — derived from `--shell-bg`.
- `rgba(<status>, alpha)` tints used for chip backgrounds where no `--*-bg` token exists.

---

## App shell contract

| Surface | Height | Source |
|---|---|---|
| Sidebar | 256px expanded / 64px collapsed | `shell.jsx :: Sidebar` |
| Topbar  | 52px | `shell.jsx :: Topbar` |
| Statusbar | 26px | `shell.jsx :: Statusbar` |
| Bot console | 380px right rail, dockable | `chat.jsx :: BotConsole` |

The sidebar uses an expandable `NAV_TREE` — top-level items have an optional `children` array. Parents containing the active route get `.active-parent`; leaves get `.active` with the amber left bar. Sub-routes are written as `"top/leaf"` (e.g. `"containers/networks"`, `"bots/lab-bot"`).

The bot console toggles via the topbar bot icon or its own X. State persists across reloads in production (this prototype persists via the tweaks-mode protocol).

---

## Persisted UI state (production)

| Key | Type | Default |
|---|---|---|
| `sidebarCollapsed` | boolean | `false` |
| `chatVisible` | boolean | `true` |
| `darkCanvas` | boolean | `true` |
| `density` | `"compact" \| "regular"` | `"regular"` |
| `showAlerts` | boolean | `true` |
| `route` | string | `"overview"` |
| `topology.selectedBot` | string | `"lab-bot"` |

---

## Data shapes

See inline TypeScript-ish JSDoc at the top of `data.js` and `data-ext.js`, or the original handoff README from the source repo (`tinkermonkey/homelab-dashboard/design/README.md`) for the canonical data contracts.

---

## What's out of scope here

Storage, Logs, Configuration routes ship as placeholder stubs in `view-other.jsx`. Treat as separate future scope — reuse the same shell, page-head, panels, and chips when implementing.

---

## Quick reference — DS primitives

| Primitive | Anatomy |
|---|---|
| `Chip` | 3/9/3/8 padding, radius 4, mono dot + label, semantic-X-bg/fg/border |
| `Button` | 7/12 padding, radius 6, sans 13/500, primary uses `--accent-primary-deep` |
| `Panel` | 1px hairline border + 8px radius, panel-head with title + sub + actions, no shadow |
| `StatTile` | 2px tone-coloured left bar, 28/700 mono number, optional sparkline at bottom-right |
| `MetricRow` | 44px label / 1fr bar / 64px value / 92px sparkline grid |
| `RoleMark` | 30×30 tinted square, 2-letter mono monogram, host role colour-coded |
| `StatePill` | Mono uppercase with leading dot, tone-tinted background + border |
| `Pulse` | Solid 8px dot + glow scaling 0.6→1.6, 1.6s ease-out infinite — live indicator only |
