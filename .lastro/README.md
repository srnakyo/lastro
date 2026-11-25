# .lastro/

This folder is Lastro's own MVP, written in the format Lastro proposes. It is the first real use of the format and the backlog for stages 1 to 3 of the roadmap: format, core and storage (SQLite and Postgres), the first dashboard, and verification.

| Path | Content |
|---|---|
| `lastro.yml` | Types, required fields, QA flows, conditions and gate settings for this repository |
| `glossary.yml` | Terms and invariants of the project |
| `sources/` | The source of the requirements: the pt-BR PRD in `docs/pt-BR/prd/` |
| `packages/` | Delivery rounds: `PKG-D4S8H` (storage and first dashboard) and `PKG-M7V0P` (core and verification) |
| `requirements/` | One requirement per file, each quoting the PRD literally |
| `decisions/` | Architecture decisions, still `proposed` until confirmed |
| `questions/` | Open questions from the PRD |

The source is not marked `final` yet, so nothing can be approved until the PRD discussion closes. See the [PRD](../docs/prd/README.md).
