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
| 3 | [Data model and file format](03-domain-model.md) | The entities and how they are stored in `.lastro/` |
| 4 | [Lifecycle, gate and QA flows](04-lifecycle-and-gates.md) | A requirement's states, what unlocks each transition and how to configure QA |
| 5 | [Making the agent comply](05-enforcement.md) | Guidance, control through hooks and external blocking |
| 6 | [Interfaces](06-interfaces.md) | CLI, MCP server, dashboard, reports and material intake |
| 7 | [Integrations](07-integrations.md) | Claude Code, Claude Ship, GitHub, test runners |
| 8 | [Architecture and roadmap](08-architecture-roadmap.md) | Packages, storage, MVP order, metrics and open questions |

## This PRD is also Lastro's first spec

The [`.lastro/`](../../.lastro) directory at the repository root describes Lastro's own MVP in the format it proposes: the source is this PRD, the requirements quote passages from it, and the decisions and open questions are recorded alongside. Once the core exists, Lastro will hold itself to its own rules.
