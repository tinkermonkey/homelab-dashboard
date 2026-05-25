---
description: "Run conformance tests (vitest + tsc + Heimdall component audit + visual screenshot diff), plan and fix all deficiencies using parallel sub-agents, then re-run. Loops up to 5 times until clean. Heimdall component structure must be clean before visual comparison runs. Use when: fixing test failures, conformance failures, UX migration gaps, visual design gaps."
name: "Conformance Fix Loop"
argument-hint: "Optional focus area (e.g. 'client', 'server', 'visual', or leave blank for all)"
agent: "agent"
---

# Conformance Fix Loop

You are an expert coding agent. Your task is to run the full conformance suite (tests + types + visual), identify all failures and deficiencies, fix them using parallel sub-agents, and repeat until everything passes — up to **5 iterations**.

## Ground Rules

- **Never hardcode example data** from `design/` (cluster name, host names, IPs, ports, app names). All runtime values must come from the server API or environment config.
- `design/` is a **read-only** reference prototype — never modify it.
- The written design spec is [documentation/ux_refresh.md](../documentation/ux_refresh.md).
- The **visual** design authority is the running design prototype at `http://localhost:7432/Homelab%20Dashboard.html`.
- The **implementation** under test is the running dev app at `http://localhost:5173/`.
- Screenshots go in `screenshots/` (gitignored). Use descriptive names: `impl-<view>.png`, `design-<view>.png`.
- Test files live in `client/src/**/*.test.*` and `server/src/**/*.test.*`.

## Iteration Loop (repeat up to 5×)

### Step 1 — Ensure Servers Are Running

Check that both HTTP servers are up:

```bash
lsof -i :5173 | grep LISTEN   # dev app (Vite)
lsof -i :7432 | grep LISTEN   # design prototype
```

If the dev app (5173) is not running:
```bash
cd /Users/austinsand/workspace/homelab-dashboard/client && npm run dev &
sleep 4
```

If the design server (7432) is not running:
```bash
cd /Users/austinsand/workspace/homelab-dashboard/design && python3 -m http.server 7432 &>/tmp/design-server.log &
sleep 1
```

---

### Step 2 — Run Automated Tests

Run both test suites and the TypeScript type-checker:

```bash
cd /Users/austinsand/workspace/homelab-dashboard
npm run test:run --workspace=client  2>&1 | tee /tmp/conformance-client.log
npm run test:run --workspace=server  2>&1 | tee /tmp/conformance-server.log
cd client  && npx tsc --noEmit 2>&1 | tee /tmp/conformance-tsc-client.log; cd ..
cd server  && npx tsc --noEmit 2>&1 | tee /tmp/conformance-tsc-server.log; cd ..
```

Collect all failures:
- Test file + test name + error/assertion message
- TypeScript errors: file, line, message

---

### Step 3 — Heimdall Component Audit

Before any visual comparison, verify that every implementation file is using the correct Heimdall CSS classes rather than ad-hoc styles.

**Reference sources (read-only):**
- `client/src/styles/heimdall-components.css` — canonical class names for all shell, canvas, nav, card, and bot-console components
- `client/src/styles/heimdall-tokens.css` — canonical CSS custom-property tokens
- `client/src/styles/heimdall.css` — entry point that imports both layers

**Audit procedure:**

1. Enumerate every top-level Heimdall class defined in `heimdall-components.css` (e.g. `.app-shell`, `.shell-rail`, `.workspace`, `.topbar`, `.canvas-area`, `.statusbar`, `.nav-section`, `.nav-item`, `.card`, `.card-head`, `.stat-block`, `.host-pill`, `.bc-*`, etc.).

2. For each implementation file under `client/src/components/` and `client/src/App.tsx`, grep for usage of the corresponding Heimdall class or token:

```bash
grep -rn "className=" client/src/components/ client/src/App.tsx | grep -v "node_modules"
```

3. Flag any component that:
   - Uses an inline `style={{}}` override where a Heimdall token/class exists for the same property
   - Defines a local CSS class duplicating a Heimdall class (check paired `.css` files next to each `.tsx`)
   - Applies raw hex colours or hardcoded pixel values instead of `var(--…)` tokens
   - Is missing the expected Heimdall structural class (e.g. a sidebar rendered without `.shell-rail`, a view wrapper without `.canvas-area`)

4. Classify every violation as one of:
   - **Wrong class** — component exists in Heimdall but the impl uses a different/custom class name → replace with the Heimdall class
   - **Missing class** — a required structural wrapper class is absent entirely → add it
   - **Raw value** — hardcoded colour/size where a token exists → replace with the correct `var(--…)` token
   - **Duplicate local style** — a local CSS rule re-implements a Heimdall class → delete local rule and use Heimdall class

**Gate:** If any Heimdall violations are found, add them to the fix plan (Step 4) and **do not proceed to visual comparison (Step 5) this iteration**. Fix the structure first, re-run Step 3 in the next iteration, and only advance to Step 5 when this audit is clean.

---

### Step 4 — Visual Comparison (all 4 implemented views)

> **Prerequisite:** Step 3 (Heimdall Component Audit) must be clean — zero violations — before running this step. If violations remain, skip this step and proceed directly to Step 5 (fix plan).

