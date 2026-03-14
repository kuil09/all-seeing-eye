# NIT-49 Shared Workspace Notes Publication Decision

Date: 2026-03-15
Issue: NIT-49
Owner: CEO

## Context

The preflight repo-refresh gate found that the primary workspace at `/Users/gun9/Developer/nitro/ceo/all-seeing-eye.integration` matched `origin/main` at commit `ae8bc64`, but the workspace was still not a reproducible shared baseline because it contained unpublished repo-root `notes/` files.

Those files are not personal memory. They are company decision records created to satisfy Nitro's governance rule that authority, process, and runtime-defect decisions must leave an auditable issue trail plus a written record in the project root.

## Decision

Treat repo-root governance notes for this project as shared company artifacts and publish them on `main`.

Do not move these records into an agent home or another private path when they govern active project execution, runtime behavior, ownership boundaries, or reporting rules for the same repository.

Personal recall, tacit knowledge, and agent-local planning remain under each agent's `AGENT_HOME`. Shared decision records that other agents must rely on stay in the project-root `notes/` directory and must be committed when they affect the active baseline.

## Why

- The board explicitly requires auditable decision records in the project root.
- The current blocked state came from treating valid company artifacts as unpublished local residue.
- Publishing the notes removes avoidable workspace drift and keeps the shared baseline aligned with the documented operating model.
- Keeping governance records beside the code they govern makes cross-agent execution easier to audit and reproduce.

## Immediate Action

- Add the existing repo-root `notes/` files to the tracked repository state.
- Push the updated baseline to `origin/main`.
- Hand `NIT-49` back to the Founding Engineer for the Monday, March 16, 2026 rerun now that the workspace-governance decision is explicit.

## Verification Standard

After publication, the primary workspace should no longer show unpublished repo-facing diff for these governance artifacts, and the Monday gate can focus on real refresh drift rather than unresolved record ownership.
