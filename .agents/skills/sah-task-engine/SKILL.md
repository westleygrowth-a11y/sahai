---
name: sah-task-engine
description: Define or review SAH AI Operations Manager task workflows, assignments, statuses, deadlines, approvals, dependencies, recurrence, or task audit history.
---

# SAH Task Engine

1. Read AGENTS.md and the master prompt. Do not import task statuses or spreadsheet rules from the separate sah repository unless the user explicitly adopts them.
2. Extract the approved lifecycle, assignment policy, priority semantics, completion evidence, dependency rules, recurrence, and approval authority. Mark missing business decisions explicitly.
3. Write a transition table: current state, requested action, permitted actor and scope, prerequisites, resulting state, and emitted events. Keep a status change distinct from an approval or deadline request.
4. Make transitions atomic and validate authorization on the server. Plan optimistic concurrency, idempotency for retried requests, and durable audit records where the requirements call for them.
5. Define timezone, deadline boundaries, overdue calculation, business-calendar assumptions, and recurring-task generation before implementing scheduling. Never assume a timezone from the execution host.
6. Test transitions and rejected transitions, reassignment, duplicate events, concurrent edits, dependency cycles, and deadline boundaries using approved examples. Keep notifications separate from committed task state.

## Confirmed project basis

Use the nine statuses in ../../../docs/MASTER_PROMPT.md. Preserve original accountable owner, requester and task lineage. Enforce mandatory-child completion and a separate human reviewer. Unpublished tasks stay private even when cancelled. Review current domain services and migrations before altering a transition.
