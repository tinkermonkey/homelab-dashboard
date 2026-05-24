# UX Refresh Plan: Heimdall Design System Update

**Status:** Planning Phase  
**Target:** Eliminate `@tinkermonkey/heimdall-ui` package entirely; implement all UI from local Heimdall Design System v2  
**Primary Change:** Cyan accent → Amber accent, full token system overhaul  
**Scope:** Complete visual refresh of shell, canvas, and all components

---

## Executive Summary

This plan outlines the migration from the current implementation using the `@tinkermonkey/heimdall-ui` package to the latest Heimdall Design System v2 with amber accent, refined color palette, and comprehensive local component library. The design reference (`design/`) is the canonical source of truth for every component, CSS class, and token — all implementation must derive directly from it.

**Critical finding:** None of the complex package components (GraphCanvas, TopologyNode, GraphInspector, PieChart, ActivityTimeline) actually appear in the v2 design. The topology view is a pure React/CSS/SVG implementation with absolutely-positioned bot cards; the network view uses simple bar rows and event lists. All package dependencies can and should be removed.

### Core Changes
- **Accent color**: `#22D3EE` (cyan) → `#FBBF24` (amber, `--accent-primary`)
- **Shell backgrounds**: dark navy family → `#0F1729` / `#13203A`
- **Canvas backgrounds**: `#14191F` (dark) / `#FFFFFF` (light default), dark toggled via `body.dark-canvas`
- **Component library**: All imports replaced with local implementations from `design/`
- **Token system**: Import complete CSS token layer from `design/styles/tokens.css` (220+ variables)
- **Typography**: JetBrains Mono for identifiers/eyebrows; Inter for body/buttons/prose
- **Icon system**: Local ICONS map from `design/icons.jsx`, 1.75 stroke, round caps/joins
- **Package removal**: `@tinkermonkey/heimdall-ui` eliminated completely

---

## Phase 1: Foundation & Token Migration

### 1.1 Replace CSS Token System

**Current State:**
- `client/src/styles/heimdall.css` contains a single `@import '@tinkermonkey/heimdall-ui/css'`
- `client/src/styles/globals.css` extends with custom tokens using `rgb(var(--*))` triplet format
- App.tsx applies `dark-canvas` and `density-compact` body classes (correct approach, keep it)

**Target State:**
- Self-hosted Inter (300/400/500/600/700/800/900) and JetBrains Mono (400/500/600) — woff2 files already in `design/styles/fonts/`
- Full token layer from `design/styles/tokens.css` (220+ CSS variables)
- Composition layer from `design/styles/app.css` (shell, canvas, all component classes)
- Zero `rgb(var(--*))` triplet references anywhere

**Tasks:**
1. Copy `design/styles/tokens.css` → `client/src/styles/heimdall-tokens.css`
2. Copy `design/styles/app.css` → `client/src/styles/heimdall-components.css`
3. Copy font directories from `design/styles/fonts/` → `client/public/fonts/`
4. Update font-face `url()` paths in `heimdall-tokens.css` from `fonts/…` to `/fonts/…`
5. Replace `client/src/styles/heimdall.css` content:
   ```css
   /* Heimdall v2 — local token + composition layers */
   @import './heimdall-tokens.css';
   @import './heimdall-components.css';
   ```
6. Audit `globals.css`: remove any `rgb(var(--*))` usages; remove any token definitions that conflict with the new system (duplicated color vars, font vars); keep only project-specific overrides not covered by the design system
7. App layout root class: replace any custom layout flex/grid in `globals.css` with the `.desktop` / `.app-shell` classes from `heimdall-components.css`

**Key token naming differences from old system:**
- Old `--shell-bg` (1 layer) → New: `--shell-bg` + `--shell-bg-2` (two layers)
- Old single `--canvas-bg` → New: `--canvas-bg`, `--canvas-bg-2`, `--canvas-card`, `--canvas-surface`, `--canvas-surface-2`
- Old `--canvas-border` → New: `--canvas-border`, `--canvas-border-2`, `--canvas-border-strong`
- All accent vars renamed: `--accent-primary` (amber), `--accent-primary-hover`, `--accent-primary-deep`

**API Impact:** None

---

### 1.2 Migrate Icon System

**Current State:**
- `client/src/utils/icons.ts` exports `getIconSvgPath()` for SVG path strings
- `client/src/components/shared/Icon.tsx` wraps into an SVG with 1.75 stroke
- Other components import `Icon as HeimdallIcon` from the package — they must switch to the local `Icon`

**Target State:**
- `ICONS` map ported from `design/icons.jsx` (36+ icons)
- Type union `IconName = keyof typeof ICONS` exported
- All filled icons (play, pause, zap, dot, send) handled via per-icon SVG (send uses `fill="currentColor"` and `stroke="none"` on polygon; dot has `fill="currentColor"` on circle)
- All `HeimdallIcon` imports replaced with local `Icon`
- `App.tsx` icon mapping table (`iconMap`) removed — use actual design icon names directly

**Tasks:**
1. Update `client/src/utils/icons.ts`:
   - Port the `ICONS` object verbatim from `design/icons.jsx`
   - Export `IconName = keyof typeof ICONS`
   - Keep `getIconSvgPath()` pointing at `ICONS` for backward compat
2. Update `Icon.tsx`:
   - Accept `name: IconName` (not generic string)
   - Keep 1.75 stroke, round caps/joins, `currentColor` — these are already correct
3. In `App.tsx`, remove the `iconMap` translation table; map route icons directly to the correct ICONS key names (e.g. `'cpu'`, `'layers'`, `'network'` etc.)
4. Grep all files for `HeimdallIcon` → replace with local `Icon`

**API Impact:** None

---

## Phase 2: Component Library Migration

### 2.1 Create Local Design System Components

**Strategy:** Replace ALL `@tinkermonkey/heimdall-ui` imports with local implementations. The design reference shows that complex package components like `GraphCanvas`, `PieChart`, and `ActivityTimeline` are NOT used in the v2 design — they are replaced by purpose-built CSS/SVG implementations. The entire package can be eliminated.

#### Component Inventory & Migration Tasks

| Component | Current Import | Target Location | Design Ref | Priority |
|-----------|---------------|-----------------|------------|----------|
| **Chip** | `@tinkermonkey/heimdall-ui` | `client/src/components/shared/Chip.tsx` | `design/components.jsx` | P0 |
| **Button** | `@tinkermonkey/heimdall-ui` | `client/src/components/shared/Button.tsx` | `design/components.jsx` | P0 |
| **Panel** | `@tinkermonkey/heimdall-ui` | `client/src/components/shared/Panel.tsx` | `design/components.jsx` | P0 |
| **StatTile** | `@tinkermonkey/heimdall-ui` | `client/src/components/shared/StatTile.tsx` | `design/components.jsx` | P0 |
| **StatGrid** | `@tinkermonkey/heimdall-ui` | `client/src/components/shared/StatGrid.tsx` | `design/view-overview.jsx` | P0 |
| **MetricRow** | `@tinkermonkey/heimdall-ui` | `client/src/components/shared/MetricRow.tsx` | `design/components.jsx` | P0 |
| **Pulse** | Missing | `client/src/components/shared/Pulse.tsx` | `design/components.jsx` | P0 |
| **RoleMark** | Missing | `client/src/components/shared/RoleMark.tsx` | `design/components.jsx` | P0 |
| **StatePill** | Missing | `client/src/components/shared/StatePill.tsx` | `design/components.jsx` | P0 |
| **MiniBadge** | Missing | `client/src/components/shared/MiniBadge.tsx` | `design/components.jsx` | P0 |
| **IdTag** | Missing | `client/src/components/shared/IdTag.tsx` | `design/components.jsx` | P0 |
| **PageHeader** | `@tinkermonkey/heimdall-ui` | `client/src/components/shared/PageHeader.tsx` | `design/view-overview.jsx` → `PageHead` | P0 |
| **Spark** | Missing | `client/src/components/shared/charts/Spark.tsx` | `design/charts.jsx` | P0 |
| **Tabs** | Missing (TabBarWithIcons exists) | `client/src/components/shared/Tabs.tsx` | `design/styles/app.css` `.tabs`/`.tab` | P0 |
| **AlertStrip** | `@tinkermonkey/heimdall-ui` | `client/src/components/shared/AlertStrip.tsx` | `design/view-overview.jsx` → `.alerts-strip` | P1 |
| **AreaChart** | Missing | `client/src/components/shared/charts/AreaChart.tsx` | `design/charts.jsx` | P1 |
| **ProgressBar** | `@tinkermonkey/heimdall-ui` | inline via `.bar-track`/`.bar-fill` | `design/styles/app.css` | P1 |
| **Table** | `@tinkermonkey/heimdall-ui` | inline via `.tbl` HTML | `design/view-containers.jsx` | P1 |
| **SearchInput** | Missing | `client/src/components/shared/SearchInput.tsx` | `design/styles/app.css` `.search-input` | P1 |
| **SubsystemStrip** | Missing | `client/src/components/network/SubsystemStrip.tsx` | `design/view-network.jsx` | P1 |
| **TopTalkersPanel** | Missing | `client/src/components/network/TopTalkersPanel.tsx` | `design/view-network.jsx` | P1 |
| **NetworkEventsPanel** | `ActivityTimeline` (package) | `client/src/components/network/NetworkEventsPanel.tsx` | `design/view-network.jsx` → `.evt-row` | P1 |
| **ClientBreakdownPanel** | `PieChart` (package) | `client/src/components/network/ClientBreakdownPanel.tsx` | `design/view-network.jsx` → `.talker-bar` | P1 |
| **BotCard** | Missing | `client/src/components/topology/BotCard.tsx` | `design/view-topology.jsx` | P1 |
| **EdgeLayer** | Missing | `client/src/components/topology/EdgeLayer.tsx` | `design/view-topology.jsx` | P1 |
| **TopologyInspector** | `GraphInspector` (package) | `client/src/components/topology/TopologyInspector.tsx` | `design/view-topology.jsx` | P1 |
| **ChatRail (full)** | `ChatContainer` + 5 others (package) | `client/src/components/chat/ChatRail.tsx` | `design/chat.jsx` | P0 |

**Eliminated package components (not used in v2 design):**
- `GraphCanvas` — replaced by custom `BotCard` layout + `EdgeLayer` SVG
- `TopologyNode` — replaced by `BotCard` absolute-positioned components
- `GraphInspector` — replaced by custom `TopologyInspector`
- `PieChart` — replaced by simple bar-row layout in `ClientBreakdownPanel`
- `ActivityTimeline` — replaced by `.evt-row` list in `NetworkEventsPanel`
- `FilterBar` — replaced by `.toolbar` + `.search-input` + `Chip` pattern

---

### 2.2 Component Implementation Details

#### **Chip** (`client/src/components/shared/Chip.tsx`)
```tsx
interface ChipProps {
  tone?: 'cyan' | 'emerald' | 'amber' | 'violet' | 'rose' | 'neutral';
  mono?: boolean;
  dot?: boolean;
  children: React.ReactNode;
}

// Styles in heimdall-components.css: .chip .chip.cyan .chip.mono etc.
// Reference: design/components.jsx → Chip
```

**CSS Classes:**
- Base: `.chip`
- Tones: `.chip.cyan`, `.chip.emerald`, `.chip.amber`, `.chip.violet`, `.chip.rose`
- Modifiers: `.chip.mono`
- Dot: `.chip .dot` (6px circle, currentColor)

---

#### **Button** (`client/src/components/shared/Button.tsx`)
```tsx
interface ButtonProps {
  variant?: 'default' | 'primary' | 'ghost';
  size?: 'default' | 'sm';
  icon?: IconName;
  children?: React.ReactNode;
  onClick?: () => void;
}

// Styles in heimdall-components.css: .btn .btn.primary .btn.ghost .btn.sm
// Reference: design/components.jsx → Button
```

