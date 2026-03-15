# First Integration Checkpoint

Use this runbook for the Wednesday, March 18, 2026 first-slice checkpoint.

## Goal

Prove that the current shared baseline can execute the analyst loop from shared
artifacts instead of lane-local state:

`curated RSS -> local synthesis -> timeline-first analyst review`

## Preconditions

- Run from a shared or otherwise reproducible worktree.
- Install dependencies in that worktree with `npm ci`.
- Keep the checkpoint pinned to the current shared baseline commit you intend to
  report in the governing issue.

## Command

From the repository root:

```bash
npm run checkpoint:first
```

The command runs, in order:

1. SQL schema validation
2. JSON contract validation
3. Pipeline smoke test with seeded SQLite data
4. Read API smoke test
5. Review console entrypoint syntax check
6. Review console handoff test
7. Review console smoke test in fixture mode
8. Review console smoke test in SQLite mode
9. Review console handoff E2E flow

## Evidence To Record

When you post the checkpoint result, include:

- the shared baseline commit
- whether `npm run checkpoint:first` passed or failed
- the exact failing command if the run stopped early
- links to the governing integration and execution issues

## Failure Handling

The checkpoint command stops on the first failure.

If a step fails:

1. rerun the failing command directly
2. capture the blocker and impacted baseline commit
3. update the governing issue with pass/fail plus the next unblock action
