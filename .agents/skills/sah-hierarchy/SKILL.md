---
name: sah-hierarchy
description: Define or review SAH AI Operations Manager organizational hierarchy, role scopes, reporting lines, delegation, and authorization. Use for access-control matrices, organizational schemas, or hierarchy changes.
---

# SAH Hierarchy

1. Read AGENTS.md and the user-provided master development prompt before making domain decisions. Use the confirmed hierarchy in the master prompt and the policy below.
2. Extract the actual roles, organizational units, reporting relationships, tenant boundaries, and delegation requirements. Record unresolved choices; do not invent role names or permissions.
3. Produce a permission matrix covering actor, resource, action, organizational scope, and exceptions. Distinguish job title, reporting relationship, and authorization role.
4. Design server-side authorization and database enforcement together. Deny unspecified access; enforce scope on list, detail, mutation, export, and agent-tool paths. Do not rely on hidden UI controls.
5. For hierarchical data, account for cycles, reassignment, inactive users, historical ownership, and concurrent changes. Select a representation only after examining approved query patterns and database choices.
6. Test allowed and denied access, cross-scope identifiers, privilege escalation, and scope changes. Report the approved policy, implementation boundaries, and actual test results.

## Confirmed project basis

Preserve the confirmed CEO → Finance Director → Accounts and CEO → Operations Director → Academic, HR & Administration, Admissions, IT hierarchy. Principals are Academic Department Heads. Maintenance reports through HR & Administration. Keep technical administration separate from business authority. Read ../../../docs/ARCHITECTURE.md before changing authorization.