**CSS Classes:**
- Base: `.btn`
- Variants: `.btn.primary`, `.btn.ghost`
- Size: `.btn.sm`
- Icon-only: `.btn.iconbtn`

---

#### **Panel** (`client/src/components/shared/Panel.tsx`)
```tsx
interface PanelProps {
  title?: string;
  sub?: string;
  eyebrow?: string;
  icon?: IconName;
  actions?: React.ReactNode;
  children: React.ReactNode;
  flush?: boolean;
}

// Styles: .panel .panel-head .panel-title .panel-body .panel-body.flush
// Reference: design/components.jsx → Panel
```

**Structure:**
- `.panel` → card container (border, radius-lg)
- `.panel-head` → optional header with title/sub/actions
- `.panel-title` → icon + text + `.panel-sub` (mono, muted)
- `.panel-body` → content area (padding 14px or flush=0)

---

#### **StatTile** (`client/src/components/shared/StatTile.tsx`)
```tsx
interface StatTileProps {
  tone?: 'cyan' | 'violet' | 'emerald' | 'amber' | 'rose';
  label: string;
  value: string | number;
  unit?: string;
  meta?: string;
  sparkValues?: number[];
}

// Styles: .stat .stat[data-color="cyan"] .stat .label .stat .num .stat .meta
// Reference: design/components.jsx → StatTile
```

**Features:**
- 2px left border in tone color
- 28px/700 sans number (tabular nums)
- Optional sparkline at bottom-right (position: absolute)
- Mono eyebrow label (10.5px, 0.08em tracking, uppercase)

---

#### **MetricRow** (`client/src/components/shared/MetricRow.tsx`)
```tsx
interface MetricRowProps {
  metric: string; // "CPU" | "MEM" | "DISK" | "NET" | "GPU"
  v: number; // percentage or value
  value: string; // formatted display value
  hist: number[]; // sparkline history
  scale?: (x: number) => number; // optional scale function
}

// Styles: .metric-row .mk .bar-track .bar-fill .mv
// Reference: design/components.jsx → MetricRow + metricTone()
```

**Tone Logic (from design):**
```ts
function metricTone(metric: string, v: number) {
  if (metric === 'CPU') return v >= 85 ? 'rose' : v >= 75 ? 'amber' : 'cyan';
  if (metric === 'MEM') return v >= 90 ? 'rose' : v >= 78 ? 'amber' : 'violet';
  if (metric === 'DISK') return v >= 92 ? 'rose' : v >= 85 ? 'amber' : 'emerald';
  if (metric === 'NET') return 'cyan';
  if (metric === 'GPU') return v >= 90 ? 'rose' : 'amber';
  return 'cyan';
}
```

**Layout:**
- 44px label | 1fr bar | 64px value | 92px sparkline
- Grid with gap: 12px
- Bar: 6px height, full-radius track, tone-colored fill

---

#### **RoleMark** (`client/src/components/shared/RoleMark.tsx`)
```tsx
interface RoleMarkProps {
  role: 'compute' | 'storage' | 'k8s' | 'gpu';
  mark: string; // 2-letter monogram (e.g., "NY", "HE")
  size?: 'md' | 'lg';
}

// Styles: .role-mark .role-mark[data-role="compute"] .role-mark.lg
// Reference: design/components.jsx → RoleMark
```

**Design:**
- 30×30 (md) or 40×40 (lg) rounded square
- Mono 11.5px/700 (md) or 13px (lg)
- Role-specific background/border colors:
  - compute: cyan tint
  - storage: emerald tint
  - k8s: violet tint
  - gpu: amber tint

---

#### **StatePill** (`client/src/components/shared/StatePill.tsx`)
```tsx
interface StatePillProps {
  s: 'running' | 'degraded' | 'failed' | 'updating' | 'stopped';
}

// Styles: .state-pill .state-pill[data-s="running"] .state-pill .dot
// Reference: design/components.jsx → StatePill
```

**Design:**
- Mono uppercase label with leading 5px dot (currentColor)
- Tone-tinted bg + border (translucent)
- State colors: running=emerald, degraded/warn=amber, failed=rose, updating=cyan, stopped=neutral
- `data-s` attribute drives CSS targeting (not className)

**Dark canvas overrides required:**
- `[data-s="running"]` → `color: var(--semantic-emerald-fg)`
- `[data-s="degraded"]` → `color: var(--accent-primary)` (amber)
- `[data-s="failed"]` → `color: var(--semantic-rose-fg)`
- `[data-s="updating"]` → `color: var(--semantic-cyan-fg)`

---

#### **MiniBadge** (`client/src/components/shared/MiniBadge.tsx`)
```tsx
interface MiniBadgeProps {
  s: 'running' | 'healthy' | 'degraded' | 'unhealthy' | 'exited' | 'updating' | 'pulling' | 'failed';
}

// Styles: .mini-badge .mini-badge[data-s="running"]
// Reference: design/components.jsx → MiniBadge
```

**Design:**
- Inline badge (no dot), used in container rows for state+health
- Mono 9px, 0.10em tracking, uppercase, padding 1px 6px
- `data-s` attribute drives CSS targeting (not className)
- States: running=emerald, healthy=emerald, exited=neutral, updating=cyan, pulling=cyan, unhealthy=rose, failed=rose, degraded=amber

**Dark canvas overrides required:**
- running/healthy → `color: var(--semantic-emerald-fg)`
- unhealthy/failed → `color: var(--semantic-rose-fg)`
- degraded → `color: var(--accent-primary)` (amber)
- updating/pulling → `color: var(--semantic-cyan-fg)`

---

#### **Pulse** (`client/src/components/shared/Pulse.tsx`)
```tsx
interface PulseProps {
  tone?: 'emerald' | 'amber' | 'rose' | 'cyan' | 'neutral';
  size?: 'xs' | 'sm' | 'md';
}

// Styles: .pulse .pulse.emerald .pulse.sm .pulse.xs .pulse.neutral
// Animation: @keyframes pulse-out, 1.6s ease-out infinite
// Reference: design/components.jsx → Pulse
```

**Design:**
- Solid dot + `::before` glow that scales/fades outward
- Only continuous animation in the entire system — used exclusively for live indicators
- Sizes: xs=6px, sm=8px, md=10px
- `tone='neutral'`: no animation (gray dot only, used for idle bots)

**CSS (exact from app.css — use this verbatim):**
```css
.pulse {
  position: relative;
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--status-ok);
  flex-shrink: 0;
}
.pulse::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: inherit;
  opacity: 0.5;
  animation: pulse-out 1.6s ease-out infinite;
}
.pulse.neutral { background: var(--canvas-fg-4); }
.pulse.neutral::before { display: none; }
.pulse.emerald { background: var(--status-emerald); }
.pulse.amber   { background: var(--status-amber); }
.pulse.rose    { background: var(--status-rose); }
.pulse.cyan    { background: var(--status-cyan); }
.pulse.sm { width: 8px;  height: 8px; }
.pulse.xs { width: 6px;  height: 6px; }
.pulse.md { width: 10px; height: 10px; }
@keyframes pulse-out {
  0%   { transform: scale(0.6); opacity: 0.55; }
  100% { transform: scale(1.6); opacity: 0; }
}
```

---

#### **Tabs** (`client/src/components/shared/Tabs.tsx`) — NEW COMPONENT
```tsx
interface Tab {
  id: string;
  label: string;
  count?: number;
  icon?: IconName;
}
interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}

// Styles: .tabs .tab .tab.active .tab .count .tab.active::after
// Reference: design/styles/app.css — Tabs section
```

**Design:**
- Horizontal flex row with `gap: 18px`, bottom border
- Active tab: `color: var(--canvas-fg-1)` + 2px amber bottom bar (`var(--accent-primary)`) via `::after`
- Inactive: `color: var(--canvas-fg-3)`, no underline
- Count chip: `.tab .count` — gray on inactive, amber-tinted on active
- `tab.active .count` → `background: rgba(251,191,36,0.10)`, `color: var(--accent-primary-deep)`
- Dark canvas override: `tab.active .count { color: var(--accent-primary) }`
- Replace existing `TabBarWithIcons.tsx` entirely

---

#### **SearchInput** (`client/src/components/shared/SearchInput.tsx`) — NEW COMPONENT
```tsx
interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minWidth?: number; // default 280
}

// Styles: .search-input .search-input:focus-within .search-input input
// Reference: design/styles/app.css — Container rows section
```

**Design:**
- Flex row with search icon + `<input>` + optional kbd shortcut
- `focus-within` → amber border + `var(--focus-ring)` shadow
- Input is transparent, inherits font from parent
- Used inside `.toolbar` alongside host `Chip` filters

---

#### **Spark** (`client/src/components/shared/charts/Spark.tsx`)
```tsx
interface SparkProps {
  values: number[];
  w?: number; // default 92
  h?: number; // default 20
  tone?: 'cyan' | 'emerald' | 'amber' | 'violet' | 'rose';
}

// Reference: design/charts.jsx → Spark + sparkPaths()
```

**Implementation:**
- Pure SVG, no external library
- Auto-scales to min/max with padding
- Filled area (12% opacity) + stroke (1.25px)
- Helper: `sparkPaths(values, w, h, padY)` → `{ line, area }`

---

#### **AreaChart** (`client/src/components/shared/charts/AreaChart.tsx`)
```tsx
interface AreaChartProps {
  values: number[];
  h?: number; // default 72
  color?: string; // CSS var or hex
  dashed?: boolean;
  secondValues?: number[]; // optional overlay series
  secondColor?: string;
}

// Reference: design/charts.jsx → AreaChart
```

**Features:**
- Fixed width 480px, height configurable
- Grid lines at 25%, 50%, 75%
- Axis labels: "-24h" (left), "now" (right)
- Supports dual series (solid + dashed overlay)

---

#### **PageHeader** (`client/src/components/shared/PageHeader.tsx`)
```tsx
interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  idChip?: string; // renders as IdTag
  actions?: React.ReactNode;
}

// Styles: .page-head .page-head-l .head-meta-row .subtitle .page-actions
// Reference: design/view-overview.jsx → PageHead
```

**Structure:**
- `.page-head` flex container
- `.page-head-l` (left): eyebrow, title+idTag, subtitle
- `.page-actions` (right): buttons

---

### 2.3 Replace All Package Imports

**Grep Pattern:** Search for `@tinkermonkey/heimdall-ui` across `client/src/`

