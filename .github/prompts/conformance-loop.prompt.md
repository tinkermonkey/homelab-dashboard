---
description: "Run conformance tests (vitest + tsc + visual screenshot diff), plan and fix all deficiencies using parallel sub-agents, then re-run. Loops up to 5 times until clean. Use when: fixing test failures, conformance failures, UX migration gaps, visual design gaps."
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

### Step 3 — Visual Comparison (all 4 implemented views)

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

### Step 4 — Create Fix Plan

Append (or create) `documentation/conformance-fix-plan.md`:

```markdown
# Conformance Fix Plan — Iteration N

Generated: <ISO timestamp>

## Summary
- Test failures: X client, Y server
- Type errors: Z
- Visual gaps: A structural, B data, C styling, D needs-human-review

## Deficiencies

| # | Type | View / File | Description | Root Cause | Fix Strategy |
|---|------|-------------|-------------|------------|--------------|
| 1 | structural | Overview | Missing AlertsStrip component | Not rendered in JSX | Add <AlertsStrip> to OverviewView |
| 2 | data | Containers | Hardcoded tab count "28" | Should derive from containers.length | Wire from API data |

## Parallel Work Batches

### Batch A — [files: list files this batch touches]
Fixes: #1, #3 ...

### Batch B — [files: list files this batch touches]
Fixes: #2, #4 ...

## Needs Human Review (subtle visual issues — do not auto-fix)

- [ ] ...
```

---

### Step 5 — Fix with Sub-Agents (Parallel Where Possible)

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

### Step 6 — Update Tests If Needed

If a test contains stale assertions that no longer match a legitimately updated implementation, update it to reflect the new correct behavior. Never delete tests.

---

### Step 7 — Assess Loop Continuation

- **All automated tests pass + no type errors + no structural/data/styling visual gaps** → proceed to Final Summary and stop.
- **Iteration 5 reached** → stop and list all remaining open issues.
- **Otherwise** → increment iteration counter and return to Step 1.

---

## Final Summary

Output:

```
## Conformance Result

Iterations run: N / 5
Final status: PASS | PARTIAL | FAIL

Automated tests:   X passing, Y failing
Type errors:       Z
Visual gaps fixed: A structural, B data, C styling
Needs human review: D items (see documentation/conformance-fix-plan.md)

Files changed:
- ...
```

Commit all changes:
```bash
cd /Users/austinsand/workspace/homelab-dashboard
git add -A
git commit -m "fix: conformance loop iteration N — X test failures, Y visual gaps resolved"
```
