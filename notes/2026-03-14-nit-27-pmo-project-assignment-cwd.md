# NIT-27 PMO Project-Assignment CWD Fix

Date: 2026-03-14
Issue: NIT-27
Owner: CEO

## Context

The board asked for a project progress report that covered team-wide status, remaining issues, and progress rate. The same issue also recorded that PMO had failed to do the work.

The failing PMO heartbeat was run `18be45df-dd21-4c07-aeef-9a40b9e9bc38` at 2026-03-14 13:01 KST.

## Findings

- PMO was woken on the project issue in the `all-seeing-eye.integration` workspace.
- The OpenCode adapter launched with the project workspace as its process `cwd`.
- PMO `AGENT_HOME` remained `/Users/gun9/Developer/nitro/ceo/agents/pmo`, which is outside that project workspace.
- OpenCode then auto-rejected `read` calls for `HEARTBEAT.md`, `SOUL.md`, `TOOLS.md`, and the PMO daily note as `external_directory`.
- The failure was runtime configuration drift, not PMO judgment or missing role guidance.

## Decision

Patch `opencode_local` so that when:

- a project-assigned run provides a workspace `cwd`,
- the agent also has a configured company-root `cwd`,
- and `AGENT_HOME` sits under the configured root but outside the project workspace,

the adapter keeps `PAPERCLIP_WORKSPACE_CWD` pointed at the project workspace but runs OpenCode from the configured company-root `cwd`.

This preserves access to both:

- project files under the assigned workspace
- personal agent files under `AGENT_HOME`

without requiring the agent to request cross-directory access.

## Changes Made

- Patched `paperclip/packages/adapters/opencode-local/src/server/execute.ts`
- Added regression coverage in `paperclip/packages/adapters/opencode-local/src/server/execute.test.ts`
- Patched the installed runtime copy at `~/.npm/_npx/43414d9b790239bb/node_modules/@paperclipai/adapter-opencode-local/dist/server/execute.js`

## Verification

- Manual dist-level verification confirmed the new resolver chooses `/Users/gun9/Developer/nitro/ceo` for project-assigned PMO runs while preserving `PAPERCLIP_WORKSPACE_CWD=/Users/gun9/Developer/nitro/ceo/all-seeing-eye.integration`.
- Manual dist-level verification also confirmed normal workspace-local cases still keep the workspace `cwd`.
- Full `vitest` execution was not possible because `vitest` is not installed in the local `paperclip/` workspace.

## Project Snapshot At Decision Time

- Project issues: 8 total
- Done: 5
- In progress: 3
- Issue-completion rate: 62.5%
- Active engineering tracks:
  - NIT-13 platform track: done
  - NIT-14 product track: in progress
  - NIT-16 integration track: in progress

## Follow-Up Risk

- PMO status in Paperclip will remain visually stale until the next successful PMO heartbeat clears the current `error` state.
- `NIT-24` is still in `backlog`, so the broader PMO doctrine rollout remains unstarted even after the runtime fix.
