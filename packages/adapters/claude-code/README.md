# Lastro plugin for Claude Code

Keeps Claude Code on the requirements:

| Hook | What it does |
|---|---|
| `SessionStart` (start, resume, `/clear`, after compaction) | Puts the active requirements, their criteria, the glossary, invariants, layout contract, recent decisions and open questions back in the context |
| `PreToolUse` | Refuses human commands (`lastro approve`, `sign`, `accept`, `unlock`, `import`), edits to the `.lastro/` export and edits to tests of locked criteria |
| `PostToolUse` | Records each file the agent changes on the requirements in building, so their evidence goes stale when those files change |
| `Stop` | While something the agent can fix holds a requirement in building, it may not end its turn. It stops after `lastro_pause`, when only a person can move things, or after `gate.max_stop_blocks` attempts |

It also starts the `lastro` MCP server (`lastro mcp`) and adds the skills `/lastro:start`, `/lastro:intake`, `/lastro:spec`, `/lastro:build`, `/lastro:report` and `/lastro:triage`.

In a folder that is not a Lastro project yet, the session starts with a one-line hint. Say "let's use Lastro" and `/lastro:start` does the rest: `lastro init` creates the project on the server (with the strict test rules) and links the folder, `lastro install-hooks` adds the pre-push gate, the agent sets up the QA commands and brings your documents in as sources.

## Install

```sh
npm install -g @nakyo/lastro                       # the hooks and the MCP server call the lastro CLI
lastro login --url https://lastro.example.com      # authorize this machine in the browser, once
```

Then in Claude Code:

```
/plugin marketplace add srnakyo/lastro
/plugin install lastro@lastro
```

`lastro login` gives the machine an **agent** token for every project of the workspace: it can propose, update, link tests, start and verify, and can never approve, accept, unlock or import. Those are yours, in the dashboard. In CI, set `LASTRO_URL` and `LASTRO_TOKEN` (a token from Workspace settings › Access tokens) instead of logging in.

The hooks stay out of the way in a repository without `.lastro/lastro.yml`, and never break a session: if the server cannot be reached, the agent goes on.
