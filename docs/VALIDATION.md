# First milestone validation

## Executed checks

| Check | Observed result |
| --- | --- |
| `npm test` | 23 passed, zero failed/skipped; pure policy/time tests and real PostgreSQL integration tests |
| `npm run typecheck` | Passed |
| `npm run build` | Passed; dynamic app/API routes and CSP proxy compiled |
| `npm run test:browser` | Nine workflow groups passed against an isolated production build and PostgreSQL database |
| `npm audit` | Zero reported vulnerabilities across installed dependencies, including development dependencies |
| Persistent worker | Started, accepted a pg-boss job, and completed it; outside-hours result correctly skipped reminders/escalations |
| Database migrations | Both SQL migrations applied; repeated deployment reported no pending migrations |
| Installation repeatability | Saved install script exercised using `npm ci`; existing settings and database preserved |
| Database recovery | Logical snapshot restored into a newly created isolated database; user, task, activity, and bootstrap counts matched; the temporary restore database was removed |
| Custom skill validation | Five updated custom skills passed the official creator validator |

The test suites reset only dedicated databases ending in `_test`. The main development database was not reset or replaced.

## Functional coverage

Unit and database checks include reporting depth/cycles, inactive-manager traversal, cross-institution boundaries, direct CEO assignment without reporting changes, Finance/Operations visibility, restricted HR/finance classifications, system-admin separation, password verification, hashed sessions, expiry, inactive accounts, throttling, nested lineage/accountability, parent deadlines, task transitions, evidence requirements, separate review, immutable history, mandatory children, deadline requests, session revocation, stale/concurrent updates, draft publication/privacy, cancelled-draft privacy, approved employee delegation, cross-department grants, weekly completion metrics, Karachi calendar boundaries, weekend/holiday skipping, reporting-line escalation, and retry deduplication.

Browser/API flows executed:

1. Create the initial CEO through the real setup form and verify setup closes.
2. Render the authenticated dashboard; reject anonymous API access and a foreign-origin mutation.
3. Create an assignment through the CEO UI.
4. Delegate through Operations → HR → Maintenance → Technician through separate authenticated UI sessions.
5. Upload evidence into protected storage and render the authorized download link.
6. Acknowledge, progress, and submit as the technician; verify immutable activity appears and unrelated Finance work is absent; check mobile document width.
7. Approve the submission as Maintenance Supervisor.
8. Create an employee record through the CEO hierarchy editor.
9. Verify the System Administrator can open organization tools while receiving no operational tasks.

## Review and fixes

An independent reviewer inspected the domain services, API dispatcher, migration, and relevant tests. Findings fixed and regression-tested: private draft access across endpoint paths, silent draft publication on reassignment, CEO self-reassignment, completion metrics based on comments rather than approval time, unsupported approval bypass, cross-department UI targeting, authorized employee reporting, and cancelled unpublished draft disclosure. A focused follow-up confirmed the publication guard closed the residual draft issue; no remaining finding was reported in that follow-up. This is a development review, not a comprehensive security certification.

## Visual and responsive checks

The Browser plugin was unavailable, so Playwright used the installed `/usr/bin/chromium`. Production screenshots are retained in ignored `output/playwright/ceo-desktop.png` and `employee-mobile.png`; the current runner report is `output/playwright/results.json`. No browser page errors or console errors were observed in the passing run.

The reference at `.local/design-reference.png` and the latest screenshots were inspected with `view_image`. Native browser viewports checked: 1536×1024 desktop and 390×844 mobile; full-page screenshots preserve vertical content. Concrete comparison points: navy/charcoal surface palette, blue action and navigation treatment, sidebar/header structure, four metric cards, task-table hierarchy/status colors, attention/briefing panels, division workload sections, and mobile navigation/table adaptation.

Intentional reference differences preserve the master requirements: actual confirmed department/role names replace generated fictitious ones; real status names, dates, and database metrics replace sample copy; eight seed tasks replace the reference's shorter table; mandatory-child, evidence, extension, and approval controls are functional additions. Employee mobile shows personal work rather than empty division sections. No marketing copy or fake AI claims were added. The visual direction was verified against the reference with these explicit functional/data adaptations; it is not claimed as a pixel-identical reproduction of the generated sample.

## Limits

No live OpenAI, biometric, messaging, or production employee integrations were exercised or claimed. Docker-volume restoration in a new cloud task has not been independently verified; the logical restore path was verified. macOS commands are documented but have only been run in this Linux environment. No GitHub push, deployment, or environment publication has been performed.
