# Conformance Fix Plan — Iteration 1

Generated: 2026-05-25T10:50:00Z

## Summary

- Test failures: 0 client, 0 server (all pass)
- Type errors: 0
- Heimdall violations: 17 (wrong-class / missing-class / raw-value / duplicate-local-style)
- Visual gaps: pending (Heimdall audit must be clean first)

## Deficiencies

| # | Type | View / File | Description | Root Cause | Fix Strategy |
|---|------|-------------|-------------|------------|----------------------------------------------|
| 1 | wrong-class | Overview / ServerCard.tsx | `.server-card__header` used instead of `.server-head` | BEM naming instead of Heimdall flat classes | Replace with `.server-head` |
| 2 | wrong-class | Overview / ServerCard.tsx | `.server-card__mark` used instead of `.role-mark[data-role]` | BEM naming + inline style tinting | Replace with `.role-mark` + `data-role={server.role}` attribute |
| 3 | wrong-class | Overview / ServerCard.tsx | `.server-card__info` used instead of `.server-head-main` | BEM naming | Replace with `.server-head-main` |
| 4 | wrong-class | Overview / ServerCard.tsx | `.server-card__name` used instead of `.server-name` | BEM naming | Replace with `.server-name` |
| 5 | wrong-class | Overview / ServerCard.tsx | `.server-card__status-pulse` used instead of `.pulse` + color modifier | BEM naming + inline style | Replace with `.pulse` + `.amber`/`.rose`/`.emerald` class |
| 6 | wrong-class | Overview / ServerCard.tsx | `.server-card__ip` used instead of `.server-sub` | BEM naming | Replace with `.server-sub` |
| 7 | wrong-class | Overview / ServerCard.tsx | `.server-card__metrics` used instead of `.metric-rows` | BEM naming | Replace with `.metric-rows` |
| 8 | wrong-class | Overview / ServerCard.tsx | `.server-card__footer` used instead of `.server-foot` | BEM naming | Replace `<div>` with `<footer className="server-foot">` |
| 9 | wrong-class | Overview / ServerCard.tsx | `.server-card__footer-{item,label,value}` used instead of Heimdall `.k`/`.v` pattern | BEM naming | Replace with plain `<div><span class="k">…</span><span class="v">…</span></div>` |
| 10 | duplicate-local-style | Overview / ServerCard.css | Entire file duplicates Heimdall `.server-card`, `.server-head`, `.metric-rows` etc. | Pre-existing file | Remove all classes that Heimdall already provides; keep nothing |
| 11 | wrong-class | Overview / GatewayPanel.tsx | `.gateway-panel` used instead of `.panel` | Custom class | Replace with `<Panel>` from `@tinkermonkey/heimdall-ui` |
| 12 | wrong-class | Overview / GatewayPanel.tsx | `.gateway-panel__header`, `.gateway-panel__title`, `.gateway-panel__status` used instead of `.panel-head` / `.panel-title` | Custom class | Use Heimdall `.panel-head`, `.panel-title`, `.chip` |
| 13 | wrong-class | Overview / GatewayPanel.tsx | `.gateway-panel__content`, `.gateway-panel__info-grid`, `.gateway-panel__label/.value` used instead of `.gw-split`, `.gw-left`, `.kv` | Custom class | Use `.gw-split`, `.gw-left`, `.gw-eyebrow`, `.kv` classes |
| 14 | wrong-class | Overview / GatewayPanel.tsx | `.gateway-panel__charts`, `.gateway-panel__quality-*`, `.gateway-panel__stats-strip` instead of `.gw-right`, `.gw-charts`, `.gw-stat-strip` | Custom class | Use `.gw-right`, `.gw-charts`, `.gw-stat-strip` |
| 15 | duplicate-local-style | Overview / GatewayPanel.css | Entire file duplicates Heimdall panel/gateway classes | Pre-existing file | Remove all; Heimdall CSS provides everything |
| 16 | wrong-class | Overview / AppsSection.tsx | `.apps-section__filter-chip` used instead of `.cat-chip` (inside `.cat-chips`) | Custom class | Replace with `.cat-chips` container + `.cat-chip` buttons |
| 17 | wrong-class | Overview / AppsSection.tsx | `.apps-section__grid` used instead of `.apps-grid` | Custom class | Replace with `.apps-grid` |
| 18 | wrong-class | Overview / AppsSection.tsx | Custom card `.app-cell` layout (flex column with accent-bar) instead of Heimdall row-layout `.app-cell` (3-col grid with `.app-mark`, `.app-body`, `.state-pill`) | Different structure | Refactor `.app-cell` to Heimdall's row-grid pattern |
| 19 | duplicate-local-style | Overview / AppsSection.css | Duplicates `.cat-chips`, `.cat-chip`, `.apps-grid`, `.app-cell` etc. | Pre-existing file | Remove all classes provided by Heimdall |
| 20 | wrong-class | Overview / OverviewView.tsx | `.servers-section` wrapper with `.section-title` heading instead of direct `.server-grid` | Extra nesting | Remove wrapper; render `.server-grid` directly |
| 21 | wrong-class | Overview / OverviewView.tsx | `.servers-grid` instead of `.server-grid` | Wrong class name | Rename to `.server-grid` |
| 22 | raw-value | Overview / OverviewView.tsx | `style={{ marginTop: '24px' }}` on Gateway and Apps wrappers | Inline style instead of canvas-inner gap | Remove wrapping divs; canvas-inner gap handles spacing |
| 23 | duplicate-local-style | Overview / OverviewView.css | Defines `.cluster-stats` (duplicates `.stat-grid`), `.servers-section`, `.servers-grid`, `.page-header` and related classes | Pre-existing | Remove all; migrate to Heimdall tokens |

## Parallel Work Batches

### Batch A — ServerCard [files: ServerCard.tsx, ServerCard.css]
Fixes: #1–10

### Batch B — GatewayPanel [files: GatewayPanel.tsx, GatewayPanel.css]
Fixes: #11–15

### Batch C — AppsSection [files: AppsSection.tsx, AppsSection.css]
Fixes: #16–19

### Batch D — OverviewView [files: OverviewView.tsx, OverviewView.css]
Fixes: #20–23

## Needs Human Review (subtle visual issues — do not auto-fix)

- [ ] GatewayChart subcomponent may need its own Heimdall audit in a future iteration
- [ ] App host → CSS `data-host` mapping: design uses `nyx/helios/aether/vega` but real data uses `t5610/petit-cochon/hp7052/austins-mac-mini`. Heimdall's `.app-cell[data-host="nyx"]` uses design names; implementation maps data IDs to tint tokens via globals.css.
