---
description: "Run conformance tests, plan and fix all deficiencies using sub-agents (parallel), then re-run. Loops up to 5 times until clean. Use when: fixing test failures, conformance failures, UX migration gaps."
name: "Conformance Fix Loop"
argument-hint: "Optional focus area (e.g. 'client', 'server', or leave blank for all)"
agent: "agent"
---

# Conformance Fix Loop

You are an expert coding agent. Your task is to run the full test suite, identify all failures and deficiencies, fix them using parallel sub-agents, and repeat until everything passes — up to **5 iterations**.

## Ground Rules

- **Never use hardcoded example data** from `design/` (e.g. cluster name "asgard", host names "nyx/helios/aether/vega", IP addresses, port numbers, app names). All runtime values must come from the server API or environment config.
- The `design/` directory is a read-only reference prototype — never modify it.
- The source of design truth is [documentation/ux_refresh.md](../documentation/ux_refresh.md).
- Test files live in `client/src/**/*.test.*` and `server/src/**/*.test.*`.
- Run tests from workspace root using `npm run test:run --workspace=client` and `npm run test:run --workspace=server`.

## Iteration Loop (repeat up to 5×)

### Step 1 — Run Conformance Tests

Run both test suites and capture all output:

```bash
cd /Users/austinsand/workspace/homelab-dashboard
npm run test:run --workspace=client 2>&1 | tee /tmp/conformance-client.log
npm run test:run --workspace=server 2>&1 | tee /tmp/conformance-server.log
```

Also run TypeScript type-check:
```bash
cd client && npx tsc --noEmit 2>&1 | tee /tmp/conformance-tsc-client.log
cd ../server && npx tsc --noEmit 2>&1 | tee /tmp/conformance-tsc-server.log
```

### Step 2 — Assess Results

- If **all tests pass and no type errors** → print a success summary and **stop**.
- Otherwise, collect all failures into a structured list:
  - Test file + test name
  - Error message / assertion failure
  - TypeScript type errors (file + line)

### Step 3 — Create Fix Plan

Write a fix plan to `documentation/conformance-fix-plan.md` with:

```markdown
# Conformance Fix Plan — Iteration N

Generated: <timestamp>
Test failures: X client, Y server
Type errors: Z

## Deficiencies

| # | File | Description | Root Cause | Fix Strategy |
|---|------|-------------|------------|--------------|
| 1 | ... | ... | ... | ... |

## Parallel Work Batches

Group independent fixes into batches that sub-agents can tackle simultaneously.
Mark which files each batch touches so there are no write conflicts.
```

### Step 4 — Fix with Sub-Agents (Parallel Where Possible)

For each independent batch from the plan, launch a sub-agent with a precise task:

> **Sub-agent prompt template:**
> "Fix the following deficiency in the homelab-dashboard codebase. Do NOT modify files in `design/`. Do NOT hardcode any example data values from the design prototype (cluster names, host names, IPs, ports, app names). Read each file before editing it. After editing, verify TypeScript compiles cleanly for your changed files. Deficiency: [description]. Files involved: [list]. Fix strategy: [strategy from plan]."

- Group non-overlapping fixes into parallel batches (different files → parallel; same file → sequential).
- After all sub-agents complete, verify no merge conflicts between their changes.

### Step 5 — Update Tests If Needed

If a test itself contains stale assertions that no longer match a legitimately updated implementation (e.g. the test expected an old API shape that has since changed), update the test to match the new correct behavior. Never delete tests — update or add.

### Step 6 — Loop or Finish

- If this was iteration 5 → stop and summarize remaining open issues.
- Otherwise → go back to **Step 1** with the next iteration number.

## Final Summary

After the loop ends, output:

```
## Conformance Result

Iterations run: N/5
Final status: PASS / PARTIAL / FAIL

Passing: X tests
Failing: Y tests
Type errors: Z

Remaining open issues (if any):
- ...

Files changed:
- ...
```

Commit all changes with:
```bash
git add -A
git commit -m "fix: conformance loop iteration N — resolve X failures"
```