**Files to Update (19 matches total):**
1. `client/src/App.tsx` — `ShellLayout`, `Icon as HeimdallIcon`, `IconName` type → build shell inline, use local Icon
2. `client/src/components/shell/Statusbar.tsx` — `Icon as HeimdallIcon` → local Icon
3. `client/src/components/overview/OverviewView.tsx` — `AlertStrip`, `PageHeader`, `StatGrid`, `StatTile` → all local
4. `client/src/components/overview/ServerCard.tsx` — `MetricRow`, `StatusColor` type → local
5. `client/src/components/overview/GatewayPanel.tsx` — `ProgressBar` → inline `.bar-track` / `.bar-fill`
6. `client/src/components/topology/TopologyView.tsx` — `GraphCanvas`, `GraphInspector`, `TopologyNode`, `PageHeader`, `GraphNodeData`, `GraphEdgeData` → ALL REPLACE with local BotCard/EdgeLayer/TopologyInspector/PageHeader
7. `client/src/components/containers/ContainersView.tsx` — `PageHeader` → local
8. `client/src/components/containers/HostFilterBar.tsx` — `FilterBar`, `Chip`, `FilterChip` type → local `.toolbar` + `SearchInput` + local `Chip`
9. `client/src/components/containers/TabBarWithIcons.tsx` — `Chip` → delete file, replaced by `Tabs` component
10. `client/src/components/network/NetworkView.tsx` — `PageHeader` → local
11. `client/src/components/network/ClientBreakdownPanel.tsx` — `PieChart`, `Table`, `Column` type → local bar rows + `.tbl` HTML table
12. `client/src/components/network/GatewayHealthPanel.tsx` — `ProgressBar` → inline `.bar-track`
13. `client/src/components/network/NetworkEventsPanel.tsx` — `ActivityTimeline` → local `.evt-row` list
14. `client/src/components/shared/DegradationBanner.tsx` — `AlertStrip`, `Alert` type → local
15. `client/src/components/chat/ChatRail.tsx` — `ChatContainer`, `ChatMessage`, `ChatComposer`, `ChatDivider`, `ChatSuggestions`, `ToolBlockData`, `ThinkingBlockData`, `BotTab` (8 imports) → complete reimplementation from `design/chat.jsx`
16. `client/src/components/chat/ChatRail.test.tsx` — Mock setup → update to mock local components
17. `client/src/styles/heimdall.css` — `@import '@tinkermonkey/heimdall-ui/css'` → local token imports

**Priority order:**
1. P0 first: Token CSS, Icon, Shell, PageHeader, Chip, Panel, StatTile, MetricRow, Pulse, Tabs, ChatRail
2. P1 next: AlertStrip, Spark, AreaChart, HostFilterBar, SearchInput, network panels, topology panels
3. All remaining in cleanup pass

---

## Phase 3: Shell & Layout Refresh

### 3.1 Update App Shell Structure

**Current State:**
- `App.tsx` imports `ShellLayout` from package, passes all shell structure as props
- Shell components: `CommandPalette.tsx` exists (keep it), `Statusbar.tsx` exists (needs update)
- Nav items are flat (no hierarchical nav tree)

**Target State:**

**CSS Layout (from `heimdall-components.css`):**
```css
/* Outer frame */
.desktop { position: relative; height: 100vh; display: flex; flex-direction: column; background: var(--shell-bg); }

/* Three-column shell row: [sidebar] [workspace] [chat] */
.app-shell {
  flex: 1;
  display: grid;
  grid-template-columns: var(--rail-w, 256px) minmax(0, 1fr) var(--chat-w, 0px);
  min-height: 0;
}
.app-shell.no-chat  { --chat-w: 0px; }
.app-shell.with-chat { --chat-w: 380px; }
.shell-rail.collapsed { --rail-w: 64px; }

/* Workspace column: [topbar] [canvas-area] [statusbar] */
.workspace { display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
.canvas-area { flex: 1; overflow: auto; background: var(--canvas-bg); padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
```

**App.tsx restructure:**
```tsx
// Remove ShellLayout import
// Build shell inline:
<div className="desktop">
  <div className={`app-shell ${chatVisible ? 'with-chat' : 'no-chat'}`}>
    <Sidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} ... />
    <div className="workspace">
      <Topbar ... />
      <main className="canvas-area">
        <Routes>...</Routes>
      </main>
      <Statusbar ... />
    </div>
    {chatVisible && <ChatRail ... />}
  </div>
</div>
```

**Tasks:**
1. Create `client/src/components/shell/Sidebar.tsx` from `design/shell.jsx`
2. Create `client/src/components/shell/Topbar.tsx` from `design/shell.jsx`
3. Update `client/src/components/shell/Statusbar.tsx` (see 3.2)
4. Update `App.tsx` to compose shell inline — no `ShellLayout` import
5. Migrate hierarchical `NAV_TREE` (from `design/shell.jsx`):
   - Top-level: overview, servers (nyx/helios/aether/vega children), containers (list/networks/volumes), network, applications (count badge), storage (size badge), bots (4 bot children), topology, logs, configuration
   - **Important:** The last nav item is `"Configuration"` (not "Settings"). `"Applications"` uses its full word (not "Apps") and shows a count badge (`28`). `"Storage"` shows a capacity badge (`90 TB`) not a container count. `"Topology"` is a **top-level** item, NOT nested under Bots.
   - `nav-item.active-parent` for items with active children
   - `.nav-sub` for children (dashed left border, mono labels, 12px)
   - `nav-sub .nav-item.active .nav-count { color: var(--accent-primary) }`
6. Implement sidebar collapse behavior (CSS handles most via `.shell-rail.collapsed` class)

**Sidebar sub-components:**

*Brand row* (`.brand-row`):
- `.brand-mark` — 28×28 amber-gradient rounded square with 3 dot pseudo-elements
- `.brand-name` — "asgard" bold + `<span>` "HOMELAB · V3.2" uppercase mono muted (design shows asgard as the primary name, cluster name in all-caps)

*Nav section* (`.nav-section`):
- `.nav-eyebrow` — section label (hidden in collapsed)
- `.nav-item` — icon + label + optional count
- `.nav-item.active::before` — 2px amber left bar (top 5px, bottom 5px)
- `.nav-sub` — indented children sub-list

*Rail footer* (`.rail-footer`):
- `.rail-user` — avatar + user info (hidden in collapsed)
- `.avatar` — 28×28 amber-gradient, mono "YN" text
- `.rail-user-info` — name ("you") + detail line ("ssh · main")

**Topbar sub-components** (from `design/shell.jsx`):
- `.workspace-row` — flex row containing all topbar elements
- `.ws-chip` — workspace selector: amber dot + "asgard" + chevron, `background: var(--shell-surface)`
- `.crumbs` — breadcrumb nav: mono slashes + italic labels
- `.topbar-palette` — `⌘K` keyboard shortcut button (opens CommandPalette — keep existing `CommandPalette.tsx`)
- `.topbar-ico` — 30×30 icon buttons (bell with `.ind` alert dot, refresh, **activity/history**, **favorites**, bot-console toggle)
  - **Activity button**: history/clock icon — opens an activity/audit log view (not yet implemented in design; reserve slot)
  - **Favorites button**: thumbs-up or bookmark icon — not fully implemented in design; reserve slot
- `.topbar-ico.active` — filled background when active (e.g., chat toggle)
- `.env-pill` — "main" branch label, amber-tinted background, amber text

---

### 3.2 Update Statusbar

**Current State:**
- `client/src/components/shell/Statusbar.tsx` exists with `useStatusbarContent()` hook
- Uses HeimdallIcon from package

**Target State (from `design/shell.jsx` Statusbar):**

Left side (`sb-left`):
- `Pulse` (emerald) + "prometheus:9090" link
- `·` separator + host count (`4 hosts`), app count (`28 apps`), container count (`47 containers`)
- `Pulse` (amber) + alert count + specific alert message inline (e.g., `"● 2 alerts open · aether MEM 81%"`) — alert text shows the top alert description, not just count

Right side (`sb-right`):
- Four `sb-item` entries: `ping NNN ms`, `↓NNN ↑NNN Mbps`, `cluster cpu NN%`, `synced NNs ago`
  - Note: Statusbar uses lowercase labels in design (e.g., `"ping 12 ms"`, `"cluster cpu 25%"`, `"synced 6s ago"`) — no uppercase `PING/NET/CPU/SYNC` eyebrows; values are inline
- Each has a `.strong` span for the live value
- All in mono 11px, `var(--shell-fg-2)` / `.strong { color: var(--shell-fg-1) }`

**Note:** There is NO dark canvas toggle in the statusbar in the design — this is handled by a dev-only tweaks panel (`design/tweaks.jsx`). In production, dark canvas defaults to `true` on initial render; the density toggle may be exposed in a settings popover.

**Tasks:**
1. Replace `HeimdallIcon` import with local `Icon`
2. Rewrite statusbar content to match design layout
3. Implement `~2.2s` polling for PING/NET/CPU (creates "liveness feel")
4. Wire up real data from server API where available; use `useStatusbarContent()` hook or inline

---

### 3.3 Chat Rail Full Reimplementation

**Current State:**
- `client/src/components/chat/ChatRail.tsx` — imports `ChatContainer`, `ChatMessage as HeimdallChatMessage`, `ChatComposer as HeimdallChatComposer`, `ChatDivider`, `ChatSuggestions`, `ToolBlockData`, `ThinkingBlockData`, `BotTab` from package (8 imports)
- `useChatStream` hook is local — keep it
- `DOMPurify` is used for safe HTML — keep it

**Target State (from `design/chat.jsx` + `design/styles/app.css`):**

This is a complete reimplementation using local CSS classes only.

**Structure:**
```tsx
<aside className="bot-console">
  <header className="bc-head">
    <Pulse tone="emerald" size="sm" />
    <div className="info">
      <div className="t">Bot console</div>
      <div className="s">4 bots · one-click delegate · ⌘⏎</div>
    </div>
    <div className="actions">
      <button className="bc-ico"><Icon name="history" size={13} /></button>
      <button className="bc-ico"><Icon name="settings" size={13} /></button>
      <button className="bc-ico" onClick={onClose}><Icon name="x" size={13} /></button>
    </div>
  </header>
  <div className="bc-tabs"> {/* 4-column grid per-bot */}
    {bots.map(b => <button className={`bc-tab ${active === b.id ? 'active' : ''}`}>
      <span className="n"><BotAvatarMini id={b.id} />{b.label}</span>
      <span className="r">{b.role}</span>
    </button>)}
  </div>
  <div className="bc-thread"> {/* scrollable message list */}
    {thread.map(m => m.kind === 'divider'
      ? <div className="bc-divider">{m.label}</div>
      : <BotMessage m={m} />
    )}
  </div>
  <ChatComposer /> {/* keep existing useChatStream-wired composer */}
</aside>
```

**BotMessage sub-components:**
- `.bc-msg` — 2-col grid (26px avatar + content)
- `.bc-msg.user` — user variant (avatar uses `.shell-surface` bg)
- `.av.bot-avatar[data-id]` — gradient avatar (see bot avatar gradients below)
- `.bc-meta` — name + badge (role label) + when timestamp
- `.bc-body` — prose with `<code>` inline chips (amber accent)
- `.bc-tool` — tool output block:
  - `.bc-tool-head`: zap icon + tool name + `.ok` (success status)
  - `.bc-tool-body`: mono key/value lines, `.add { color: var(--status-emerald) }`, `.del { color: var(--status-rose) }`
- `.bc-sugs` — suggestion chips row: `.bc-sug` buttons (arrow icon + text)

**Bot avatar gradients (design exception — 4 hardcoded values allowed):**
```css
.bot-avatar[data-id="lab-bot"]   { background: linear-gradient(135deg, #C4B5FD, #6D28D9); color: #FFFFFF; }
.bot-avatar[data-id="ops-bot"]   { background: linear-gradient(135deg, #FBBF24, #B45309); color: #29220A; }
.bot-avatar[data-id="watch-bot"] { background: linear-gradient(135deg, #FCD34D, #D97706); color: #29220A; }
.bot-avatar[data-id="sync-bot"]  { background: linear-gradient(135deg, #6EE7B7, #047857); color: #062A1F; }
```

**Tasks:**
1. Delete all `@tinkermonkey/heimdall-ui` imports from ChatRail.tsx
2. Rewrite JSX structure to use `.bot-console`, `.bc-head`, `.bc-tabs`, `.bc-thread` from design
3. Implement `BotMessage` sub-component (inline in ChatRail.tsx)
4. Add `.bc-tool` block rendering (key/value lines, `.add`/`.del` spans for diff highlighting)
5. Add `.bc-sugs` suggestion chip rendering (clicks prepopulate composer)
6. Keep `useChatStream` hook wiring (send, draft, setDraft unchanged)
7. Keep DOMPurify for `dangerouslySetInnerHTML` sanitization in `.bc-body` (security requirement)
8. Update `ChatRail.test.tsx` to mock local structure instead of package components

