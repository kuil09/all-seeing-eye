# NIT-34 Progress Visibility Minimum Operating Model

Date: 2026-03-14
Issue: NIT-34
Owner: CEO

## Context

The board asked for the lightest useful way to monitor engineering progress while coding work is still sitting in local worktrees and has not yet been merged or closed.

The immediate trigger was a trust gap around PMO reporting. The board experienced runs that showed multiple tool or runtime errors while the final reporting language still sounded successful or complete.

## Findings

- The existing handoff-artifact rule from `NIT-13` fixed transfer ambiguity, but it did not fully solve in-flight visibility before handoff or merge.
- Most of the recent PMO confusion came from two separate runtime defects plus one reporting defect:
  - `NIT-25`: recovered OpenCode tool errors were misclassified as terminal failure.
  - `NIT-27`: PMO could not read its own agent files when a project-assigned OpenCode run launched from the project workspace `cwd`.
  - Active issue comments still lacked one stable taxonomy that separates landed work from local-only but reproducible work.
- Without that taxonomy, the board only sees a noisy mix of issue status, run noise, and free-form comments.

## Decision

Adopt one minimum visibility model for active coding issues. Every board-facing progress report must classify work as exactly one of these states:

- `verified-shared`: progress is backed by a shared commit, branch, patch, or landed artifact linked in the issue thread.
- `verified-local`: progress is not yet shared, but the owner comment names the exact workspace path and validation commands needed to inspect or reproduce the current state.
- `blocked`: progress is waiting on a named blocker owner or missing dependency.
- `needs-evidence`: the thread claims progress, but there is no reproducible artifact or exact local verification path yet.

## Operating Rules

- Every active coding issue must end a heartbeat with a concise status comment.
- That comment must preserve the visibility state above instead of collapsing everything into generic progress text.
- If work is still local-only, the owner must publish the exact workspace path plus validation commands.
- PMO, Technical Writer, and the CEO must not flatten `verified-local` work into landed, handed-off, or completed work.
- If an issue has only vague progress language, PMO must report it as `needs-evidence` until the owner repairs the thread.

## Why This Is The Minimum Useful Method

- It uses the current Paperclip issue thread as the source of truth.
- It reuses the already accepted reproducible-artifact contract from `NIT-13`.
- It does not require a new dashboard, database, or telemetry pipeline.
- It gives the board a stable answer to the real question: what is landed, what is only locally inspectable, what is blocked, and what is still unverified.

## Implementation Trail

- Updated heartbeat guidance for the CEO, PMO, Founding Engineer, Founding Data Platform Engineer, Founding Product Engineer, and Technical Writer so the visibility states are encoded on disk.
- Created child issue `NIT-36` and assigned it to PMO to run the daily verified progress digest using this model.

## Expected Outcome

The board should be able to monitor execution without waiting for merge or issue closure, while still keeping a hard line between shared progress and local-only progress.
