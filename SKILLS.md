# SAH AI skill inventory

This inventory records the skill-preparation stage. Application development was subsequently authorized by the master prompt in docs/MASTER_PROMPT.md; see README.md for the working foundation.

## Already present

| Skill | Availability |
| --- | --- |
| `cloud-environment-onboarding:setup` | Active cloud skill supplied by the environment |
| `pdf` | Existing local built-in, `/home/agent/.codex/skills/builtins/pdf/SKILL.md` |
| `Spreadsheets` | Existing local built-in, `/home/agent/.codex/skills/builtins/spreadsheets/SKILL.md` |
| `documents` | Existing local built-in, `/home/agent/.codex/skills/builtins/documents/SKILL.md` |
| `Presentations` | Existing local built-in, `/home/agent/.codex/skills/builtins/presentations/SKILL.md` |

The four built-in skills also have copies in `/opt/codex/skills/builtins`; these are environment-provided copies, not additional installations made for this project. SDK and tool-package internal skill examples were not counted as installed user skills. The executor skill registry initially returned no entries; the built-ins above were verified directly on disk.

## Newly installed official skills

All are project-scoped under `.agents/skills/`. Names below are the SKILL.md names; the shadcn and Supabase folders were normalized to those names without modifying their contents.

| Area | Installed skills |
| --- | --- |
| Professional frontend design | `frontend-app-builder`, `shadcn` |
| React and Next.js | `react-best-practices`, `nextjs` |
| Database architecture and performance | `supabase-postgres-best-practices` |
| Security review | `security-best-practices`, `security-threat-model`, `security-ownership-map` |
| Browser testing | `playwright`, `frontend-testing-debugging` |
| AI agents and API integrations | `agents-sdk`, `openai-docs`, `openai-api-troubleshooting`, `openai-platform-api-key` |
| Review and debugging | `systematic-debugging`, `requesting-code-review`, `receiving-code-review`, `gh-address-comments`, `gh-fix-ci` |
| Skill management | `skill-installer`, `skill-creator` |

Count: 21 official skills. PDF and spreadsheet skills were already available and were not reinstalled.

## Custom skills

Created with official skill-creator's `init_skill.py`, each with SKILL.md and agents/openai.yaml:

- `sah-hierarchy`: hierarchy, role scope, authorization matrices, and access tests.
- `sah-task-engine`: task lifecycle, ownership, deadlines, transitions, and auditability.
- `sah-ai-automation`: agent contracts, safe tool access, retries, and evaluations.
- `sah-attendance`: policy intake, shifts, timestamps, corrections, and privacy.
- `sah-maintenance`: diagnosis, migrations, verification, and operational recovery.

The master prompt has now supplied the confirmed hierarchy, lifecycle, stack, and simulation boundaries. Custom skills reference those decisions; unresolved operational policies remain explicitly provisional.

## Sources and installation method

- Current official catalog: [openai/plugins](https://github.com/openai/plugins), commit `0722921d5542fc593105c27bd52630babd8b8c2a`.
- Official installer, creator, and legacy curated skills: [openai/skills](https://github.com/openai/skills), commit `49f948faa9258a0c61caceaf225e179651397431`.
- The skills repository labels itself deprecated and directs current discovery to openai/plugins. Its official installer still supports installing skill paths from that repository.
- Installed using the unmodified official `install-skill-from-github.py`, with explicit source commits and `--dest /workspace/sahai/.agents/skills`. No global existing skill was overwritten.
- `skills-lock.json` records source directories and file hashes. External skill contents retain their upstream licenses and guidance.

## Discovered plugins and remaining prerequisites

| Plugin or capability | Discovery result and status |
| --- | --- |
| Build Web Apps | Official catalog bundle; relevant skill files installed. No plugin runtime registered. |
| Vercel | Official catalog bundle; Next.js guidance installed. Vercel account integration is not connected for sahai. |
| Supabase | Official catalog integration; database best-practice guidance installed from Build Web Apps. No project provisioned or database MCP connected. |
| OpenAI Developers | Official catalog and recommended plugin; relevant skill files installed. Platform key provisioning and docs MCP tools are not available in this chat. |
| Figma | Official catalog and recommended plugin; optional design-account integration, not installed or connected. Not needed to use local frontend guidance. |
| Codex Security | Official catalog and recommended plugin; hosted security tools are not available. Local security review skills installed instead. |
| Superpowers | Official catalog bundle; selected debugging/review skills installed. Installing a skill does not install all bundle commands or agents. |
| CodeRabbit, Sentry, GitHub | Official catalog review/diagnostic integrations; not connected. GitHub Git reads work, but the GitHub API previously returned Forbidden; PR and CI skills need suitable API access. |
| PDF and spreadsheets | Existing built-ins retained. No account connection is needed for ordinary local document generation; live Google/Office access is separate. |
| Playwright | Skill and wrapper files installed. Browser runtime installation and launch are separate and will be checked when browser testing is requested. |

No supported callable installer for these plugin bundles is exposed in this chat. The available plugin suggestion tool requires an explicitly named recommended plugin; no connector installation was claimed from copying skill files. Optional account integrations can be installed through the supported product plugin UI when selected. No application accounts, API keys, paid services, or databases have been provisioned.

## Verification and activation

Verified all 26 project manifests are readable and match their directory names. All 26 passed official quick_validate.py. All 21 official skill trees matched their pinned upstream copies byte-for-byte. The five custom skills also passed UI-metadata and template-placeholder checks. The installed installer and creator CLI help commands executed successfully. Installation is on disk in the standard project discovery directory. Newly installed skills are expected to become available on the next turn; if the client does not refresh discovery, start a new Codex session in this repository. This does not establish that optional tool connectors or live provider calls work.

To invoke a custom skill, for example: `Use $sah-task-engine to review the task lifecycle in my master prompt.`