---

## Phase 4: View-Specific Migrations

### 4.1 Overview View (`/cluster/overview`)

**Reference:** `design/view-overview.jsx`

**Components:**
- `PageHead` → local `PageHeader`
- `StatGrid` (4 cols) → `StatTile` × 4
- `AlertsStrip` → local `.alerts-strip` component
- `ServerCard` (2-col grid) → `.server-card` with RoleMark + MetricRow components
- `GatewayPanel` → `.gw-split` layout with AreaChart
- `AppsPanel` → category chip filter + apps-grid + AppCell

**Tasks:**
1. Update `OverviewView.tsx` — replace all package imports with local components
2. Replace `StatTile` with local implementation; pass `sparkValues` for mini sparklines
3. Update `ServerCard.tsx`:
   - Add `RoleMark` (30×30, role-colored — replaces any existing icon approach)
   - Update `.metric-row` grid: `44px 1fr 64px 92px` (label | bar | value | spark)
   - Add `.server-foot` 4-cell grid: model, temp, load avg, container count
   - Add `Pulse` indicator next to hostname in `.server-name`
   - Replace `MetricRow` package import with local `MetricRow`
   - Apply `metricTone()` logic for bar colors
4. Update `GatewayPanel.tsx` (Overview version — simpler than Network version):
   - Implement `.gw-split` two-column layout (left=KV details, right=ONE area chart)
   - **Overview gateway panel**: single `AreaChart` showing LATENCY · 24H (amber). There is NO throughput chart in the Overview gateway panel.
   - Bottom stat row: 3 cells — INGRESS TODAY / EGRESS TODAY / DNS · PIHOLE (no "clients" or "uptime" cell)
   - KV fields visible: PUBLIC IP, GEO, WAN IFACE, PING, LOSS 24H
   - **Network view gateway panel** (`GatewayHealthPanel.tsx`): has TWO stacked area charts — THROUGHPUT · 24H (dual-color: cyan + violet for down/up) stacked above LATENCY · 24H (amber single-color)
   - Replace `ProgressBar` package import with inline bar markup
5. Rewrite `AppsSection.tsx`:
   - Add `.cat-chips` filter bar (`.cat-chip.active` → amber-tinted)
   - Add `.apps-stat-row` count summary with `Pulse` dots
   - Add `.apps-grid` (**3-col CSS grid**, NOT 4-col — confirmed in design) with `.app-cell[data-host]` items:
     - Left 2px border tint by host (nyx=cyan, helios=emerald, aether=violet, vega=amber)
     - `.app-mark` — 26×26 mono badge
     - `.app-body` — name + meta line
     - `StatePill` for status
6. Update `AlertStrip` local component to match `.alerts-strip` design:
   - `.alert-glyph` (amber box with warning icon)
   - `.alerts-list` with `.alert-row` entries + `.sev-badge` / `.sev-badge.info`
   - `.ack` button (acknowledge/dismiss)
   - **"Open in watch-bot"** action button at the right of the alert strip header — not just `.ack`; there is also a shortcut CTA to open the alert in the watch-bot chat

**Page Header extras (Overview):**
- The page header actions include a **"Ask lab-bot"** CTA button (in addition to Refresh) — primary amber-styled button that opens/focuses the bot console and pre-populates with a cluster summary prompt

**API Expansions Needed:**
- Gateway: `downHist: number[]`, `upHist: number[]`, `pingHist: number[]` (24h time series)
- Servers: `model: string`, `temp: string`, `load: string`, `containers: number`
- Apps: `cat: string`, `version: string`, `meta: string`, `host: string`

---

### 4.2 Containers View (`/cluster/containers`)

**Reference:** `design/view-containers.jsx`

**Components:**
- `PageHeader` (local)
- `.toolbar` + `SearchInput` + host `Chip` filters → replaces `HostFilterBar` + package `FilterBar`
- `Tabs` component → replaces `TabBarWithIcons`
- `HostContainersPanel` → `.host-row` with `RoleMark` + `ContainerRow` list
- `HostNetworksPanel` → `.host-row` with `.tbl` table
- `HostVolumesPanel` → `.host-row` with `.tbl` table

**Containers page header extras:**
- Eyebrow: violet chip `"docker · 4 hosts"` + subtitle text `"scraped via docker socket · every 30 s"`
- IdTag: `/cluster/asgard/docker` (not just the sub-route)
- Page header actions: **"Refresh"** + **"Compose up…"** (amber or primary-styled) — the "Compose up…" action opens a compose stack launch dialog; must be documented and implemented

**Tasks:**
1. Update `ContainersView.tsx` — replace `PageHeader` package import with local
2. Rewrite `HostFilterBar.tsx`:
   - Delete package imports (`FilterBar`, `Chip`, `FilterChip` type)
   - Implement `.toolbar` flex row with:
     - `SearchInput` component (`.search-input` + amber focus ring; placeholder: `"Filter by name, image, or tag…"`)
     - Host `Chip` filters: `"all hosts (31)"`, `"nyx (8)"` etc. — format is `"label (count)"` in parens
     - Chip toggles active host filter state
3. Delete `TabBarWithIcons.tsx`; replace usages with new `Tabs` component:
   - Tabs format: `"Containers 28/31"` (running/total) | `"Networks 13"` | `"Volumes 15"` — each tab has an **icon** AND the count in `running/total` format for containers
   - Active tab gets amber underline + amber-tinted count chip
4. Rewrite `ContainerRow.tsx`:
   - Grid: `18px 240px 1fr 140px` (dot | name/image | detail | stats)
   - Col 1: `.ctn-dot[data-s]` — 8px circle (emerald=running, gray=exited, cyan=updating)
   - Col 2: `.ctn-name` (mono bold) + `.ctn-id` (10px muted) + `.ctn-image` with `.tag` (amber) + `.ctn-badges` (MiniBadge)
   - Col 3: `.ctn-detail` with `.ctn-detail-row` entries (key=56px, pills=1fr):
     - Port pills (`.port-pill`) — cyan-tinted background + cyan text
     - Mount pills (`.mount-pill`) — `.typ.B` (bind, violet-tinted) / `.typ.V` (volume, amber-tinted) type badges; the `RO` flag appears **inline at the end of the mount path string** within the pill (e.g., `/srv/media → /media RO`), NOT as a separate sibling pill
     - Net pills (`.net-pill`) — colored dot by network name pattern
   - Col 4: `.ctn-stats` — right-aligned mono: uptime, image size, cpu/mem, optional `.gpu` (amber on light, amber on dark)
5. Update `HostContainersPanel.tsx`:
   - Replace any existing host header with `.host-row-head` layout:
     - `RoleMark` (30×30) + `.info` (host name + Docker engine version) + `.summary` count badge
   - Host rows: `host-row + host-row { margin-top: 14px }`
6. Rewrite `HostNetworksPanel.tsx`:
   - `.host-row` wrapper with `.host-row-head`
   - `.tbl` table: Network (`.net-with-dot`), Driver (`.driver-pill` violet-tinted), Subnet, Gateway, Scope, Attached
7. Rewrite `HostVolumesPanel.tsx`:
   - `.host-row` wrapper with `.host-row-head`
   - `.tbl` table: Volume, Driver, Size, Mount, Used By (`.used-by-pill` chips)

**MiniBadge states (containers):**
- State badges: `RUNNING` (emerald), `EXITED` (muted), `RESTARTING` (cyan)
- Health badges: `HEALTHY` (emerald), `UNHEALTHY` (rose), `DEGRADED` (amber) — `DEGRADED` is a distinct health state, not just a generic status
- Both state and health badges can appear together (e.g., `RUNNING` + `DEGRADED`)

**RoleMark colors:** RoleMark color is determined by **role type**, NOT by host identity:
- `compute` → cyan tint
- `storage` → emerald tint
- `k8s` → violet tint
- `gpu` → amber tint
(This corrects an earlier assumption that RoleMark used host color; host chips in the filter bar use host colors, but RoleMark in the host header uses role type)

**API Expansions Needed:**
- Containers: `size: string`, `gpu?: number`, `health?: 'healthy' | 'unhealthy' | 'degraded' | 'starting'`
- Networks: `name`, `driver`, `subnet`, `gateway`, `scope`, `attached` count — per host
- Volumes: `name`, `driver`, `size`, `mount`, `usedBy: string[]` — per host

---

### 4.3 Topology View (`/cluster/topology`)

**Reference:** `design/view-topology.jsx`

**Architecture:** The v2 topology is NOT a graph library — it is a pure React/CSS/SVG implementation with absolute-positioned cards on a styled canvas. All package graph components (`GraphCanvas`, `TopologyNode`, `GraphInspector`, `GraphNodeData`, `GraphEdgeData`) are ELIMINATED.

**Page header:**
- Title: `"Bot topology"` (not just "Topology")
- Eyebrow: violet chip `"topology · 4 bots"` + subtitle `"bots · sidecar mcp servers · managed projects"`
- IdTag: `/cluster/asgard/topology`

**Components:**
- `PageHeader` (local)
- `.topo-stage-wrap` — 2-col grid: stage (1fr) + inspector (330px)
- `.topo-stage` — styled canvas with dot-grid + ambient radial gradients
  - `.topo-host-row` — 4-col header strip with host names + container counts
  - `.topo-canvas` — absolute positioning context for bot cards + edge SVG
- `BotCard` — 230px absolute-positioned card per bot
- `EdgeLayer` — SVG overlay with amber dashed delegation edges + label chips
- `TopologyInspector` — right panel with bot KV details, MCP list, project pills

**Topo stage background (exact CSS — use verbatim):**
```css
/* Light canvas */
.topo-stage {
  background-image:
    radial-gradient(circle at 18% 22%, rgba(251, 191, 36, 0.07), transparent 50%),
    radial-gradient(circle at 82% 78%, rgba(129, 140, 248, 0.08), transparent 50%),
    radial-gradient(circle, rgba(100, 116, 139, 0.20) 1px, transparent 1px);
  background-size: auto, auto, 32px 32px;
}
/* Dark canvas */
body.dark-canvas .topo-stage {
  background-image:
    radial-gradient(circle at 18% 22%, rgba(251, 191, 36, 0.10), transparent 50%),
    radial-gradient(circle at 82% 78%, rgba(129, 140, 248, 0.10), transparent 50%),
    radial-gradient(circle, rgba(148, 163, 184, 0.10) 1px, transparent 1px);
}
```

**BotCard component:**
```tsx
// design/view-topology.jsx → BotCard
// CSS: .bot-card (230px absolute, border, radius-lg)
// .bot-card.selected → amber border + amber glow box-shadow
// Sections inside card:
//   .head — 28px avatar + name/role + Pulse status
//   .desc — description text
//   .model-pill — amber dot + model name
//   .bot-section-eyebrow — "MCP SIDECARS" label + count chip
//   .mcp-pills → .mcp-pill (violet-tinted, dot solid=local / hollow=remote)
//   .bot-section-eyebrow — "DELEGATES TO" + count chip
//   .proj-pills → .proj-pill.delegate (amber-tinted) — pills show OTHER BOT NAMES (not projects)
//   .bot-section-eyebrow — "MANAGES" + count chip
//   .proj-pills → .proj-pill[data-host] (dot tinted by host)
//     .proj-pill .port — port number (muted, separated by border)
// Bot roles (design confirms exact role labels): CONCIERGE, OPS, ALERTS, BACKUP
// Selected card: amber border + amber glow box-shadow (.bot-card.selected)
```

