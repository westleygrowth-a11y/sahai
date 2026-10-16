# SAH AI Operations Manager

First working milestone: authenticated institutional operations, configurable reporting hierarchy, and nested task delegation. Built with Next.js, React, TypeScript, Tailwind, shadcn/ui, PostgreSQL, Prisma, and pg-boss. This is a development foundation, not a deployed production service.

## Run locally on macOS or Linux

Prerequisites: Node.js 22.12+ (validated here with Node 24), npm, and Docker with Compose.

```bash
npm ci
npm run setup:local
docker compose up -d --wait
npm run db:generate
npm run db:migrate
npm run dev
```

The app listens on port 3000. In a second terminal, start the persistent scheduling worker:

```bash
npm run worker
```

`setup:local` generates private local database credentials and a setup token without printing them. It preserves an existing `.env`. `.env` and `.local/` are ignored by Git. Configure `APP_URL` to the actual application origin; mutation requests from other origins are rejected.

### Start with your own CEO account

Leave the database unseeded, open the app's `/setup` page, and enter your CEO details and the setup token from the private `.local/access.txt` file (or your configured `SETUP_TOKEN`). This is a one-time bootstrap: the first CEO creates subsequent employee accounts through Organization → Add employee. Set `ALLOW_DEMO_SEED=false` for a real workspace.

### Explore the demonstration workspace instead

On an empty local database, run:

```bash
npm run db:seed
```

The seed refuses to overwrite a real workspace, requires `ALLOW_DEMO_SEED=true`, and does not run in production mode. Re-running against an existing demo workspace preserves current data and account passwords.

Demo email addresses use `@demo.sah.local`. Account prefixes: `ceo`, `finance`, `operations`, `accounts`, `academic`, `hr`, `admissions`, `it`, `maintenance`, `technician`, `teacher`, `clerk`, and `admin`. The generated demo password is stored only in the private local configuration and `.local/access.txt`. Do not commit or share it.

The seed labels its institution as demonstration data and creates the confirmed CEO → director → head → supervisor → employee structure, two campuses, and eight example tasks. These are fictional role records, not actual staff accounts.

## What works

- One-time CEO setup, password hashing, database-backed opaque sessions, logout/revocation, expiry, and login throttling.
- Institution/campus creation, configurable departments, employee accounts, reporting-line editing, delegation grants, and sensitive-record grants. Only the CEO changes employee authority. System administrators have separate structural tools without task access.
- CEO-wide and reporting-line dashboards, task creation, private drafts, publication, nested delegation, task trees, list and Kanban views, filtering, and search.
- Acknowledgment, progress, blockers, comments, evidence uploads, manager review/corrections, completion, cancellation, reassignment, and reviewed deadline extensions.
- Preserved task lineage/accountability, mandatory-subtask checks, optimistic concurrency, immutable history and approvals, and database graph constraints.
- Authorized in-app notifications, a rules-based briefing, configurable working days/hours/holidays, idempotent follow-up/escalation simulation, and a persistent 15-minute job schedule.

All task completion currently requires human review; API requests to disable approval are rejected. A subtask cannot exceed its parent's deadline: extend the parent through an authorized review first. Cancelling a parent requires resolving all open children; cancelled mandatory children do not satisfy completion requirements.

## What is simulated or deferred

The briefing is deterministic and explicitly not AI-generated. Reminders and escalations stay in the app. No real messages, OpenAI calls, employee progress inference, ZKTeco/device connections, or biometric collection occur. Attendance and campus maintenance modules, dependency scheduling, real AI tool calling, and communication integrations remain later phases.

Development follow-up defaults are Monday–Friday, 09:00–17:00 Asia/Karachi, at most one reminder per task per day, and an escalation level per 24 overdue hours. These are configurable assumptions, not confirmed institutional policy. CEO users can adjust them in Settings.

## Validate

```bash
npm test
npm run typecheck
npm run build
npm run test:browser
npm audit --omit=dev
```

The unit/integration runner creates and resets only `sahai_test` (or an explicitly configured separate `TEST_DATABASE_URL` ending in `_test`). Browser checks create/reset `sahai_browser_test`, build isolated production output in `.next-browser`, start that build on port 3100, exercise the UI, and stop that server afterward. Both use real PostgreSQL with the repository migrations. They leave the main `sahai` database untouched.

Browser checks use an existing Chromium via `CHROMIUM_EXECUTABLE_PATH`, automatically use `/usr/bin/chromium` when present, or use Playwright's downloaded Chromium. On macOS, run `npx playwright install chromium` first if needed. Screenshots and the current result report are written to ignored `output/playwright/`. The main dev server is independent of the browser test server.

For a local production-build check, stop `npm run dev`, then run `npm run build` and `npm start`. Do not build and run dev simultaneously against the same `.next` directory.

## Data and deployment boundaries

PostgreSQL persists in the Docker volume `sahai_postgres`. Local evidence files persist in `.local/evidence` and are downloaded only through authorized API endpoints. Back up the database and evidence together. Do not delete the database volume or `.local/` to refresh dependencies.

Before snapshotting a cloud workspace, run `npm run db:snapshot`. This stores a private logical database backup in ignored `.local/database.sql`; preserve it together with evidence. After starting a fresh empty local Docker database, `npm run db:restore` restores that backup. Restore refuses to overwrite any database that already contains application tables. Queue infrastructure is recreated by the worker. These local helpers are not a substitute for a production backup policy.

Before real staff use, provide a managed database, TLS and cookie configuration, persistent shared evidence storage with malware scanning and storage quotas, backups with a tested restore, password recovery/account lifecycle procedures, operational monitoring, and approved access and reminder policies. Do not reuse local demo passwords, setup tokens, or the local database configuration for deployment. No application has been published or deployed by this work.

Prisma runs with its supported JavaScript driver adapter. Required engine/artifact verification remains enabled. `deepmerge-ts` is overridden to the patched 8.0.2 release to address the recursive-merge advisory in Prisma's tooling dependency; generation, migrations, tests, and build were checked with this override.

See [architecture and permissions](docs/ARCHITECTURE.md), [master requirements](docs/MASTER_PROMPT.md), [development instructions](AGENTS.md), and [skill inventory](SKILLS.md).

For hosted setup, see [Railway deployment](docs/RAILWAY.md). The web service requires a separate Railway PostgreSQL service and a `DATABASE_URL` reference; migrations now run automatically at production startup.

## Team user guide

Open `/guide.html` on the deployed application for the interactive CEO, director, department-manager, and employee guide. The guide includes expandable walkthroughs, temporary daily checklists, practice questions, and a shared reference. It does not modify workspace data. Source: [public/guide.html](public/guide.html).
