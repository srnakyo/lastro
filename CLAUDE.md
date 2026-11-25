# Working on Lastro

Read [ROADMAP.md](ROADMAP.md) first: it has the decisions, the architecture and the phase you are in. The product is described in the [PRD](docs/prd/README.md).

## Rules

- Build the complete feature of the current phase. No placeholders, no "for now" shortcuts, no screen that is half done.
- One responsibility per file and per function. Domain logic lives in `packages/core`, contracts in `packages/shared`, never inside routes or components.
- Every core service operation receives the project (or workspace) id first and filters by it.
- Tests come with the code: unit tests for pure logic, integration tests against the `lastro_test` database, Playwright for screens. A phase only closes when all of them pass.
- `bun audit` must report nothing. Fix any alert in the same change.
- Confirmations use a shadcn Dialog. Never `alert`, `confirm` or `prompt`.
- Screens are checked in the browser (light, dark, phone width) before they are shown to anyone.
- Docs are bilingual: English in `docs/` is canonical, Portuguese in `docs/pt-BR/`. Keys and identifiers are always English.
- No client data, names or brands in this public repository.
- Update the phase status in ROADMAP.md when a phase closes.
