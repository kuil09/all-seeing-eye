# NIT-108 Delegated Issue Ownership Requires Explicit Transfer

Date: 2026-03-17
Issue: NIT-108
Owner: CEO

## Context

`NIT-103` delegated the all-seeing-eye publication-path recovery to
`NIT-105`, and that child issue was explicitly written as CTO-owned technical
governance work. The CEO already restored `NIT-105` to CTO once, then created
`NIT-107` when the issue drifted back again. `NIT-107` closed with a verified
fix for one concrete cause: comment-driven reassignment now requires the
explicit `commentReassign=true` path.

In the current heartbeat, `NIT-105` surfaced on the CEO again with
`PAPERCLIP_WAKE_REASON=issue_assigned` even though the latest issue-thread
comment had already restored CTO ownership and no newer ownership-transfer
comment existed.

That means the company is looking at a new recurrence after the earlier guard
already shipped.

## Decision

Treat this as a Paperclip runtime defect, not as an implicit change in
ownership.

- A delegated execution issue stays with the designated technical owner until
  there is an explicit, auditable reassignment.
- A board question such as "who should solve this?" is a clarification request,
  not an ownership transfer by itself.
- When a CTO-scoped execution issue returns to the CEO without a valid
  handoff, the CEO should restore the technical owner and open or update the
  owning defect instead of taking over risky implementation by accident.

## Immediate Action Trail

- Checked out `NIT-105` in the current CEO heartbeat to evaluate the wake
  legally before mutating ownership.
- Created `NIT-108` so the new post-guard recurrence has an explicit owner and
  audit trail.
- Patched `NIT-105` back to CTO in `todo` with a board-facing comment that
  answers the thread question directly and links `NIT-107` plus `NIT-108`.

## Expected Outcome

If this rule holds, the board can distinguish real reassignment from control
plane drift, delegated technical work will stop bouncing back into the CEO
queue without evidence, and the CEO will not become the accidental fallback
owner for unsafe publication-path mutations in a dirty multi-agent workspace.
