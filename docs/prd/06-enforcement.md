# 6. Making the agent comply

No tool can guarantee that an external agent obeys a system it can work around. That is why Lastro works on three levels, and only the third is a real guarantee.

| Level | Mechanism | What it holds back |
|---|---|---|
| 1. Guidance | Injected context and generated instructions | The agent knows what is at stake and what the gate will require |
| 2. Control | Agent hooks and MCP server | The agent can't stop with the gate red, can't edit a locked test, can't run a human command |
| 3. External blocking | Git hook, required CI check and branch protection | Nothing reaches the main branch without lastro, with or without an agent |

## Level 1: guidance

`lastro setup claude` (or `codex`, `gemini`, `cursor`) generates and maintains a marked section in `CLAUDE.md` or `AGENTS.md`:

```markdown
<!-- lastro:start -->
This project uses Lastro. Before implementing, call `lastro_context`.
- Only work on `approved` requirements. Use `lastro_start` before touching the code.
- Don't assume silently: record it with `lastro_record_decision` or ask with `lastro_ask`.
- Lastro does the verifying: run `lastro_verify`. Don't say you're done while the gate is red.
- Locked criteria and tests must not be edited.
<!-- lastro:end -->
```

The text is short on purpose. The real context comes through the MCP and the session start hook.

## Level 2: control in Claude Code

`lastro setup claude` registers the hooks in the project's `.claude/settings.json` and the MCP server in `.mcp.json`. It is also distributed as a Claude Code plugin, with the hooks, the MCP and the skills together.

| Hook | What Lastro does |
|---|---|
| **Session start** (also after compaction and after `/clear`) | Injects the active package, the `approved` and `building` requirements, the glossary, the invariants, the layout contract and recent decisions. Fixes "it forgot what had been agreed" |
| **Before tool: Edit, Write and similar** | Denies edits to a locked criterion or test file, with the message: "test is locked in REQ-K7Q2M; ask the developer to run `lastro unlock`" |
| **Before tool: Bash** | Denies the human commands (`lastro approve`, `accept`, `unlock`, `check --manual`, `decision confirm`, `source final`). Optionally denies `git push` to the main branch while the gate is red |
| **End of response** | Runs `lastro gate --session`. If a requirement in `building` has unverified changes, or if the agent called `lastro_submit` and the gate is red, it blocks the stop and returns what is missing. It doesn't block when the agent opened a question or recorded a pause with a reason. It has a limit on consecutive blocks, so the agent doesn't get stuck in a loop |
| **After tool** | Records in the history which files the agent touched, to fill in `touches` and to detect changes outside the declared reach |

### Why the agent can't "say it passed"

- The gate only accepts evidence that Lastro itself generated, by running the command and reading the JUnit or SARIF output.
- `lastro_verify` over MCP runs the commands. The agent receives the result; it doesn't write the result.
- In CI, the gate doesn't trust stored evidence: it runs all the automatic stages again. The server's evidence is for the dashboard, the report and the PR, not final proof.
- Editing the `.lastro/` export by hand doesn't clear anything: the gate checks the hash of each locked criterion, and `lastro import` only applies a human action with a person's token.

### Human commands

The actions that depend on a person are:

- approving a spec;
- confirming or overturning a decision;
- unlocking a criterion;
- dropping an item from scope;
- recording the answer to a question;
- confirming the triage of an incident;
- marking a source as final;
- recording a manual stage;
- recording a preview;
- accepting a delivery.

These actions:

- are refused by the core when the actor is an agent: the service checks the actor (a person's dashboard session, a person's token or an agent's token) before writing, whether the request comes from the dashboard, the API, the CLI or the MCP;
- don't exist in the MCP server;
- are blocked for the agent by the Bash hook;
- ask for interactive confirmation in the terminal;
- in the offline CI gate, which reads `.lastro/`, only count when the commit that brought them comes from an allowed identity (`gate.human_identities` in `lastro.yml`) or when the PR was approved by a person.

## Level 3: external blocking

- **Git `pre-push` hook** (`lastro setup git`): runs `lastro gate --changed` and blocks the push when a touched requirement isn't verified.
- **CI check** (`lastro gate --ci`): runs all the automatic stages again in a clean environment, checks the locks and publishes the "Lastro gate" check with a table per requirement. With a server, it sends the runs to it; without one, it runs offline with the locked criteria from `.lastro/`. Marked as required in the main branch protection, it prevents the merge.
- **Block in the PR**: CI writes or updates a marked block in the PR description with the requirements, the decisions and the evidence. It serves reviewers and the integrations (see [Integrations](08-integrations.md)).

## Other agents

| Agent | Level 1 | Level 2 | Level 3 |
|---|---|---|---|
| Claude Code | `CLAUDE.md` + MCP | Full hooks | Git + CI |
| Codex CLI, Gemini CLI, Cursor | `AGENTS.md` + MCP | Whatever hooks each one offers, through an adapter | Git + CI |
| Any other | `AGENTS.md` | None | Git + CI |

Level 3 applies to all of them. Levels 1 and 2 reduce rework; level 3 guarantees the outcome.
