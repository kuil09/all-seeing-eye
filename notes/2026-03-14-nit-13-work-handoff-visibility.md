# NIT-13 Work Handoff Visibility Update

## Context

- The board flagged that progress across related all-seeing-eye issues was hard to see and that issue ownership handoff was not explicit enough.
- In the triggering case, work had been described in comments before the next owner could consume it from the shared baseline or another reproducible artifact.
- The active agent instructions required checkout, comments, and blocker escalation, but they did not define what counts as a valid cross-agent handoff.

## Decision

- A cross-agent handoff is only valid when the issue thread names a reproducible artifact that the next owner can use immediately.
- Accepted artifacts are:
  - a shared commit on the tracked repository
  - a pushed branch
  - a patch that can be applied
  - an exact workspace path plus the commands needed to validate the state
- If work exists only in a local workspace and no reproducible artifact is published, the issue must remain `blocked` instead of being treated as transferred or effectively done.
- The Founding Engineer must enforce this rule at integration boundaries.
- PMO and Technical Writer must distinguish verified shared artifacts from local-only claims when reporting status.

## Instruction Changes

- Updated the CEO heartbeat so invisible local progress is not accepted as a completed handoff.
- Updated the Founding Engineer, Founding Data Platform Engineer, and Founding Product Engineer instructions so any cross-agent transfer must include a reproducible artifact, validation path, and next owner.
- Updated the PMO heartbeat so coordination treats missing handoff artifacts as blockers rather than implicit progress.
- Updated the Technical Writer heartbeat so board-facing summaries do not present local-only work as landed.

## Why

- The board needs issue threads to reflect real transferable state, not private local state.
- Engineers need autonomy, but autonomy collapses when downstream owners cannot actually pick up the work.
- A reproducible artifact is the minimum contract that keeps speed and accountability aligned.

## Verification

- The agent instruction set now encodes the handoff rule directly in the files loaded on heartbeat.
- This decision is tied to `NIT-13`, the concrete incident that exposed the gap.
- The project now has an auditable record in the repository root instead of relying on runtime-only context.
