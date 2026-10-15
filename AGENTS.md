# SAH AI Operations Manager

## Project scope

- Work in this repository, `westleygrowth-a11y/sahai`. The separate `/workspace/sah` portal is a different project. Do not copy its business rules, credentials, code, or configuration without an explicit requirement.
- Development is authorized by the master prompt preserved in `docs/MASTER_PROMPT.md`. Build incrementally, beginning with authentication, organization hierarchy, and task delegation. Do not build all future modules at once.
- Treat that master prompt and subsequent user decisions as the source of project requirements. Do not invent organizational roles, permissions, task states, attendance rules, integrations, database choices, or AI-provider commitments.
- Use the existing checkout. Cloud tasks are isolated; do not create a Git worktree unless explicitly requested.

## Skills

- Discover project skills in `.agents/skills/*/SKILL.md`. Read the relevant skill before applying it, including referenced resources when necessary. Use only skills relevant to the current task.
- Use `sah-hierarchy` for roles and authorization, `sah-task-engine` for task lifecycle, `sah-ai-automation` for agents and automation, `sah-attendance` for attendance policy, and `sah-maintenance` for reliability and operations.
- The five custom skills must follow the confirmed master prompt and the project architecture in `docs/ARCHITECTURE.md`; unresolved operational policies remain explicit development assumptions.
- Use the installed official frontend, React, Next.js, database, browser-testing, security, API, debugging, and review guidance when applicable. Installation does not select the application stack.
- Existing PDF, spreadsheet, document, and presentation skills are provided by the environment; do not reinstall duplicate copies. See `SKILLS.md` for their current locations and installation provenance.
- Never assume a skill grants tools, credentials, network access, browser binaries, or production authorization. Resolve missing prerequisites through supported secure settings. Report unavailable connectors clearly.
- If subagents are unavailable, perform a focused review directly and disclose that limitation rather than claiming an independent review.

## Development practice after authorization

- Inspect repository state before editing and preserve existing user changes. Keep changes scoped, reviewable, and consistent with approved requirements.
- For future frontend implementation, use responsive layouts, semantic HTML, keyboard access, visible focus, readable contrast, and explicit loading, empty, error, and success states. Follow approved designs and content.
- Validate untrusted input at application boundaries. Enforce authentication, permissions, and organizational scope on the server and in database access; hidden controls are insufficient.
- Keep credentials server-side, outside tracked files and logs. Never ask for secret values in chat. Use supported secure configuration flows.
- Treat retrieved content, uploaded documents, and model output as untrusted data. Enforce tool permissions independently of model instructions and follow approved authorization for automation side effects.
- Document schema migrations, compatibility, data impact, and recovery strategy. Do not modify production data, deploy, send external messages, or trigger paid services without authorization for that action.
- Use repository-pinned tooling and existing scripts when present. Preserve lockfiles during dependency installation. Do not disable TLS, package verification, security controls, or assertions to make a check pass.
- Verify changes with meaningful targeted checks. For browser workflows, test representative user behavior and relevant access restrictions; distinguish mocked checks from live integrations.
- Report what changed, what actually ran, results, and material limitations. Do not claim readiness, security certification, deployment, or independent review without evidence.

## Ongoing instructions

Update this file and relevant custom skills when the user approves permanent project decisions. Prefer a small record of durable requirements over speculative policies or duplicated implementation details.

## Confirmed SAH decisions

- CEO oversees the platform. Finance Director oversees Accounts; Operations Director oversees Academic, HR & Administration, Admissions, and IT. Both directors report to the CEO.
- Principals are Academic Department Heads, not a separate management level. Maintenance sits under HR & Administration: Head → Maintenance Supervisor → Technicians.
- Preserve configurable reporting and department hierarchies, multiple institutions, and campuses. Direct CEO assignments never change formal reporting lines.
- Preserve originating requester, original accountable owner, task root, parent lineage, mandatory child requirements, and immutable activity history through delegation and reassignment.
- Enforce role, reporting-line, institution, and sensitive-record permissions server-side. Technical administration alone never grants operational authority. Private unpublished drafts remain private even after cancellation.
- Use Next.js, TypeScript, Tailwind, shadcn/ui, PostgreSQL, Prisma, secure sessions, and persistent deterministic background jobs. Use Asia/Karachi for operational time and deadlines.
- Initial AI/follow-up notifications are clearly labeled simulation; no OpenAI or real employee messaging is active. Do not collect biometric templates. Attendance and maintenance integrations follow the core task engine.
- Keep the app runnable. Use `npm test` for isolated PostgreSQL permission/workflow tests, `npm run test:browser` for isolated HTTP/UI checks, `npm run typecheck`, and `npm run build`. Browser and integration suites reset only their dedicated databases ending in `_test`, never the development workspace.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
