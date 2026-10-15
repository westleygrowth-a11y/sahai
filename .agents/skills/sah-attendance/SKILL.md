---
name: sah-attendance
description: Define or review SAH AI Operations Manager attendance, shifts, check-in/out, leave interactions, lateness, corrections, or attendance reporting.
---

# SAH Attendance

1. Read AGENTS.md and the master prompt. Obtain attendance policy from approved requirements; do not invent shifts, grace periods, deductions, leave rules, location tracking, or biometric requirements.
2. Document work timezone, shift ownership, overnight shifts, holidays, remote-work rules, check-in/out semantics, and the authority to correct records. Keep recorded events separate from derived policy outcomes.
3. Model event timestamps, source, actor, corrections, and audit history. Preserve original events when corrections are approved. Resolve duplicate submissions and concurrent check-ins deterministically.
4. Limit employee visibility and manager editing to authorized scopes on the server and exports. Minimize sensitive data collection and apply the approved retention policy. Do not infer consent for surveillance.
5. Use explicit timezone conversion and trusted server timestamps where appropriate. Cover daylight-saving changes when applicable, midnight boundaries, missing check-outs, offline submissions, and disputed records.
6. Test approved policy examples and rejected edits. Keep attendance separate from payroll consequences unless the master prompt expressly defines that integration.

## Confirmed project basis

SAH uses ZKTeco hardware, but the model and protocol remain unconfirmed. Start the later attendance module with a mock provider and employee-to-device ID mapping. Never collect fingerprint or biometric templates. Attendance exceptions must not automatically trigger discipline.