**EdgeLayer (SVG):**
```tsx
// design/view-topology.jsx → EdgeLayer
// Full-canvas SVG (position: absolute, inset: 0, pointer-events: none)
// <defs><marker id="arrowhead"> → path fill="#FBBF24" (amber arrowhead)
// Edges: stroke="#FBBF24", strokeOpacity=0.75, strokeWidth=1.5, strokeDasharray="5 4"
// Cubic bezier paths between bot card anchor points
// Inline label chip at midpoint: amber bg (#FFFBEB), amber border, "DELEGATE" text (uppercase) in mono dark
```

**TopologyInspector component:**
```tsx
// design/view-topology.jsx → TopologyInspector
// CSS: .inspector (card, align-self: start)
// .inspector-head — large avatar (36×36) + bot name + role/host subtitle
// .inspector-section — padded sections with border-bottom dividers
//   Section 1: bot description paragraph
//   Section 2: .kv grid (Model, Host, Status, MCPs, Manages, Delegates)
//   Section 3: "MCP sidecars" list → .mcp-mini per entry
//     .mcp-mini .n — name with dot (solid=local, hollow=remote)
//     .mcp-mini .m — version + kind
//     .mcp-mini .d — description
//   Section 4: "Managed projects" → .proj-pills with .proj-pill[data-host]
//   Section 5: (if delegates) "Delegates to" → .proj-pills with .proj-pill.delegate
```

**Topology legend** (`.topo-legend`, bottom-right of stage):
- Frosted glass panel (backdrop-filter blur)
- Legend rows: dashed amber line = "delegation", solid line = "MCP sidecar", colored dot = host

**Tasks:**
1. Delete all package imports from `TopologyView.tsx`
2. Create `client/src/components/topology/BotCard.tsx`
3. Create `client/src/components/topology/EdgeLayer.tsx`
4. Create `client/src/components/topology/TopologyInspector.tsx`
5. Rewrite `TopologyView.tsx` to use `.topo-stage-wrap` layout
6. Implement host header strip (`.topo-host-row`) with RoleMark per host
7. Add bot selection state (click card → shows in inspector)
8. Use amber `Pulse` for busy bots, `neutral` Pulse for idle, emerald for active in BotCard headers

**API Expansions Needed:**
- Bots data: `id`, `label`, `role`, `host`, `desc`, `model`, `status`, `avatar`, `mcps[]`, `manages[]`, `delegates[]`
- MCP entry: `id`, `label`, `kind: 'local' | 'remote'`, `ver`, `desc`
- Managed project: `name`, `host`, `port`

---

### 4.4 Network View (`/cluster/network`)

**Reference:** `design/view-network.jsx`

**Important:** The design does NOT use `PieChart` or `ActivityTimeline` from the package. All components use simple CSS patterns.

**Page header:**
- Title: `"Network"`
- Eyebrow: emerald/cyan chip `"network · lab.local"` + subtitle sources `"elastiflow · ntopng · metricbeat"`
- IdTag: `/cluster/asgard/network`
- Subtitle: `"WAN, DNS, VPN, reverse proxy, and L3 switch health alongside flow records and client breakdown."`
- Page actions: `"Refresh"` + **copy-to-clipboard icon button** (not a settings gear)

**Components:**
- `PageHeader` (local)
- `SubsystemStrip` — `.subsys-strip` / `.subsys` with state-colored icons
- `GatewayPanel` (reuse from overview)
- `TopTalkersPanel` — `.talkers` / `.talker-row` with bar visualization
- `ClientBreakdownPanel` — same `.talker-row` pattern with colored bars (no PieChart)
- `NetworkEventsPanel` — `.evt-row` list (not ActivityTimeline)

**SubsystemStrip** (`.subsys-strip`) — 5 monitored services:
- WAN (`gw.lab.local`) — value: `"online · 4124/88↑ Mbps"`
- DNS (`pihole + unbound`) — value: `"1,421 q · 18% blocked"`
- VPN (`wireguard`) — value: `"2/4 peers · 41s hs"` (peer count + handshake age)
- Reverse proxy (`traefik`) — value: `"32 routes · N !"`
- Switch (5th subsystem — partially off-screen in viewport)

```css
.subsys-strip { display: flex; gap: 0; }
.subsys { display: flex; align-items: center; gap: 12px; padding: 14px; border-right: 1px solid var(--canvas-border); }
.subsys .ico { 32×32, border-radius-md, icon centered }
.subsys.ok   .ico { emerald bg/border/color }
.subsys.warn .ico { amber bg/border/color }
.subsys.err  .ico { rose bg/border/color }
/* .info: .n name, .s sub (source label), .v value */
```

**TopTalkersPanel** (`.talkers` / `.talker-row`) — header: `"Top talkers · 5m"` + source tags + `"live"` emerald pulse badge:
- Each row: `rank number` + `hostname or IP` + secondary tag line below (`app1 · app2 · app3`) + horizontal bar + `NNN Mbps ↑/↓`
- Bar color matches host tint (helios=emerald, nyx=cyan, vega=amber, aether=violet)
- Rows are ordered by throughput descending

```css
.talker-row { display: grid; grid-template-columns: 28px 1fr 120px 72px; gap: 12px; align-items: center; padding: 11px 14px; border-bottom: 1px solid var(--canvas-border); }
.talker-row .rank { mono muted }
.talker-row .name { mono fg-1 }
.talker-row .meta { mono 10.5px fg-3 } /* app tags below hostname */
.talker-bar { height: 5px; background: var(--canvas-bg-2); border-radius: full; }
.talker-bar > div { height: 100%; border-radius: inherit; /* color = host tint */ }
.talker-row .val { mono fg-2 text-right } /* includes ↑/↓ direction arrow */
```

**ClientBreakdownPanel** — same `.talker-bar` bar rows as TopTalkers, each with a colored dot + category label + count/share. NOT a PieChart.
- 5 categories in design: **Servers** (cyan), **IoT devices** (amber), **Workstations** (violet), **Mobile** (emerald), **Other** (rose)
- Panel header shows total client count chip

**NetworkEventsPanel** (`.evt-row`) — header: `"Network events · 24h"` + `"alertmanager + traefik logs"` source sub:
- Row format: `8px colored dot` + `level badge (WARN/INFO/OK/ERR)` + `service name` (bold mono) + `message text`
- Services appearing: traefik, pihole, wg-vpn, wan, unbound, switch, dhcp

```css
.evt-row { display: grid; grid-template-columns: 8px 48px 80px 1fr; gap: 10px; align-items: center; padding: 9px 14px; border-bottom: 1px solid var(--canvas-border); }
.evt-row .d { 8px dot, state-colored }
.evt-row .sev { mono 9.5px badge (uppercase): OK=emerald, WARN=amber, ERR=rose, INFO=cyan }
.evt-row .who { mono bold — service name (traefik, pihole, etc.) }
.evt-row .txt { mono fg-2 — event message }
```

**Tasks:**
1. Replace `PageHeader` package import with local
2. Rewrite `ClientBreakdownPanel.tsx` — delete `PieChart` import, implement bar-row layout
3. Rewrite `NetworkEventsPanel.tsx` — delete `ActivityTimeline` import, implement `.evt-row` list
4. Replace `ProgressBar` package import in `GatewayHealthPanel.tsx` with inline bar markup
5. Create `SubsystemStrip.tsx` with state-colored icons
6. Create `TopTalkersPanel.tsx` with rank + bar visualization
7. Use `Panel` wrapper for all sub-panels

**API Expansions Needed:**
- Subsystems: `id`, `name`, `sub`, `state: 'ok'|'warn'|'err'`, `val`, `icon`
- Top talkers: `rank`, `name`, `meta`, `val`, `pct`
- Client breakdown: `cat`, `count`, `share`, `color`
- Network events: `sev: 'OK'|'WARN'|'ERR'|'INFO'`, `who`, `txt`, `when`

---

### 4.5 Placeholder Views (Servers, Bots, Applications, Storage, Logs, Configuration)

**Reference:** `design/view-other.jsx` (stubs only)

**Strategy:** Use PlaceholderView component with design system styling. Defer full implementation to post-refresh.

**Tasks:**
1. Update `PlaceholderView.tsx` to match design (centered icon + message)
2. Ensure shell navigation works for all routes
3. Add eyebrow/title/subtitle to placeholder pages

---

## Phase 5: Polish & Refinement

### 5.1 Typography Enforcement

**Rules (from design/README.md):**
- **Inter**: UI text, body, buttons, labels, prose
- **JetBrains Mono**: ALL identifiers (hostnames, IDs, ports, IPs), eyebrow labels, table headers, stat numbers, kbd shortcuts, container names, volume names, network names

**Audit Checklist:**
- [ ] All hostnames use mono font
- [ ] All container/network/volume names use mono font
- [ ] All port numbers, IPs, IDs use mono font
- [ ] All eyebrow labels (e.g., "UPTIME", "MODEL") use mono font + uppercase + 0.08em tracking
- [ ] All stat tile numbers use mono font
- [ ] All table headers use mono font
- [ ] All chip counts use mono font
- [ ] Statusbar metrics use mono font

**Tasks:**
1. Grep for identifier display logic across all views
2. Add `font-family: var(--font-mono)` or className with `.mono` helper
3. Add `.mono-id-tag` for inline ID chips (border, bg, mono font)

---

### 5.2 Color Consistency

**Rules:**
- No hardcoded hex values except in per-bot avatar gradients
- Use CSS tokens for all colors
- Host tints: nyx=cyan, helios=emerald, aether=violet, vega=amber
- Status colors: ok/running=emerald, warn/degraded=amber, err/failed=rose, updating=cyan

**Audit Checklist:**
- [ ] All status indicators use semantic color tokens
- [ ] All host-specific UI uses correct tint (RoleMark, borders, etc.)
- [ ] All chips use tone-specific classes (`.chip.cyan`, etc.)
- [ ] All metric bars use tone-specific data attributes
- [ ] Dark canvas overrides work correctly

**Tasks:**
1. Grep for hardcoded `#` hex colors in TSX/CSS files
2. Replace with CSS token references
3. Test light/dark canvas toggle across all views

---

### 5.3 Animation & Interaction

**Rules:**
- Only continuous animation: `.pulse` (1.6s ease-out)
- Hover/focus transitions: 80–180ms ease
- No spinners, no loading skeletons (instant data or "—" placeholder)
- Focus rings: amber accent, 3px offset

**Audit Checklist:**
- [ ] Pulse animation only on live indicators (server status, app status, statusbar metrics)
- [ ] Hover states on buttons, nav items, chips (120ms transition)
- [ ] Focus rings on interactive elements (keyboard nav)
- [ ] No rogue animations

**Tasks:**
1. Add `:focus-visible` styles with `var(--focus-ring)` box-shadow
2. Remove any spinner components
3. Add hover states to all buttons, links, nav items

---

### 5.4 Responsive & Density

**Density Modes:**
- **Regular** (default): Standard padding, 14px base
- **Compact**: Tighter padding, smaller metric rows, reduced line-height

**Implementation:**
- `body.density-compact` class toggles via statusbar
- Custom density vars in globals.css

**Tasks:**
1. Test both density modes across all views
2. Ensure compact mode doesn't break layouts
3. Add statusbar toggle for density (persist in localStorage)

**Responsive (Optional):**
- Current design assumes desktop (1280px+ width)
- Topology stage has min-width: 1560px
- Mobile/tablet support deferred to post-refresh

---

### 5.5 Accessibility

**Requirements:**
- Keyboard navigation (tab order, focus rings)
- ARIA labels on icon-only buttons
- Alt text on images (if any)
- Color contrast compliance (WCAG AA)

