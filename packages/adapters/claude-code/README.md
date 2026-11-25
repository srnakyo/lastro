# Lastro plugin for Claude Code

Keeps Claude Code on the requirements:

| Hook | What it does |
|---|---|
| `SessionStart` (start, resume, `/clear`, after compaction) | Puts the active requirements, their criteria, the glossary, invariants, layout contract, recent decisions and open questions back in the context |
| `PreToolUse` | Refuses human commands (`lastro approve`, `sign`, `accept`, `unlock`, `import`), edits to the `.lastro/` export and edits to tests of locked criteria |
| `PostToolUse` | Records each file the agent changes on the requirements in building, so their evidence goes stale when those files change |
| `Stop` | While something the agent can fix holds a requirement in building, it may not end its turn. It stops after `lastro_pause`, when only a person can move things, or after `gate.max_stop_blocks` attempts |

It also starts the `lastro` MCP server (`lastro mcp`) and adds the skills `/lastro:intake`, `/lastro:spec`, `/lastro:build`, `/lastro:report` and `/lastro:triage`.

## Install

```sh
npm install -g lastro                       # the hooks and the MCP server call the lastro CLI
lastro login --url https://lastro.example.com --token <agent token>
```

Then in Claude Code:

```
/plugin marketplace add srnakyo/lastro
/plugin install lastro@lastro
```

Use an **agent** token (Settings › Access tokens › Agent): it can propose, update, link tests, start and verify, and can never approve, accept, unlock or import. In CI, set `LASTRO_URL` and `LASTRO_TOKEN` instead of logging in.

The hooks stay out of the way in a repository without `.lastro/lastro.yml`, and never break a session: if the server cannot be reached, the agent goes on.
