# 7. Interfaces

Lastro has four entry points into the same core: the CLI for people and scripts, the MCP server for agents, the dashboard for viewing, deciding and generating documentation, and the reports for the requester. The dashboard has its own chapter: [Dashboard, documentation and diagrams](03-dashboard.md).

The first three go through the Lastro server's HTTP API and the same core services. None of them opens the database on its own.

## CLI

### Project

| Command | What it does |
|---|---|
| `lastro login [--url] [--token]` | Connects the machine to the Lastro server: the person authorizes it in the browser (same code on both sides) and the machine keeps an agent token for every project of the workspace, outside the repository. `--token` takes a token made by hand, for CI or a machine without a browser |
| `lastro link [<project>]` | Links the repository to a project on the server and writes its key to `lastro.yml` |
| `lastro init` | Creates the project on the server, links the repository to it and writes the first `.lastro/` with an empty `lastro.yml`, glossary and layout contract, plus the `.gitignore` for the `.out/` folder |
| `lastro setup claude\|codex\|gemini\|cursor\|git\|github` | Installs the integrations for each level |
| `lastro doctor` | Checks the configuration, schemas, installed hooks and project commands |

### Material intake

| Command | What it does |
|---|---|
| `lastro intake <file or folder>` | Sends the material to the server, which registers the source, stores the binary, extracts the text and splits it into passages with anchors. If a source with the same title already exists, creates the new version with `supersedes` |
| `lastro source diff <SRC> <SRC>` | Difference between two versions, with the affected requirements |
| `lastro source final <SRC>` | Marks the source as final. Human |

Lastro doesn't call an LLM. Breaking the source into atomic requirements is done by the agent via MCP (`lastro_propose_requirements`), and the items start as `captured`.

### Requirements, decisions and questions

| Command | What it does |
|---|---|
| `lastro req new\|edit\|show\|list` | Creates, edits, shows and lists requirements, with filters by state, type and package |
| `lastro pending [PKG]` | Only what hasn't reached `verified`, grouped by reason: missing field, open question, awaiting approval, in implementation, gate red |
| `lastro ask <REQ> "<question>" [--blocks]` | Opens a question |
| `lastro answer <Q> "<answer>" --source <SRC@anchor>` | Records the answer and creates the `client_answer` decision. Human |
| `lastro decide <REQ> "<decision>" --reason "<reason>"` | Records a decision |
| `lastro decision confirm\|overturn <DEC>` | Human |
| `lastro approve <REQ\|PKG>` | Human. Also locks the criteria |
| `lastro lock\|unlock <REQ>` | Locks or unlocks criteria and tests. `unlock` is human |
| `lastro drop <REQ> --reason "<reason>"` | Drops the item from scope. Human |

### Verification and delivery

| Command | What it does |
|---|---|
| `lastro start <REQ>` | Moves to `building` and records the branch |
| `lastro verify [REQ\|PKG]` | Runs the flow's automatic stages, under each required condition, and records the evidence |
| `lastro check <REQ> <stage> --pass\|--fail --by <role> --ref "<reference>"` | Records a manual stage. Human |
| `lastro gate [--session\|--changed\|--ci] [REQ]` | Evaluates the gate. Exits with code 0 only if it passes. With `--ci` it runs everything again |
| `lastro package new\|close\|show` | Manages delivery rounds |
| `lastro report <PKG> [--format md\|html\|pdf] [--audience client\|dev]` | Item-by-item report |
| `lastro accept <REQ\|PKG> --ref "<reference>"` | The requester's acceptance. Human |
| `lastro incident new "<complaint>" --source <SRC@anchor>` | Records an incident and reopens the requirement |
| `lastro incident triage <INC> --triage bug --cause spec_gap --billing courtesy` | Confirms the triage, cause and billing. Human |

### Server, documentation and export

| Command | What it does |
|---|---|
| `lastro export [--out .lastro] [--json]` | Writes the project's deterministic snapshot to `.lastro/`, for review in the PR and for the offline gate. With `--json`, writes the same content to standard output |
| `lastro import [<folder>]` | Loads a `.lastro/` snapshot into the server, showing first what will change |
| `lastro mcp` | Bridges the agent's stdio to the server's `/api/mcp` route, with the token |
| `lastro docs build [--format md\|html\|pdf] [--out docs/lastro]` | Generates the project's documentation from the data |
| `lastro token create --name ci` | Creates an API token for CI or for an agent. Human. The token is shown only once; the server keeps the hash |