**Tasks:**
1. Add `aria-label` to icon-only buttons (rail-collapse, topbar icons, etc.)
2. Test keyboard navigation through sidebar, topbar, statusbar
3. Run color contrast checker on all text/background pairs
4. Add `role="status"` to live-updating statusbar metrics

---

## Phase 6: Testing & Validation

### 6.1 Visual Parity Testing

**Method:** Side-by-side comparison with `design/Homelab Dashboard.html`

**Checklist per view:**
- [ ] Overview: Layout, stat tiles, server cards, gateway panel, apps section
- [ ] Containers: Host filter bar, tabs, container rows, networks table, volumes table
- [ ] Topology: Graph styling, inspector panel, bot selector
- [ ] Network: Gateway health, client breakdown, events
- [ ] Shell: Sidebar nav (collapsed/expanded), topbar, statusbar, chat rail

**Tools:**
1. Open design reference in browser
2. Open dev build side-by-side
3. Screenshot comparison (Playwright MCP)
4. Manual pixel inspection (DevTools)

**Tasks:**
1. Document visual differences in GitHub issues
2. Iterate on styling until parity achieved
3. Sign-off from design lead (if applicable)

---

### 6.2 Functional Testing

**Scenarios:**
1. Sidebar collapse/expand
2. Nav tree parent expansion
3. Sub-route navigation (containers/networks, etc.)
4. Dark canvas toggle
5. Density toggle
6. Chat rail toggle
7. Statusbar live updates (mock 2.2s interval)
8. Host filter bar in containers view
9. Tab switching in containers view
10. Alerts strip dismiss

**Tasks:**
1. Write Playwright tests for each scenario
2. Run against dev build
3. Fix any broken interactions

---

### 6.3 Unit Testing

**Targets:**
- New shared components (Chip, Button, Panel, StatTile, MetricRow, etc.)
- Utility functions (metricTone, sparkPaths, etc.)
- Hooks (if any new ones added)

**Tasks:**
1. Write Vitest tests for each new component
2. Achieve >80% coverage on new code
3. Update existing tests for migrated components

---

### 6.4 Performance Validation

**Metrics:**
- Initial load time
- Statusbar polling overhead (2.2s interval)
- Container list rendering (31 containers across 4 hosts)
- Graph rendering (topology view)

**Tasks:**
1. Run Lighthouse audit
2. Check for layout shifts (CLS)
3. Profile React rendering (React DevTools Profiler)
4. Optimize any bottlenecks

---

## Phase 7: Cleanup & Documentation

### 7.1 Remove Package Dependency

**Once all components migrated — no exceptions:**
1. Remove `@tinkermonkey/heimdall-ui` from `client/package.json` entirely
2. Remove the `github:tinkermonkey/heimdall#a33e473` entry from the dependency
3. Run `npm install` to update lock file
4. Verify zero `@tinkermonkey/heimdall-ui` import references remain (grep check)
5. Test full build: `npm run build`

**Note:** There are NO exceptions. The following package components are NOT used in v2 design and must all be eliminated:
- `GraphCanvas`, `GraphInspector`, `TopologyNode`, `GraphNodeData`, `GraphEdgeData` → replaced by `BotCard`, `EdgeLayer`, `TopologyInspector`
- `PieChart` → replaced by `.talker-bar` bar rows
- `ActivityTimeline` → replaced by `.evt-row` list
- `FilterBar` → replaced by `.toolbar` + `SearchInput` + `Chip`
- `ChatContainer`, `ChatMessage`, `ChatComposer`, `ChatDivider`, `ChatSuggestions`, `ToolBlockData`, `ThinkingBlockData`, `BotTab` → replaced by local `bc-*` CSS implementation

---

### 7.2 Update Documentation

**Files to update:**
1. `CLAUDE.md` — Update visual language (cyan → amber accent), add token reference, update data shapes
2. `README.md` — Add section on local design system, no longer using external package
3. `design/README.md` — Note that implementation is now in sync

**Tasks:**
1. Update color tokens in CLAUDE.md (cyan → amber, old package references → local)
2. Document component import paths (e.g., `@/components/shared/Chip`)
3. Note that dark canvas is implemented via `body.dark-canvas` class (default `true`)
4. Note that density is implemented via `body.density-compact` class

---

### 7.3 Migration Retrospective

**Document in this file:**
- Lessons learned from eliminating the external package
- Component-by-component migration notes
- Any design-to-implementation tradeoffs made
- Future work (responsive, additional views, real-time subscriptions)

---

## API Expansion Requirements

### Overview View
- **Servers:**
  - `model: string` — e.g., "Dell T5610 · Xeon E5-2670"
  - `temp: string` — e.g., "68°C"
  - `load: string` — e.g., "1.2 1.8 2.1"
  - `containers: string` — e.g., "12"
- **Gateway:**
  - `downHist: number[]` — 24h throughput history (down)
  - `upHist: number[]` — 24h throughput history (up)
  - `pingHist: number[]` — 24h latency history
- **Apps:**
  - `cat: string` — category (media, iot, ai, storage, dev, obs, net)
  - `version: string` — e.g., "v1.2.3"
  - `meta: string` — e.g., "16 streams"

### Containers View
- **Containers:**
  - `size: string` — e.g., "412 MB"
  - `gpu: number` (optional) — GPU usage percentage
  - `health: string` (optional) — "healthy" | "unhealthy" | "starting"
- **Networks:**
  - `name: string`
  - `driver: string` — e.g., "bridge"
  - `subnet: string` — e.g., "172.20.0.0/16"
  - `gateway: string` — e.g., "172.20.0.1"
  - `scope: string` — "local" | "global"
  - `attached: number` — container count
- **Volumes:**
  - `name: string`
  - `driver: string` — "local"
  - `size: string` — e.g., "2.3 GB"
  - `mount: string` — mount path
  - `usedBy: string[]` — container names

### Network View
- **Metrics:**
  - Client breakdown by device type
  - Recent network events (connections, disconnects)
  - Gateway health time series

### Statusbar
- **Live metrics (2.2s polling):**
  - `ping: number` — ms
  - `cpu: number` — cluster avg %
  - `netDown: number` — Mbps
  - `netUp: number` — Mbps

---

## Rollout Strategy

### Phase 1: Foundation (Week 1)
- [ ] Token migration (tokens.css + app.css → local, font files, Icon system)
- [ ] P0 shared components (Pulse, Chip, Button, Panel, StatTile, MetricRow, PageHeader, Tabs, SearchInput, RoleMark, StatePill, MiniBadge)

### Phase 2: Shell + Core Views (Week 2)
- [ ] Shell refresh (Sidebar, Topbar, Statusbar — remove ShellLayout package import)
- [ ] ChatRail full reimplementation (bc-* CSS, remove all 8 package imports)
- [ ] Overview view
- [ ] Containers view

### Phase 3: Extended Views (Week 3)
- [ ] Topology view (full reimplementation: BotCard, EdgeLayer, TopologyInspector)
- [ ] Network view (remove PieChart/ActivityTimeline, add SubsystemStrip, TopTalkersPanel, evt-row)

### Phase 4: Polish (Week 4)
- [ ] Typography enforcement (JetBrains Mono audit)
- [ ] Token-only color audit (no hardcoded hex)
- [ ] Animation audit (pulse only)
- [ ] Focus ring audit (`--focus-ring` everywhere)
- [ ] Dark canvas + density mode testing
- [ ] Accessibility audit (WCAG AA)

### Phase 5: Testing & Launch (Week 5)
- [ ] Visual parity testing (all views vs. design reference)
- [ ] Functional testing (all interactions)
- [ ] Unit testing (all new components)
- [ ] Performance validation
- [ ] Package removal (no `@tinkermonkey/heimdall-ui` remaining)
- [ ] Documentation update (CLAUDE.md, README.md)

---

## Success Criteria

1. **Visual Parity:** All views match design reference (subjective approval)
2. **Component Coverage:** 100% of P0 components, 80% of P1 components migrated
3. **No Regressions:** All existing functionality works
4. **Performance:** No significant performance degradation
5. **Test Coverage:** >80% unit test coverage on new components
6. **Accessibility:** Keyboard nav works, WCAG AA contrast compliance
7. **Documentation:** CLAUDE.md, README.md, component docs updated

---

## Future Enhancements (Post-Refresh)

1. **Responsive Design:** Mobile/tablet breakpoints
2. **Servers View:** Full implementation with per-server drill-down
3. **Bots View:** Bot management, conversation history
4. **Applications View:** Application catalog with install/update actions
5. **Storage View:** Disk usage breakdown, SMART status
6. **Logs View:** Live log streaming with search/filter
7. **Configuration View:** User preferences, cluster config
8. **Light Canvas Polish:** Ensure light mode looks as good as dark
9. **Advanced Topology:** Custom layouts, filters, grouping
10. **Real-time Subscriptions:** WebSocket for live updates (replace polling)

---

## Appendix A: Design Reference File Map

| File | Purpose |
|------|---------|
| `design/Homelab Dashboard.html` | Single-file runnable prototype (open in browser) |
| `design/README.md` | Implementation handoff guide |
| `design/styles/tokens.css` | CSS token layer (135+ variables, dark canvas overrides) |
| `design/styles/app.css` | Composition layer (shell, canvas, components) |
| `design/icons.jsx` | Icon map (ICONS object, <Icon> component) |
| `design/components.jsx` | Shared primitives (Pulse, Chip, Button, Panel, etc.) |
| `design/charts.jsx` | Spark, AreaChart components |
| `design/shell.jsx` | Sidebar, Topbar, Statusbar |
| `design/chat.jsx` | Bot console (right rail) |
| `design/view-overview.jsx` | Overview view implementation |
| `design/view-containers.jsx` | Containers view implementation |
| `design/view-topology.jsx` | Topology view implementation |
| `design/view-network.jsx` | Network view implementation (partial) |
| `design/view-other.jsx` | Placeholder stubs for other views |
| `design/data.js` | LAB_DATA mock structure |
| `design/data-ext.js` | DOCKER_DATA, TOPOLOGY_DATA mocks |
| `design/tweaks.jsx` | Dev-only tweaks panel (do not ship) |
| `design/app.jsx` | App composition + tweaks protocol |

---

## Appendix B: Token Reference

All tokens are defined in `design/styles/tokens.css` and must be copied verbatim to `client/src/styles/heimdall-tokens.css`. Two blocks: `:root` (light canvas defaults) and `body.dark-canvas` overrides.

### Core Accent (Amber)
- `--accent-primary: #FBBF24` (amber-400) — active nav bar, focus rings, CTAs, env badges
- `--accent-primary-hover: #F59E0B` (amber-500)
- `--accent-primary-deep: #B45309` (amber-700, for text/CTAs on light canvas)
- `--accent-primary-muted: rgba(251,191,36,0.10)` (translucent fill)

### Shell (Always Dark Slate-Navy — no dark canvas override)
- `--shell-bg: #0F1729`
- `--shell-bg-2: #13203A`
- `--shell-surface: #1B2949`
- `--shell-surface-2: #243763`
- `--shell-border: #1E2A44`
- `--shell-border-2: #2A3A5C`
- `--shell-fg-1: #E6EDF3` (primary text)
- `--shell-fg-2: #A6B1BD` (secondary text)
- `--shell-fg-3: #6E7A87` (tertiary / icon muted)
- `--shell-fg-4: #4A5563` (disabled)

### Canvas (Light Default, Dark via `body.dark-canvas`)

