# Lastro PRD

> **Status:** in design. Nothing here is implemented yet.
> **Language:** this is the English version. The Portuguese version, the original draft, is at [`docs/pt-BR/prd`](../pt-BR/prd/README.md).

Lastro is an open source layer between whoever requests the software, the AI agent that writes the code, and whoever accepts the delivery. The core rule is a single one:

> **No item is done without lastro.** Lastro is the cited origin of the request, the requester's acceptance criteria, and the evidence, tied to the current commit, that those criteria passed.

## Documents

| # | Document | What it answers |
|---|---|---|
| 1 | [The problem](01-problem.md) | Why request and delivery diverge in AI-driven development, with data from a real project |
| 2 | [Vision and scope](02-vision-scope.md) | Principles, who it is for, what is left out and what already exists on the market |
| 3 | [Dashboard, documentation and diagrams](03-dashboard.md) | What you see in the dashboard: tests, runs, results, live diagrams and generated documentation |
| 4 | [Data model, file format and storage](04-domain-model.md) | The entities, and how they are stored in `.lastro/` and in the database (SQLite or Postgres) |
| 5 | [Lifecycle, gate and QA flows](05-lifecycle-and-gates.md) | A requirement's states, what unlocks each transition and how to configure QA |
| 6 | [Making the agent comply](06-enforcement.md) | Guidance, control through hooks and external blocking |
| 7 | [Interfaces](07-interfaces.md) | CLI, MCP server, reports and material intake |
| 8 | [Integrations](08-integrations.md) | Claude Code, Claude Ship, GitHub, test runners |
| 9 | [Architecture and roadmap](09-architecture-roadmap.md) | Packages, stack, MVP order and open questions |

## This PRD is also Lastro's first spec

The [`.lastro/`](../../.lastro) directory at the repository root describes Lastro's own MVP in the format it proposes: the source is this PRD, the requirements quote passages from it, and the decisions and open questions are recorded alongside. Once the core exists, Lastro will hold itself to its own rules.
