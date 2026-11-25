# Adapters

Integrations that enforce Lastro outside the server. The core knows none of them.

| Folder | What it is |
|---|---|
| `claude-code/` | Claude Code plugin: hooks, MCP server and skills |
| `git/` | `pre-push` hook that runs `lastro gate` (install with `lastro install-hooks`) |
| `github-action/` | Composite action: `lastro verify` then `lastro gate`, with a job summary |
| `claude-ship/` | Templates for Claude Code Review (`REVIEW.md`) and Claude Approvals (policy and the `lastro_scope` classifier) |
