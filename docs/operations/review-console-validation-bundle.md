# Review Console Validation Bundle

Date: 2026-03-17
Issue: NIT-101
State: `verified-local`

## Purpose

Bundle the current reproducible evidence for the first-slice analyst review
workflow and keep the validation handoff auditable after the earlier checkpoint
issue tree was cancelled.

This document is the current on-disk handoff artifact for:

- `NIT-100`, which evaluated the product slice and found no new first-slice
  product-flow defect in the current workspace
- `NIT-101`, which repairs the stale validation handoff so every cited command
  exists and the replacement trail stays explicit
- `NIT-85`, which records why `NIT-14`, `NIT-71`, `NIT-77`, `NIT-51`, and
  `NIT-52` were cancelled and why future checkpoint gates must be recreated on
  their execution date instead of staying open early

## Workspace Roles

### Active Validation Workspace

- Workspace: `/Users/gun9/Developer/nitro/ceo/all-seeing-eye.integration`
- Branch: `ceo/nit-49-notes-publication`
- HEAD: `c11198c`
- App entry: `apps/review-console/`
- Read path: same-origin `/api/*`, default `source=api`, fixture fallback
  available
- Validation state: `verified-local`
- Caveat: this workspace is dirty above `c11198c`, so cite it with exact path
  and commands rather than presenting it as a landed shared baseline
- Use when: iterating on review-console behavior, reproducing the current
  local-first analyst flow, or handing off the exact commands verified on
  2026-03-17 KST

### Historical Promoted Baseline

- Workspace: `/Users/gun9/Developer/nitro/ceo/all-seeing-eye.promote-0316`
- Branch: `promote/nit14-reviewed-status-order-0316`
- HEAD: `42ff50a`
- Historical reference: `NIT-75`
- Meaning: this path remains the last explicitly promoted clean workspace, but
  it is not governed by an active checkpoint issue today
- Policy: per `NIT-85`, do not cite cancelled issues `NIT-77`, `NIT-51`, or
  `NIT-52` as current owners on March 17, 2026 KST; recreate a fresh execution
  issue on or after March 18, 2026 KST if a new checkpoint run needs a live
  owner and comment thread

## Validation Commands

Run these from `/Users/gun9/Developer/nitro/ceo/all-seeing-eye.integration`.
Each command below exists in the current workspace. The syntax check, focused
unit coverage, review-console smoke path, SQLite-backed smoke path, and listed
E2E suite were revalidated on 2026-03-17 KST while repairing `NIT-101`.

### Syntax And Focused Unit Coverage

```bash
node --check apps/review-console/app.js
node --test apps/review-console/view-handoff.test.mjs \
  apps/review-console/source-proof-snapshot.test.mjs \
  apps/review-console/review-recovery-copy.test.mjs \
  apps/review-console/recent-review-activity.test.mjs \
  apps/review-console/view-state.test.mjs \
  apps/review-console/review-draft-state.test.mjs \
  apps/review-console/review-queue-navigation.test.mjs \
  apps/review-console/filter-summary.test.mjs \
  apps/review-console/saved-views.test.mjs
```

### Workflow E2E Coverage

```bash
npm run review-console:e2e -- \
  e2e/view-handoff.spec.js \
  e2e/recent-review-activity.spec.js \
  e2e/review-auto-advance.spec.js \
  e2e/saved-views.spec.js \
  e2e/timeline-sort.spec.js \
  --reporter=list
```

### Smoke Paths

```bash
npm run review-console:smoke
npm run review-console:smoke:sqlite
```

### Manual Demo Path

```bash
npm run review-console:dev
READ_API_DB_PATH=data/all-seeing-eye.sqlite npm run review-console:dev
```

## Validation Walkthrough

Use this walkthrough when a future issue needs to reproduce the current
analyst-flow evidence from the active validation workspace. If a new checkpoint
gate is created on or after March 18, 2026 KST, cite this document from that
new issue rather than reviving a cancelled issue identifier.

### Launch

```bash
cd /Users/gun9/Developer/nitro/ceo/all-seeing-eye.integration
READ_API_DB_PATH=data/all-seeing-eye.sqlite npm run review-console:dev
```

Open `http://127.0.0.1:4173/apps/review-console/`.

### What To Verify

1. Queue baseline
   - Timeline loads without the empty or error demo state.
   - The queue shows seeded events and stays in `API` mode.
2. Detail trust surface
   - Opening an event shows confidence rationale, provenance, supporting
     sources, claims, and relationship/entity context.
   - If search is active, the Search focus card can reopen the matched detail
     section without losing the current event.
3. Review actions
   - `Approve`, `Edit`, and `Reject` are available on the same-origin read
     path.
   - `Edit` and `Reject` require analyst notes before the action records.
   - Recording an action on a pending event advances to the next pending item
     when one exists.
