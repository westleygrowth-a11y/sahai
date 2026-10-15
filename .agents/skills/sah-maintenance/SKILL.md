---
name: sah-maintenance
description: Maintain SAH AI Operations Manager through debugging, dependency updates, migrations, security reviews, operational checks, backups, and incident diagnosis.
---

# SAH Maintenance

1. Read AGENTS.md, the master prompt, repository scripts, and the current incident or maintenance scope. Capture the baseline and preserve existing work before changing anything.
2. Reproduce the issue and trace evidence through application, database, job, and integration boundaries. Use systematic-debugging for unexplained failures; distinguish code defects from unavailable services or credentials.
3. Propose the smallest supported correction. For schema and data changes, document compatibility, data impact, backup requirements, and rollback or forward-recovery strategy before execution.
4. Keep secrets and personal data out of diagnostics. Apply relevant security-best-practices and security-threat-model guidance without claiming a formal security certification.
5. Run targeted regression checks and the required repository quality gates. For browser-visible changes, use Playwright or the supported browser tools. Validate restoration before claiming backups are recoverable.
6. Review affected permissions, scheduled jobs, API contracts, and audit history. Document observed impact, verification evidence, and unresolved risks. Do not deploy or modify production data without authorization.

## Confirmed project basis

The campus maintenance module belongs under HR & Administration and follows the core delegation engine. Model requests, assets, rooms, work orders, technician assignments, evidence and human completion verification in a later phase. Route financial approvals through authorized Finance/management policy; do not invent approval limits.