| Token | Light (`:root`) | Dark (`body.dark-canvas`) |
|-------|----------------|--------------------------|
| `--canvas-bg` | `#FFFFFF` | `#0B1426` |
| `--canvas-bg-2` | `#F7F9FB` | `#13203A` |
| `--canvas-card` | `#FFFFFF` | `#1B2949` |
| `--canvas-surface` | `#FFFFFF` | `#1B2949` |
| `--canvas-surface-2` | `#F7F9FB` | `#243763` |
| `--canvas-border` | `#E5E9EE` | `#243763` |
| `--canvas-border-2` | `#DDE2E8` | `#2A3A5C` |
| `--canvas-border-strong` | `#D6DCE3` | `#354973` |
| `--canvas-fg-1` | `#0B1220` | `#E2E8F0` |
| `--canvas-fg-2` | `#475569` | `#94A3B8` |
| `--canvas-fg-3` | `#64748B` | `#64748B` |
| `--canvas-fg-4` | `#94A3B8` | `#475569` |

**Note:** `--canvas-card` is DISTINCT from `--canvas-bg` in dark mode — cards are `#1B2949` while the page background is `#0B1426`.

### Focus Ring
- `--focus-ring: 0 0 0 3px rgba(251, 191, 36, 0.18)` — apply via `box-shadow` on `:focus-visible`
- Used on search inputs, buttons, interactive elements

### Status Colors
- `--status-ok: #22C55E` (green, general OK)
- `--status-ok-fg: #15803D` (text-safe green)
- `--status-warn: #EAB308` (yellow)
- `--status-warn-fg: #854D0E` (text-safe amber)
- `--status-error: #EF4444` (red)
- `--status-error-fg: #B91C1C` (text-safe red)
- `--status-emerald: #10B981` (running/healthy Pulse)
- `--status-amber: #F59E0B` (warn Pulse)
- `--status-cyan: #22D3EE` (updating/live Pulse)
- `--status-rose: #F43F5E` (failed/error Pulse)
- `--status-violet: #8B5CF6` (special)

### Semantic Chip Tokens (6 tones × 3 properties × 2 modes)

Each tone provides `--semantic-{tone}-bg`, `--semantic-{tone}-fg`, `--semantic-{tone}-border`.

Light canvas (solid):
```css
--semantic-cyan-bg: #ECFEFF;      --semantic-cyan-fg: #0E7490;     --semantic-cyan-border: #A5F3FC;
--semantic-emerald-bg: #ECFDF5;   --semantic-emerald-fg: #065F46;  --semantic-emerald-border: #6EE7B7;
--semantic-amber-bg: #FFFBEB;     --semantic-amber-fg: #92400E;    --semantic-amber-border: #FCD34D;
--semantic-violet-bg: #F5F3FF;    --semantic-violet-fg: #4C1D95;   --semantic-violet-border: #C4B5FD;
--semantic-rose-bg: #FFF1F2;      --semantic-rose-fg: #9F1239;     --semantic-rose-border: #FECDD3;
--semantic-neutral-bg: #F7F9FB;   --semantic-neutral-fg: #475569;  --semantic-neutral-border: #E5E9EE;
```

Dark canvas (translucent) — same token names, different values in `body.dark-canvas`:
```css
--semantic-cyan-bg: rgba(34,211,238,0.10);    --semantic-cyan-fg: #67E8F9;    --semantic-cyan-border: rgba(34,211,238,0.28);
--semantic-emerald-bg: rgba(16,185,129,0.10); --semantic-emerald-fg: #6EE7B7; --semantic-emerald-border: rgba(16,185,129,0.28);
--semantic-amber-bg: rgba(251,191,36,0.10);   --semantic-amber-fg: #FCD34D;   --semantic-amber-border: rgba(251,191,36,0.28);
--semantic-violet-bg: rgba(139,92,246,0.10);  --semantic-violet-fg: #C4B5FD;  --semantic-violet-border: rgba(139,92,246,0.28);
--semantic-rose-bg: rgba(244,63,94,0.10);     --semantic-rose-fg: #FDA4AF;    --semantic-rose-border: rgba(244,63,94,0.28);
--semantic-neutral-bg: rgba(148,163,184,0.08); --semantic-neutral-fg: #94A3B8; --semantic-neutral-border: rgba(148,163,184,0.18);
```

### Typography
- `--font-sans: 'Inter', system-ui, sans-serif`
- `--font-mono: 'JetBrains Mono', 'Fira Code', monospace`
- Fonts are self-hosted in `design/styles/fonts/` — copy to `client/public/fonts/`

### Radius
- `--radius-sm: 4px`
- `--radius-md: 6px`
- `--radius-lg: 8px`
- `--radius-xl: 12px`
- `--radius-full: 9999px`

### Host Tints
- nyx: cyan (`--status-cyan`)
- helios: emerald (`--status-emerald`)
- aether: violet (`--status-violet`)
- vega: amber (`--status-amber`)

---

## Appendix C: Component Prop Types

**Comprehensive TypeScript interfaces for all migrated components:**

```typescript
// Chip
interface ChipProps {
  tone?: 'cyan' | 'emerald' | 'amber' | 'violet' | 'rose' | 'neutral';
  mono?: boolean;
  dot?: boolean;
  children: React.ReactNode;
}

// Button
interface ButtonProps {
  variant?: 'default' | 'primary' | 'ghost';
  size?: 'default' | 'sm';
  icon?: IconName;
  children?: React.ReactNode;
  onClick?: () => void;
}

// Panel
interface PanelProps {
  title?: string;
  sub?: string;
  eyebrow?: string;
  icon?: IconName;
  actions?: React.ReactNode;
  children: React.ReactNode;
  flush?: boolean;
}

// StatTile
interface StatTileProps {
  tone?: 'cyan' | 'violet' | 'emerald' | 'amber' | 'rose';
  label: string;
  value: string | number;
  unit?: string;
  meta?: string;
  sparkValues?: number[];
}

// StatGrid
interface StatGridProps {
  columns?: number; // default 4
  children: React.ReactNode;
}

// MetricRow
interface MetricRowProps {
  metric: string;
  v: number;           // 0-100
  value: string;       // formatted display value
  hist: number[];      // sparkline values
  scale?: (x: number) => number;
}

// RoleMark
interface RoleMarkProps {
  role: 'compute' | 'storage' | 'k8s' | 'gpu';
  mark: string; // 2-letter monogram
  size?: 'md' | 'lg';
}

// StatePill
interface StatePillProps {
  s: 'running' | 'degraded' | 'failed' | 'updating' | 'stopped';
}

// MiniBadge
interface MiniBadgeProps {
  s: 'running' | 'healthy' | 'degraded' | 'unhealthy' | 'exited' | 'updating' | 'pulling' | 'failed';
}

// Pulse
interface PulseProps {
  tone?: 'emerald' | 'amber' | 'rose' | 'cyan' | 'neutral'; // neutral = no animation, gray
  size?: 'xs' | 'sm' | 'md';
}

// IdTag (mono identifier chip)
interface IdTagProps {
  children: React.ReactNode;
}

// Tabs (new — replaces TabBarWithIcons)
interface Tab {
  id: string;
  label: string;
  count?: number;
  icon?: IconName;
}
interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}

// SearchInput (new — used in toolbar)
interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minWidth?: number;
  onFocus?: () => void;
  onBlur?: () => void;
}

// PageHeader
interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  idChip?: string;
  actions?: React.ReactNode;
}

// AlertStrip
interface Alert {
  id: string;
  severity: 'error' | 'warn' | 'info' | 'success';
  message: string;
}
interface AlertStripProps {
  alerts: Alert[];
  onDismiss?: (id: string) => void;
}

// Spark
interface SparkProps {
  values: number[];
  w?: number;
  h?: number;
  tone?: 'cyan' | 'emerald' | 'amber' | 'violet' | 'rose';
}

// AreaChart
interface AreaChartProps {
  values: number[];
  h?: number;
  color?: string;
  dashed?: boolean;
  secondValues?: number[];
  secondColor?: string;
}

// Icon
type IconName = keyof typeof ICONS; // ~ 40+ names from design/icons.jsx
interface IconProps {
  name: IconName;
  size?: number;
  style?: React.CSSProperties;
}
```

---

## Appendix D: CSS Class Reference

All CSS classes from `design/styles/app.css` that the implementation must use. Do NOT reinvent these — migrate them verbatim.

### Shell & Layout
```
.desktop              Outer 100vh flex-column frame
.app-shell            3-col CSS grid: rail | workspace | chat
.shell-rail           256px left nav column (64px when .collapsed)
.brand-row            Header of sidebar: brand mark + name
.brand-mark           28×28 amber-gradient square with 3-dot stamp
.brand-name           "Homelab" + muted "asgard · v3.2" subtitle
.rail-collapse        Collapse toggle button
.nav-section          Nav group wrapper
.nav-eyebrow          Section label (12px mono, uppercase, muted)
.nav-item             Nav link row (icon + label + count)
.nav-item.active      Amber 2px left bar (::before), fg-1 text
.nav-item.active-parent  No bar, just text color change
.nav-sub              Indented children nav list (dashed left border)
.rail-footer          Bottom of sidebar
.rail-user            User info row (avatar + name + detail)
.avatar               28×28 amber-gradient pill with mono initials
.workspace            Middle column: topbar + canvas + statusbar
.topbar               56px shell topbar
.ws-chip              Workspace selector: amber dot + name + chevron
.crumbs               Breadcrumb path (mono, / separated)
.topbar-palette       ⌘K command palette button
.topbar-ico           30×30 icon action button
.env-pill             Environment badge (amber-tinted, "main")
.canvas-area          Main scrollable content area
.statusbar            40px bottom bar
.sb-item              Statusbar metric entry (.strong for live value)
```

### Canvas Components
```
.pulse                Animated status dot (emerald/amber/rose/cyan)
.pulse.neutral        Non-animated gray dot (idle state)
.chip                 Tinted inline badge (tone via data-tone or class)
.mono-id-tag          Mono identifier chip (hash-prefixed)
.btn                  Primary/ghost button
.panel                Card container with header + children
.panel-head           Panel title row
.panel-body           Panel content area
.stat-grid            4-col grid for StatTile layout
.stat                 Stat tile (tone header + number + label)
.stat .num            28px/700 Inter (NOT mono)
.stat .label          10.5px/500 mono, 0.08em tracking, uppercase
.alerts-strip         Alert banner container
.alert-glyph          Amber warning icon box
.sev-badge            Severity label (amber/rose/cyan)
.server-grid          2-col host cards grid
.server-card          Host card with role mark + metrics
.role-mark            30×30 role-colored monogram mark
.metric-row           Grid: label(44px) | bar(1fr) | value(64px) | spark(92px)
.bar-track            Progress bar background
.bar-fill             Progress bar fill (color via inline style or tone class)
.gw-split             Gateway panel 2-col split
.gw-stat-strip        4-stat footer row in gateway panel
.cat-chips            Category chip filter row
.cat-chip             Single category filter chip
.cat-chip.active      Amber-tinted active chip
.apps-grid            3-col app cell grid
.app-cell[data-host]  App card (2px left border tinted by host color)
.app-mark             26×26 mono app initials badge
.state-pill[data-s]   Status pill (running/degraded/failed/updating/stopped)
.tabs                 Tab row container
.tab                  Individual tab button
.tab.active           Amber 2px ::after underline
.tab .count           Count chip (amber on active)
.toolbar              Filter toolbar row (search + chips)
.search-input         Search field with amber focus ring
```

