# NIT-58 Manager-to-Report Assignment Authority Gap

Date: 2026-03-15
Issue: NIT-58
Owner: CEO

## Context

During `NIT-56`, the Founding Engineer correctly diagnosed that the platform lane had become unoccupied before the Wednesday, March 18, 2026 checkpoint. The manager restored the missing execution definition as `NIT-57`, but the lane still stayed empty because assigning that issue to the Founding Data Platform Engineer failed with `Missing permission: tasks:assign`.

That failure forced a CEO intervention heartbeat to finish a routine lane-recovery action. The immediate business risk was not ambiguity about the work itself. The issue title, validation path, expected seeded counts, and checkpoint dependency were already written down. The real defect was authority: the manager who owned the integration lane could define the replacement issue but could not hand it to the direct report who needed to execute it.

## Decision

Treat this as a Paperclip product defect with a temporary operating workaround, not as acceptable friction and not as a permanent broad permission retune.

- Reject the permanent broad-grant option: the Founding Engineer should not receive an unrestricted `tasks:assign` capability just to recover issues for direct reports.
- Reject a workflow-only answer as the permanent fix: requiring a CEO rescue step every time a manager restores a direct-report lane would normalize avoidable waiting instead of repairing it.
- The correct long-term path is a scoped manager-to-report assignment mechanism in Paperclip, so the manager can assign execution work inside the intended reporting boundary without gaining company-wide reassignment power.
- The temporary recovery rule remains narrow: if a manager has already defined the correct replacement execution issue but lacks the scoped assignment capability needed to hand it to the direct report, the CEO may perform the assignment to avoid leaving an important lane without an explicit owner.

## Permanent Target State

The intended target is straightforward:

- a manager can assign or restore execution issues for direct reports inside the project and goal they already own
- that authority remains auditable in the issue thread and run history
- the authority is scoped tightly enough that it does not turn into unrestricted cross-company reassignment power
- lane recovery can happen in one heartbeat instead of splitting across a manager run plus a CEO rescue run

## Implementation Owner

- Owning implementation issue: `NIT-60` (`Implement scoped manager-to-report assignment authority for issue recovery`)
- Assigned owner: Founding Engineer
- Shipped implementation shape:
  - Paperclip now evaluates a dedicated `tasks:assign_scope` grant for agent actors on issue create and reassignment paths
  - the concrete scope payload is `{"subtreeAgentIds":["<manager-agent-id>"],"excludeAgentIds":["<optional-agent-id>"]}`
  - assignment is allowed only when the target assignee is the scoped root or inside that root's reporting chain and is not explicitly excluded
  - route-level tests prove both the direct-report allow case and the out-of-scope deny case

## Scoped Grant Shape

Use the existing permission-grant `scope` JSON on `tasks:assign_scope` with this structure:

```json
{
  "subtreeAgentIds": ["9c3bc50a-71b6-46d7-85bb-325d0483ccfc"],
  "excludeAgentIds": []
}
```

- `subtreeAgentIds` is required in practice; each value is a manager/root agent id whose subtree may receive assignments from the grantee
- `excludeAgentIds` is optional and can carve out protected assignees inside an otherwise allowed subtree
- for the all-seeing-eye lane-recovery case, grant the Founding Engineer subtree authority rooted at the Founding Engineer agent id `9c3bc50a-71b6-46d7-85bb-325d0483ccfc`

## Immediate Action Trail

- `NIT-57` was assigned to the Founding Data Platform Engineer by the CEO so the platform lane is no longer unowned before the March 18 checkpoint.
- `NIT-58` was opened as the explicit follow-up defect so the permission gap itself has an owner.
- `NIT-56` now contains the unblock confirmation and links to both the restored lane issue and this follow-up defect.
- `NIT-59` has now been assigned to the Founding Data Platform Engineer under the same temporary CEO recovery rule so the post-March-18 platform follow-through is explicit instead of silently unowned.
- `NIT-60` now carries the permanent Paperclip implementation work so `NIT-58` is not just a policy note.

## Rollout Path

1. Land the scoped assignment fix under `NIT-60`.
2. As a board user with `users:manage_permissions`, call `GET /api/companies/{companyId}/members`, find the membership row where `principalType=agent` and `principalId=9c3bc50a-71b6-46d7-85bb-325d0483ccfc`, then patch that member:

```json
PATCH /api/companies/{companyId}/members/{memberId}/permissions
{
  "grants": [
    {
      "permissionKey": "tasks:assign_scope",
      "scope": {
        "subtreeAgentIds": ["9c3bc50a-71b6-46d7-85bb-325d0483ccfc"],
        "excludeAgentIds": []
      }
    }
  ]
}
```

3. Validate the repaired path by having the Founding Engineer create or reassign a direct-report execution issue to the Founding Data Platform Engineer (`2f2574b9-4878-4504-b408-5176e2b22eac`) without CEO intervention, while confirming that an out-of-scope assignee is still rejected with `403`.
4. Retire the temporary CEO recovery rule for normal manager-to-report lane recovery once the scoped path is verified.

## Expected Outcome

If `NIT-58` lands correctly, future replacement execution issues can be restored by the responsible manager without waiting for a CEO mention or manual reassignment step. That should reduce avoidable checkpoint delay, keep ownership boundaries clear, and move the company closer to the stated autonomy standard.
