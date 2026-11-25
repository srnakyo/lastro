# Lastro roadmap

Lastro is being built as a complete product, not an MVP. The [PRD](docs/prd/README.md) describes the product; this file tracks the build. Update the status of each phase as soon as it closes, and only close a phase after its verification passes.

## Decisions that drive the build

- **Multi-project.** One Lastro server holds every project. The dashboard has a project switcher and the project is part of the URL.
- **Postgres is the source of truth.** The dashboard, the MCP server and the CLI write through the API. `lastro export` writes a deterministic `.lastro/` snapshot into the repository for review in pull requests and for offline gates in CI. `lastro import` loads a `.lastro/` snapshot into the server.
- **The dashboard is the center of the product.** It shows requirements, tests, runs and results, live diagrams of QA flows and traceability, and generates the project documentation.
- **Design:** dense, data-first dashboard. Its structure is KPI cards (requirements covered by tests, tests run, passed, failed, pending), a result distribution bar, latest runs and quality per module. Every screen is reviewed in the browser before it ships.
- **Self-hosted.** Docker images and compose files ready for a single VPS. No managed services required.

## Architecture

bun workspaces and Turborepo: `apps/`, `packages/`, `tooling/`.

| Part | Choice |
|---|---|
| `apps/web` | Dashboard and HTTP API: TanStack Start, Router and Query, Tailwind v4, shadcn/ui (new-york), recharts, Mermaid |
| Auth | better-auth (email and password, GitHub). API and MCP tokens stored as SHA-256 hashes with a visible prefix |
| `packages/database` | Prisma 7 (pg driver adapter, relation joins) and Postgres 16, versioned migrations, `uuid(7)` ids, append-only audit table enforced by a trigger |
| `packages/core` | Domain services, one folder per domain, every operation scoped by project |
| `packages/shared` | zod contracts shared by the API, CLI, MCP and the export format |
| `packages/cli` | The `lastro` command on npm. Talks to the API with a token, never to the database |
| `packages/runner` | Runs project commands per condition, reads JUnit and SARIF, builds and uploads evidence |
| `packages/intake` | Source extractors: DOCX with images in order, PDF, chat exports, audio and video through external commands |
| `packages/docs` | Document and diagram generators: Markdown, HTML, PDF |
| `packages/adapters` | Claude Code plugin (hooks, skills), git `pre-push`, GitHub Action, Claude Ship templates |
| MCP | JSON-RPC route `/api/mcp` with a Bearer token. `lastro mcp` bridges stdio to it |
| Tests | `bun test` for unit and integration (against a `lastro_test` database), Playwright for the real screens |
| TypeScript | 6.0: typescript-eslint does not support TypeScript 7 yet |
| Docker | `docker/compose.dev.yml`, `docker/compose.prod.yml` (web, migrate, postgres) |

### Data model

| Area | Models |
|---|---|
| Access | `Workspace`, `Membership`, better-auth tables, `ApiToken` |
| Project | `Project` (key, name, repository, language, configuration) |
| Sources | `Source`, `SourceVersion`, `Passage` |
| Spec | `Package`, `Requirement`, `Citation`, `Criterion`, `CriterionTest`, `Decision`, `Question`, `Incident` |
| Quality | `GlossaryTerm`, `Invariant`, `DesignContract` |
| Execution | `Test`, `Run`, `RunStage`, `TestResult`, `Finding`, `Artifact` |
| History | `StateEvent`, `AgentSession`, `AgentEvent`, `AuditEvent`, `DocBuild` |

## Dashboard screens

| Screen | Content |
|---|---|
| Home | One card per project: coverage, tests run, passed, failed, gate, last run |
| Project overview | KPI cards, result distribution, latest runs, quality per module, state funnel, what holds items back, decisions and questions |
| Requirements | Filterable list. Detail with the quote next to its source, fields, criteria, tests per condition, evidence per commit, traceability and QA flow diagrams, human actions in dialogs |
| Tests | Catalog with history, flaky and orphan tests, criteria without tests |
| Runs | List and detail: stages per condition, output, screenshots, comparison with the previous run |
| Bugs | Incidents with triage, cause and billing |
| Agents | Sessions and events of each agent |
| Diagrams | QA flow, traceability, lifecycle, module map |
| Documentation | Generate, read and download every document |
| Sources | Upload, versions, diff, quoted passages |
| Glossary, design contract | Terms, invariants, allowed components and reference screens |
| Settings | Visual editor for QA flows, conditions and commands; members; tokens |
| Audit | Append-only log of every change |

## Phases

| # | Phase | Status |
|---|---|---|
| 0 | Preparation: design plugins enabled, rejected first implementation moved out of the repository, this roadmap | done |
| 1 | Foundation: bun, turbo, `tooling/`; Prisma schema and migrations; `packages/shared`; `packages/core` with integration tests; PRD and `.lastro/` updated to these decisions | done |
| 2 | Dashboard base: auth, workspace, projects and switcher, shell, design system, home; `lastro import` of this repository's `.lastro/` | done |
| 3 | Full spec: sources and intake, requirements, decisions, questions, incidents, packages, lifecycle, blockers, human actions; `lastro export` | done |
| 4 | API, CLI and MCP: tokens; `init`, `login`, `link`, `intake`, `req`, `ask`, `decide`, `pending`, `export`, `import`, `mcp`; `/api/mcp` | done |
| 5 | Verification: runner, conditions, JUnit and SARIF; `verify` and `gate`; stale evidence and locks; Tests and Runs screens; overview charts; QA flow diagrams | done |
| 6 | Documentation: every document in md, html and pdf; Documentation screen | done |
| 7 | Enforcement: Claude Code plugin, `pre-push`, GitHub Action, Claude Ship templates | done |
| 8 | Advanced dashboard: Agents, Audit, module map, timelines, visual flow editor | todo |
| 9 | Distribution: Docker image and production compose, npm package, README in English and Portuguese with real screenshots | todo |
| 10 | Dogfood: Lastro tracks itself on its own server, tests linked to criteria, gate in CI | todo |

## Verification in every phase

- `bun test`, typecheck and lint pass.
- `bun audit` reports nothing.
- Screens: Playwright on the real flow (sign in, pick a project, every page, every dialog) in light theme, dark theme and phone width, with screenshots reviewed before anything is shown.
- At the end: `docker compose -f docker/compose.prod.yml up` starts clean, and this repository's CI runs `lastro gate`.