The server is not a CLI command. It is the web app, started with Docker (`docker compose -f docker/compose.prod.yml up -d`), and the database migrations run in the `migrate` service before `web` starts.

## MCP server

The MCP server is the JSON-RPC route `/api/mcp` on the Lastro server, with a Bearer token. For agents that only speak stdio, `lastro mcp` bridges to it. The stages of `lastro_verify` run on the agent's machine, through the bridge, which sends the evidence to the server.

Tools for the agent. None of them approves, accepts, unlocks or signs off a manual stage.

| Tool | What it is for |
|---|---|
| `lastro_context` | Active package, `approved` and `building` requirements, glossary, invariants, layout contract, recent decisions, open questions |
| `lastro_get_requirement` | The whole requirement, with the quote and the source passage around the anchor |
| `lastro_list` | Requirements by state, type and package |
| `lastro_get_source` | A passage of a source, by anchor |
| `lastro_propose_requirements` | Proposes items from a source. They start as `captured` and need a literal quote |
| `lastro_update_requirement` | Fills in spec fields. Doesn't change the state to `approved` |
| `lastro_record_decision` | Records an assumption or decision (`decided_by: agent`, `status: proposed`) |
| `lastro_ask` | Opens a question for the dev or for the requester |
| `lastro_link_test` | Links a test to an acceptance criterion |
| `lastro_start` | Moves an `approved` requirement to `building` |
| `lastro_verify` | Lastro runs the stages and returns what failed, by stage and condition |
| `lastro_gate_status` | What is still missing for the gate to pass |
| `lastro_submit` | The agent declares it is done. If the gate doesn't pass, the response says what is missing and the end-of-response hook blocks |
| `lastro_pause` | Records a pause with a reason, so the end-of-response hook doesn't block |
| `lastro_triage_incident` | Proposes the triage and cause of an incident. A person confirms |
| `lastro_glossary` | Search for terms and invariants |

MCP resources: `lastro://glossary`, `lastro://design`, `lastro://config`, `lastro://package/<id>`.

## Dashboard

The dashboard, the live diagrams and the generated documentation are covered in [Dashboard, documentation and diagrams](03-dashboard.md).

## Reports

| Report | For whom | Content |
|---|---|---|
| Package delivery | The requester | Item by item, in the source's numbering: literal request, status, what was done, what we decided, where to see it, screenshots |
| Awaiting answer | The requester | Only the open questions, each with the passage of the request that prompted it |
| Technical | Dev and reviewer | Evidence per requirement, commands, commits, conditions, locks, incidents and regressions |
| Incidents for the period | Dev | Triage, cause and billing, for the business conversation |

Formats: Markdown, HTML and PDF. The PDF's look is configurable (the developer's logo, colors and cover). The reports are part of the [generated documentation](03-dashboard.md#generated-documentation).

## Material intake

| Source | How it comes in |
|---|---|
| DOCX | Text and images **in the order they appear**, with an anchor per paragraph and per image. An image is never separated from its paragraph |
| PDF | Text by page and block. Pages that are only an image become an artifact with a page anchor |
| Conversation | WhatsApp and Telegram exports (text) and adapters for live sources. Includes the developer's replies, marked as `from: dev`, because they change the meaning of the request. Quoted and forwarded messages keep their link |
| Audio | Transcription through a configurable command (for example, local Whisper). No suggested phrase in the transcription prompt. The source is marked `machine_transcript: true` |
| Video | Timed transcription, plus frames extracted (ffmpeg) at the quoted points |
| Image, screenshot | Becomes an artifact. Can be a `visual_ref` |
| Meeting | Transcription, like audio |

Intake rules:

- Each passage's anchor is stable. A new version of the source doesn't change the anchors of the previous one.
- A source with the same title as another becomes a new version, never a silent replacement.
- Lastro only extracts and stores. Interpreting is the agent's job, and confirming is a person's job.
