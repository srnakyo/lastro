# 2. Vision and scope

## Principles

1. **Without lastro, it is not done.** The agent can say it finished; the gate decides.
2. **What counts is what ran.** Evidence is what Lastro itself ran and recorded, with the commit, the command and the output. What the agent reports doesn't count.
3. **Every sentence has an origin.** Each requirement quotes the source literally and points to where it is.
4. **Assumptions are recorded, never hidden.** If the request doesn't say, the agent decides and records the decision, which the client sees.
5. **The requester defines acceptance.** The requester's examples and numbers become the criteria. The agent doesn't edit a locked criterion.
6. **The files in git are the truth.** Everything that matters lives in `.lastro/`, in YAML and Markdown, reviewed in the same PR as the code.
7. **Local first, a server when you need one.** It works on your machine, with no setup, using SQLite. For a team and several projects, it connects to Postgres and the dashboard becomes shared.
8. **No LLM inside.** The agent the developer already uses does the thinking. Lastro stores, enforces and checks. No token costs of its own.
9. **Agent and stack agnostic.** Claude Code first, but the format, the CLI and the MCP work with any agent and language.
10. **Only an unfinished phase is pending.** An item that is done and verified doesn't show up as pending, not even with a caveat.

## Who it is for

| Role | What they need |
|---|---|
| **Developer working with an agent** (freelancer or small team) | Know what is really left, stop repeating instructions and have a way to prove what was delivered |
| **AI agent** (Claude Code, Codex, Gemini CLI, Cursor) | Get the requirement with its origin and criteria, have a place to ask questions and record decisions, know what the gate requires |
| **Client or product owner** | See, item by item, what they asked for, what was done, what was decided on their behalf and where to check it. Approve previews and accept deliveries |
| **Tech lead** | A quality policy per type of change, applied the same way to everyone |

## MVP goals

1. Each request becomes atomic items with an ID, a quote and an anchor in the source.
2. No item starts being implemented with a required field blank or a blocking question open.
3. Acceptance criteria carry the requester's examples and are locked.
4. The gate only passes with evidence run by Lastro on the current commit, under the conditions required by the item's type.
5. The agent can't end its response saying it is done while the gate is red (Claude Code).
6. Glossary, invariants, layout contract and decisions come back into the agent's context in every session and after every compaction.
7. An item-by-item report for the client, with the literal text of the request.
8. A visual dashboard with the packages, the requirements, the test catalog, the runs and the results, the live diagrams of the QA flows and of traceability, and the generation of the project's documentation.
9. Data stored in local SQLite or in Postgres, with the same schema and the same interface.

## Out of scope for the MVP

- Being a full project manager (sprints, hours, kanban board).
- A portal for the client to log in and approve. In the MVP, client approval comes in as a reference (message id, email, signature) recorded by the developer. The dashboard's server mode is for the team.
- Generating code or tests on its own. That is the agent's job.
- Replacing CI. Lastro runs inside it.
- Being a linter. Lastro runs the project's linters and reads the result as SARIF.

## What already exists and where Lastro fits

| Tool | What it does well | What it doesn't cover |
|---|---|---|
| Spec Kit (GitHub), OpenSpec, BMAD, Kiro (AWS) | Take a written spec to tasks for the agent | Intake from messy client material, verification with evidence and the requester's acceptance. Markdown specs tend to go stale |
| reqstool, SpecTrace, Doorframe | Link requirement, code and test, some of them via MCP | Assumptions, test conditions, visual preview, client acceptance and locks on the agent |
| Playwright (and its test agents) | UI tests and visual evidence | Linking the test to the request and to the client's usage condition |
| Claude Ship (Code Review, PR Steward, Claude Approvals) | Reviews, fixes and approves pull requests | Starts once the code already exists. Doesn't know what the client asked for |

Lastro covers the two ends these tools leave loose: **from the client to the spec** and **from delivery to the client's acceptance**. In between, it integrates with what the developer already uses.

## How success is measured

In a pilot project, round by round:

- incidents per delivery round;
- share of incidents caused by "incomplete spec" versus "implementation";
- items reopened per round;
- questions asked before implementing versus questions asked after delivery;
- share of complaints that weren't defects;
- how many times someone asks "what is pending?" when the answer was already on the dashboard.