For each view below, screenshot **both** the design prototype and the live implementation, then analyze the diff using `view_image` on both images side-by-side, cross-referencing [documentation/ux_refresh.md](../documentation/ux_refresh.md):

| View | Design nav click | Impl URL | Design screenshot | Impl screenshot |
|------|-----------------|----------|-------------------|-----------------|
| Overview | click Overview nav item | `http://localhost:5173/cluster/overview` | `screenshots/design-overview-cmp.png` | `screenshots/impl-overview.png` |
| Containers | click Containers nav item | `http://localhost:5173/cluster/containers` | `screenshots/design-containers-cmp.png` | `screenshots/impl-containers.png` |
| Topology | click Topology nav item | `http://localhost:5173/cluster/topology` | `screenshots/design-topology-cmp.png` | `screenshots/impl-topology.png` |
| Network | click Network nav item | `http://localhost:5173/cluster/network` | `screenshots/design-network-cmp.png` | `screenshots/impl-network.png` |

**For each view:**
1. Navigate Chrome to the design prototype; wait ~2s for Babel render; take screenshot.
2. Navigate Chrome to the implementation URL; wait ~1s; take screenshot.
3. Call `view_image` on both screenshots and enumerate every visible gap.

For scroll-dependent content, scroll the canvas area before the second screenshot:
```js
// Chrome MCP evaluate_script:
() => {
  const el = document.querySelector('.canvas-area');
  if (el) el.scrollTop = 1000;
  return 'scrolled';
}
```

**Gap classification:**
- **Structural** — missing component, wrong layout, missing section or panel entirely → **auto-fix**
- **Data** — hardcoded example values, missing API wiring, wrong field names → **auto-fix**
- **Styling** — wrong color token, wrong spacing, wrong font/size — **auto-fix only if the correct token is explicitly named in ux_refresh.md**
- **Subtle** — pixel-level spacing, subjective polish → **document only** (add to `## Needs Human Review`)

---

### Step 5 — Create Fix Plan

Append (or create) `documentation/conformance-fix-plan.md`:

```markdown
# Conformance Fix Plan — Iteration N

Generated: <ISO timestamp>

## Summary
- Test failures: X client, Y server
- Type errors: Z
- Heimdall violations: W (wrong-class / missing-class / raw-value / duplicate-local-style)
- Visual gaps: A structural, B data, C styling, D needs-human-review
  _(visual gaps only populated when Heimdall audit is clean)_

## Deficiencies

| # | Type | View / File | Description | Root Cause | Fix Strategy |
|---|------|-------------|-------------|------------|----------------------------------------------|
| 1 | heimdall | Shell | Sidebar uses `.sidebar` instead of `.shell-rail` | Custom class, not migrated | Replace className with `.shell-rail` |
| 2 | structural | Overview | Missing AlertsStrip component | Not rendered in JSX | Add <AlertsStrip> to OverviewView |
| 3 | data | Containers | Hardcoded tab count "28" | Should derive from containers.length | Wire from API data |

## Parallel Work Batches

### Batch A — [files: list files this batch touches]
Fixes: #1, #3 ...

### Batch B — [files: list files this batch touches]
Fixes: #2, #4 ...

## Needs Human Review (subtle visual issues — do not auto-fix)

- [ ] ...
```

---

### Step 6 — Fix with Sub-Agents (Parallel Where Possible)

Launch one sub-agent per independent batch. Non-overlapping file sets → parallel; same-file fixes → sequential.

**Sub-agent task template:**
> Fix the following deficiencies in the homelab-dashboard codebase.
>
> Rules:
> - Do NOT modify anything under `design/`.
> - Do NOT hardcode any example data values from the design prototype (cluster name, host names, IPs, ports, app names). All values come from the server API.
> - Read each target file fully before editing.
> - After edits, run `npx tsc --noEmit` in the changed workspace and fix any new type errors.
> - For visual fixes, use the CSS class names and token names from `documentation/ux_refresh.md`.
>
> Deficiencies: [list from batch]
> Files involved: [list]
> Fix strategy per deficiency: [from plan table]

After all sub-agents complete, check for conflicting edits to the same file.

---

### Step 7 — Update Tests If Needed

If a test contains stale assertions that no longer match a legitimately updated implementation, update it to reflect the new correct behavior. Never delete tests.

---

### Step 8 — Assess Loop Continuation

- **All automated tests pass + no type errors + Heimdall audit clean + no structural/data/styling visual gaps** → proceed to Final Summary and stop.
- **Heimdall violations remain but tests pass** → increment iteration counter and return to Step 1 (do not count as a full pass).
- **Iteration 5 reached** → stop and list all remaining open issues.
- **Otherwise** → increment iteration counter and return to Step 1.

---

## Final Summary

Output:

```
## Conformance Result

Iterations run: N / 5
Final status: PASS | PARTIAL | FAIL

Automated tests:     X passing, Y failing
Type errors:         Z
Heimdall violations: W remaining (0 = audit clean)
Visual gaps fixed:   A structural, B data, C styling
Needs human review:  D items (see documentation/conformance-fix-plan.md)

Files changed:
- ...
```

Commit all changes:
```bash
cd /Users/austinsand/workspace/homelab-dashboard
git add -A
git commit -m "fix: conformance loop iteration N — X test failures, Y visual gaps resolved"
```
