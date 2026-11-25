# .lastro/

This folder describes Lastro itself in the export format: the deterministic snapshot that `lastro export` writes into a repository and `lastro import` loads into a Lastro server. The server's Postgres is the source of truth; until the server exists, this folder is the backlog of the build tracked in the [ROADMAP](../ROADMAP.md). Phase 2 imports it into the server, and from then on it is written by `lastro export`.

| Path | Content |
|---|---|
| `lastro.yml` | Server settings, types, required fields, QA flows, conditions and gate settings for this repository |
| `glossary.yml` | Terms and invariants of the project |
| `sources/` | The source of the requirements: the pt-BR PRD in `docs/pt-BR/prd/` |
| `packages/` | Delivery rounds: `PKG-D4S8H` (database, export and import, dashboard base, documentation) and `PKG-M7V0P` (spec core, CLI and verification) |
| `requirements/` | One requirement per file, each quoting the pt-BR PRD literally |
| `decisions/` | Architecture decisions, still `proposed` until confirmed |
| `questions/` | Open questions from the PRD |

The source is not marked `final` yet, so nothing can be approved until the PRD discussion closes. See the [PRD](../docs/prd/README.md).
