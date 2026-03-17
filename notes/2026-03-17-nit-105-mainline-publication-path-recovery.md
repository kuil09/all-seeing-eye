# NIT-105 Mainline Publication Path Recovery

Date: 2026-03-17
Issue: NIT-105
Owner: Founding Engineer

## Context

The board-visible concern was correct at the workflow level: the active
integration workspace was showing meaningful local work that was not reflected
on `origin/main`.

After refreshing the remote state with `git fetch origin` on 2026-03-17 KST:

- `origin/main` resolved to `42ff50a`
- `/Users/gun9/Developer/nitro/ceo/all-seeing-eye.integration` remained on
  branch `ceo/nit-49-notes-publication` at `c11198c`
- `git rev-list --left-right --count origin/main...HEAD` in that workspace
  remained `36 1`
- the integration workspace still had a large dirty worktree with tracked and
  untracked repo changes

This means the current integration workspace is a local execution surface, not
the publishable shared baseline.

## Decision

Treat `origin/main` at `42ff50a` as the current shared baseline until a newer
clean promotion candidate is validated and explicitly promoted.

Do not publish directly from a workspace that is both dirty and behind
`origin/main`, even if it contains newer local work that operators are actively
using.

## Current Split

### Shared Baseline

- Remote baseline: `origin/main` at `42ff50a`
- Meaning: this is the board-visible code line and the only safe default answer
  to "what is currently published?"

### Local-Only Execution Workspace

- Workspace: `/Users/gun9/Developer/nitro/ceo/all-seeing-eye.integration`
- Branch: `ceo/nit-49-notes-publication`
- HEAD: `c11198c`
- Status: behind `origin/main`, plus a large dirty worktree
- Policy: do not cite this as a landed shared baseline and do not push it
  directly to `main`

### Historical Promotion Reference

- Workspace: `/Users/gun9/Developer/nitro/ceo/all-seeing-eye.promote-0316`
- Baseline commit: `42ff50a`
- Use: historical evidence for the last explicit clean promotion line
- Caveat: if the local path itself picks up edits, create a fresh worktree from
  `origin/main` before the next promotion run instead of assuming this path is
  still pristine

## Publication Contract

1. Refresh the remote state with `git fetch origin`.
2. Start from a clean workspace rooted at the current `origin/main`.
3. Run `npm run publication:check`.
4. Only publish when the check reports one of the allowed states:
   - `shared-baseline`
   - `promotion-candidate`
5. If the check reports `local-only-dirty`, `drifted-from-main`, or
   `diverged-from-main`, do not push. Replay only the validated changes onto a
   fresh branch from the updated `origin/main` first.
6. After promotion, rerun `npm run publication:check` and confirm the published
   workspace now reports `shared-baseline`.

## Expected Outcome

This restores an explicit publication rule:

- `origin/main` is the authoritative shared line
- dirty integration work is local-only until it is replayed onto a clean branch
- future board-facing publication claims must name a workspace, branch, commit,
  and a passing `publication:check` result