### Container Rows
```
.host-row             Host section wrapper
.host-row-head        Host header: RoleMark + info + summary
.ctn-row              Container row grid (18px 240px 1fr 140px)
.ctn-dot[data-s]      8px state dot (emerald/gray/cyan by status)
.ctn-name             Mono bold container name
.ctn-id               10px muted container ID
.ctn-image            Image name with .tag chip (amber)
.ctn-badges           MiniBadge row
.ctn-detail           Detail column (rows of pills)
.ctn-detail-row       Single detail row (label + pills)
.port-pill            Cyan-tinted port badge
.mount-pill           Mount binding badge
.mount-pill .typ.B    Bind mount (violet-tinted)
.mount-pill .typ.V    Volume mount (amber-tinted)
.mount-pill.ro        Read-only mount (rose-tinted)
.net-pill             Network badge with colored dot
.ctn-stats            Right-aligned stats column (mono)
.mini-badge[data-s]   Compact inline status badge
.driver-pill          Violet-tinted driver badge (networks table)
.used-by-pill         Container reference chip (volumes table)
.tbl                  Table with canvas-border rows
```

### Topology
```
.topo-stage-wrap      2-col grid: stage (1fr) + inspector (330px)
.topo-stage           Styled canvas with dot-grid + radial gradients
.topo-host-row        4-col host strip above canvas
.topo-canvas          Absolute positioning context for cards
.topo-legend          Bottom-right frosted glass legend panel
.bot-card             230px absolute-positioned bot card
.bot-card.selected    Amber border + amber glow box-shadow
.bot-avatar[data-id]  Per-bot gradient avatar (4 hardcoded gradients)
.mcp-pills            MCP sidecar chip row
.mcp-pill             Violet-tinted MCP badge (solid dot = local)
.mcp-pill.remote      Hollow dot variant (remote MCP)
.proj-pills           Project chip row
.proj-pill[data-host] Host-tinted project chip (dot by host color)
.proj-pill.delegate   Amber-tinted delegation chip
.inspector            Right inspector panel (330px, align-self: start)
.inspector-head       Inspector header: avatar + name + role
.inspector-section    Inspector content section (border-bottom)
.mcp-mini             MCP sidecar row in inspector (name/ver/desc)
.kv                   2-col KV grid (88px + 1fr)
```

### Bot Console
```
.bot-console          380px right rail
.bc-head              Console header: Pulse + title + actions
.bc-ico               13px icon action button
.bc-tabs              4-col bot selector grid
.bc-tab               Per-bot tab button
.bc-tab.active        Amber 2px bottom underline
.bc-thread            Scrollable message list
.bc-divider           Date/section divider
.bc-msg               Message row (26px avatar + content)
.bc-msg.user          User message variant
.bc-meta              Name + badge + timestamp row
.bc-body              Prose content with inline code chips
.bc-tool              Tool call block
.bc-tool-head         Tool header: icon + name + status
.bc-tool-body         KV/diff output
.bc-tool-body .add    Emerald diff addition text
.bc-tool-body .del    Rose diff deletion text
.bc-sugs              Suggestion chip row
.bc-sug               Individual suggestion button
```

### Network View
```
.subsys-strip         5-subsystem status row
.subsys               Individual subsystem entry
.subsys .ico          Status-tinted icon circle
.subsys.ok            Emerald state
.subsys.warn          Amber state
.subsys.err           Rose state
.talkers              Top talkers container
.talker-row           Grid: rank | name/meta | bar | value
.talker-bar           Bar container (thin progress track)
.evt-row              Network event row: dot | sev | who+txt | when
.evt-row .sev         Severity mono badge
```

### Global Utilities
```
.flag                 Cyan-tinted inline badge (special events)
.delta-up             Green upward metric change
.delta-down           Red downward metric change
.kv                   2-col key/value grid (88px + 1fr)
.apps-stat-row        App count summary row with Pulse dots
```

---

## Appendix E: Migration Checklist

### Foundation
- [ ] Copy tokens.css → heimdall-tokens.css
- [ ] Copy app.css → heimdall-components.css
- [ ] Copy font files → client/public/fonts/
- [ ] Update font-face paths
- [ ] Update heimdall.css imports
- [ ] Audit globals.css for conflicts
- [ ] Migrate icon system (ICONS map from design/icons.jsx)
- [ ] Update Icon.tsx for filled icons
- [ ] Export IconName type union

### P0 Shared Components
- [ ] Create Chip.tsx + tests
- [ ] Create Button.tsx + tests
- [ ] Create Panel.tsx + tests
- [ ] Create StatTile.tsx + tests
- [ ] Create StatGrid.tsx + tests
- [ ] Create MetricRow.tsx + tests
- [ ] Create RoleMark.tsx + tests
- [ ] Create StatePill.tsx + tests
- [ ] Create MiniBadge.tsx + tests
- [ ] Create Pulse.tsx + tests
- [ ] Create Tabs.tsx + tests (NEW — replaces TabBarWithIcons)
- [ ] Create SearchInput.tsx + tests (NEW — used in toolbar)
- [ ] Create PageHeader.tsx + tests
- [ ] Create AlertStrip.tsx + tests
- [ ] Create Spark.tsx + tests
- [ ] Create AreaChart.tsx + tests
- [ ] Replace all @tinkermonkey/heimdall-ui imports (19 files)

### Shell
- [ ] Create Sidebar.tsx
- [ ] Create Topbar.tsx
- [ ] Update Statusbar.tsx (remove HeimdallIcon, correct content)
- [ ] Update App.tsx (remove ShellLayout, build shell inline)
- [ ] Implement sidebar collapse
- [ ] Add brand mark (.brand-mark 3-dot stamp)
- [ ] Implement NAV_TREE hierarchical nav (with children + .nav-sub)
- [ ] Persist sidebarCollapsed + chatVisible in localStorage

### Overview View
- [ ] Update OverviewView.tsx
- [ ] Update ServerCard.tsx (add RoleMark, Pulse, server-foot grid)
- [ ] Update GatewayPanel.tsx (gw-split + AreaChart × 2 + gw-stat-strip)
- [ ] Rewrite AppsSection.tsx (cat-chips + apps-grid + app-cell)
- [ ] Update AlertStrip.tsx (alerts-strip + sev-badge + ack button)

### Containers View
- [ ] Update ContainersView.tsx
- [ ] Rewrite HostFilterBar.tsx (toolbar + SearchInput + Chip per host)
- [ ] Delete TabBarWithIcons.tsx; replace with Tabs component
- [ ] Rewrite ContainerRow.tsx (18px 240px 1fr 140px grid + all pill types)
- [ ] Update HostContainersPanel.tsx (RoleMark in head)
- [ ] Rewrite HostNetworksPanel.tsx (.tbl with driver-pill)
- [ ] Rewrite HostVolumesPanel.tsx (.tbl with used-by-pill)

### Topology View
- [ ] Delete ALL @tinkermonkey/heimdall-ui imports from TopologyView.tsx
- [ ] Create BotCard.tsx
- [ ] Create EdgeLayer.tsx (SVG with amber dashed edges)
- [ ] Create TopologyInspector.tsx
- [ ] Rewrite TopologyView.tsx (.topo-stage-wrap layout)
- [ ] Implement host header strip (.topo-host-row)
- [ ] Add bot selection state
- [ ] Add topo legend

### Network View
- [ ] Update NetworkView.tsx
- [ ] Rewrite ClientBreakdownPanel.tsx (delete PieChart, add bar rows)
- [ ] Rewrite NetworkEventsPanel.tsx (delete ActivityTimeline, add .evt-row)
- [ ] Update GatewayHealthPanel.tsx (delete ProgressBar, inline .bar-track)
- [ ] Create SubsystemStrip.tsx
- [ ] Create TopTalkersPanel.tsx

### Chat Rail
- [ ] Rewrite ChatRail.tsx completely (delete all 8 package imports)
- [ ] Implement BotConsole header (.bc-head)
- [ ] Implement bot tabs (.bc-tabs)
- [ ] Implement BotMessage with .bc-tool and .bc-sugs
- [ ] Add bot avatar gradients (.bot-avatar[data-id])
- [ ] Keep DOMPurify for bc-body sanitization
- [ ] Update ChatRail.test.tsx

### Polish
- [ ] Typography audit (JetBrains Mono enforcement)
- [ ] Color audit (token usage only, no hardcoded hex)
- [ ] Animation audit (pulse only continuous)
- [ ] Focus ring audit (--focus-ring on all interactive elements)
- [ ] Hover state audit
- [ ] Dark canvas testing (body.dark-canvas class toggles)
- [ ] Density mode testing (body.density-compact class)
- [ ] Accessibility audit (WCAG AA contrast)

### Cleanup
- [ ] Remove @tinkermonkey/heimdall-ui from client/package.json (no exceptions)
- [ ] Update CLAUDE.md
- [ ] Update README.md
- [ ] Write migration retrospective

---

**End of Plan**
- [ ] Copy app.css → heimdall-components.css
- [ ] Copy font files → client/public/fonts/
- [ ] Update font-face paths
- [ ] Update heimdall.css imports
- [ ] Audit globals.css for conflicts
- [ ] Migrate icon system (ICONS map)
- [ ] Update Icon.tsx for filled icons
- [ ] Export IconName type union

### P0 Components
- [ ] Create Chip.tsx + tests
- [ ] Create Button.tsx + tests
- [ ] Create Panel.tsx + tests
- [ ] Create StatTile.tsx + tests
- [ ] Create StatGrid.tsx + tests
- [ ] Create MetricRow.tsx + tests
- [ ] Create RoleMark.tsx + tests
- [ ] Create StatePill.tsx + tests
- [ ] Create MiniBadge.tsx + tests
- [ ] Create Pulse.tsx + tests
- [ ] Create PageHeader.tsx + tests
- [ ] Replace all package imports (18 files)

### Shell
- [ ] Create Sidebar.tsx
- [ ] Create Topbar.tsx
- [ ] Update Statusbar.tsx
- [ ] Update App.tsx (remove ShellLayout)
- [ ] Implement sidebar collapse
- [ ] Add brand mark
- [ ] Implement nav tree with children
- [ ] Add dark canvas toggle
- [ ] Add density toggle
- [ ] Persist UI state in localStorage

### Overview View
- [ ] Update OverviewView.tsx
- [ ] Update ServerCard.tsx (add RoleMark, Pulse)
- [ ] Update GatewayPanel.tsx (add AreaChart)
- [ ] Update AppsSection.tsx (add category filters)
- [ ] Update AlertStrip.tsx styling
- [ ] Request API expansions

### Containers View
- [ ] Update ContainersView.tsx
- [ ] Update HostFilterBar.tsx
- [ ] Update TabBarWithIcons.tsx
- [ ] Update ContainerRow.tsx (add MiniBadge, pills)
- [ ] Update HostContainersPanel.tsx (add RoleMark)
- [ ] Create HostNetworksPanel.tsx
- [ ] Create HostVolumesPanel.tsx
- [ ] Request API expansions

### Topology View
- [ ] Update TopologyView.tsx
- [ ] Update node styling
- [ ] Add bot selector
- [ ] Update inspector panel

### Network View
- [ ] Update NetworkView.tsx
- [ ] Update GatewayHealthPanel.tsx
- [ ] Update ClientBreakdownPanel.tsx
- [ ] Update NetworkEventsPanel.tsx

### Polish
- [ ] Typography audit (mono font enforcement)
- [ ] Color audit (token usage)
- [ ] Animation audit (pulse only)
- [ ] Focus ring audit
- [ ] Hover state audit
- [ ] Dark canvas toggle testing
- [ ] Density mode testing
- [ ] Accessibility audit

### Testing
- [ ] Visual parity testing (all views)
- [ ] Functional testing (all interactions)
- [ ] Unit testing (all new components)
- [ ] Performance validation

### Cleanup
- [ ] Remove package dependency (if fully migrated)
- [ ] Update CLAUDE.md
- [ ] Update README.md
- [ ] Write migration retrospective

---

**End of Plan**
