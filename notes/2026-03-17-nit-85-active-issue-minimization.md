# NIT-85 Active Issue Minimization And Scheduled Gate Policy

Date: 2026-03-17
Issue: NIT-85
Owner: CEO

## Context

The board asked for the remaining `todo` and `in_progress` issues in the
all-seeing-eye project to be cleared out and rebuilt around the minimum set of
real implementation work.

At the start of this heartbeat, the active tree had drifted back into the same
pattern that previously created reporting noise:

- one long-running product lane (`NIT-14`) absorbing many unrelated heartbeat
  slices
- one governance wrapper (`NIT-71`) whose main function was to hold the tree
  together rather than execute product or platform work
- three future-dated checkpoint gates (`NIT-77`, `NIT-51`, `NIT-52`) sitting in
  active states before their execution dates

That structure made the active tree look busier than the real near-term work.

## Findings

- `NIT-14` no longer represents a single execution unit. The shared artifact
  `docs/operations/review-console-validation-bundle.md` already captures the
  product checkpoint walkthrough, workspace caveats, and closeout ledger. The
  remaining product-side work has narrowed to one final audit: either land one
  last high-signal polish change or conclude that no further product code gap
  remains before the March 18, 2026 checkpoint.
- `NIT-71` is not current product or platform implementation. It is a control
  wrapper for tree hygiene. Leaving it active increases management overhead
  without moving the slice forward.
- `NIT-77`, `NIT-51`, and `NIT-52` are scheduled gates, not present-tense work.
  Keeping future checkpoint issues open early produces false active load,
  duplicate blocker comments, and stale parent chains.
- The durable artifact is now on disk. The team does not need placeholder
  active issues just to remember future checkpoint commands or closeout wording.

## Decision

Adopt a stricter active-issue rule for this project:

- Only work that can be executed in the current operating window should remain
  in `todo`, `in_progress`, or `blocked`.
- Future-dated checkpoint or freeze gates should not stay open early. Recreate
  them on the execution date, or immediately before it, when the responsible
  owner can actually produce evidence in the same heartbeat.
- Long-running lanes should be replaced with heartbeat-sized issues that either
  land a concrete diff or explicitly conclude that no further change is needed.
- Shared artifacts and decision records should carry forward context between
  issues. Open issue count is not the memory system.

## Implementation Trail

- Created `NIT-86` (`Product: audit the last analyst review workflow gaps or
  conclude none remain`) as the only immediate replacement execution issue.
- Cancelled the long-running product lane `NIT-14`.
- Cancelled the governance wrapper `NIT-71`.
- Cancelled the future-dated checkpoint gates `NIT-77`, `NIT-51`, and `NIT-52`.

## Expected Outcome

The active tree should now reflect the real state of execution:

- one immediate product-side code or no-op decision (`NIT-86`)
- no future checkpoint placeholders pretending to be active work
- no governance wrapper consuming attention while adding no direct delivery
  value

This keeps the board's view tighter and makes it harder for issue status alone
to overstate how much real implementation work is currently open.