4. Recovery and handoff
   - Recent activity and the success flash offer a review-safe reopen path that
     names any source switch or omitted review-only filters.
   - Shareable view can copy a start link and a review note, and the handoff
     copy keeps browser-local caveats explicit when portability is limited.

### Pass Criteria

Treat the validation as failed if any of the following happens:

- the queue falls back to the empty or error demo path during the intended
  SQLite-backed run
- review actions stop recording or no longer enforce note requirements for
  `Edit` and `Reject`
- recent-activity recovery or shareable-view handoff copy hides source-switch,
  omitted-filter, or browser-local caveats
- copied links fail to restore the selected event or the focused search section

## Audit Trail

### Current Issue Trail

- `NIT-100` is the source evaluation that concluded the local product path is
  already `verified-local` and that the next real gap is the stale handoff
  artifact rather than a new product defect.
- `NIT-101` is the active repair issue for this bundle. It supersedes the stale
  `checkpoint:first` citation by naming only commands that exist in the current
  workspace.
- `NIT-85` is the replacement trail for the cancelled `NIT-14`, `NIT-71`, and
  `NIT-77` structure. Use that decision record when explaining why those issue
  identifiers remain in historical notes but not in active handoff guidance.
- `NIT-75` remains the historical evidence for the promoted workspace
  `/Users/gun9/Developer/nitro/ceo/all-seeing-eye.promote-0316` at `42ff50a`.
  Treat it as historical baseline context, not as the current governing parent.
- `NIT-86` previously closed the last product-polish audit by concluding that
  no higher-signal review-console change remained at that time.

### Delivered Review Workflow Capabilities

- App shell plus timeline-first analyst queue and event detail workflow
- Provenance, confidence, supporting-source, and review-history visibility in
  both queue and detail surfaces
- Same-origin approve, edit, and reject actions on the local read path
- Filter, empty-state, error-state, saved-view, and keyboard-driven navigation
  coverage for the review workflow
- URL-based handoff and recovery surfaces, including portable start links,
  next-pending links, recent-activity reopen paths, and copied review notes

### Local-Only Constraints That Still Matter

- Saved views, recent activity, and unsaved draft-note text stay browser-local
- Review-action persistence is local overlay or local SQLite state, not shared
  multi-user storage
- Portable handoff links intentionally drop saved-draft-only dependencies

## Paperclip Comment Template

Use this as the copy-ready starting point for `NIT-101` or any future
validation or checkpoint issue that needs the exact workspace path, commands,
and replacement trail. Replace the status, result, and issue links as needed.

```md
## Status

Validation evidence refreshed from the current review-console handoff bundle.

- Artifact: `docs/operations/review-console-validation-bundle.md`
- Workspace: `/Users/gun9/Developer/nitro/ceo/all-seeing-eye.integration`
- Branch: `ceo/nit-49-notes-publication`
- Commit: `c11198c`
- Validation state: `verified-local` unless the cited workspace is a clean
  shared baseline reproduced unchanged
- Commands:
  - `node --check apps/review-console/app.js`
  - `node --test apps/review-console/view-handoff.test.mjs apps/review-console/source-proof-snapshot.test.mjs apps/review-console/review-recovery-copy.test.mjs apps/review-console/recent-review-activity.test.mjs apps/review-console/view-state.test.mjs apps/review-console/review-draft-state.test.mjs apps/review-console/review-queue-navigation.test.mjs apps/review-console/filter-summary.test.mjs apps/review-console/saved-views.test.mjs`
  - `npm run review-console:e2e -- e2e/view-handoff.spec.js e2e/recent-review-activity.spec.js e2e/review-auto-advance.spec.js e2e/saved-views.spec.js e2e/timeline-sort.spec.js --reporter=list`
  - `npm run review-console:smoke`
  - `npm run review-console:smoke:sqlite`
- Result: `pass` or `fail`
- Replacement trail:
  - source evaluation: [NIT-100](/NIT/issues/NIT-100)
  - handoff repair: [NIT-101](/NIT/issues/NIT-101)
  - cancelled issue policy: [NIT-85](/NIT/issues/NIT-85)
  - historical promoted baseline: [NIT-75](/NIT/issues/NIT-75)
- If failed: link the exact follow-up issue, owner, and failing command or
  walkthrough step
```

## Usage Notes

- Cite this document path in future validation comments instead of reviving the
  removed `npm run checkpoint:first` command.
- Do not cite cancelled issues `NIT-14`, `NIT-71`, or `NIT-77` as current
  governing owners. If a checkpoint gate is needed on March 18, 2026 KST or
  later, open a fresh issue for that execution window and link this artifact.
- Historical notes may still mention the cancelled issues; treat those mentions
  as audit history, not current operating instructions.
- If the authoritative workspace path, branch, commit, or validation commands
  change, update this document before claiming a newer validation baseline.
