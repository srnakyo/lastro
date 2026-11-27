# lastro

The command line of [Lastro](https://github.com/srnakyo/lastro): requirements with the requester's literal words, QA flows that Lastro runs itself, and a gate that says when something is really done.

The CLI talks to your Lastro server with a token. It never touches the database.

```sh
npm install -g @nakyo/lastro
lastro login --url https://lastro.example.com   # opens the browser: authorize this machine, once
lastro init my-project            # links this folder to a project created in the dashboard
```

`lastro login` shows a code, opens the dashboard and waits while you compare the code and click **Authorize**. The machine gets an agent token for every project of the workspace, kept in `~/.config/lastro/credentials.json`; each repository names its project in `.lastro/lastro.yml`, so one login serves every repository. The agent token does everything but what is a person's (approve, accept, unlock, answer): that happens in the dashboard. Without a browser, create a token in **Workspace settings › Access tokens** and run `lastro login --token <token>`; a token made in a project's settings works only there, and the CLI keeps it for that project.

| Command | What it does |
|---|---|
| `lastro pending` | What is not verified yet, grouped by what holds it |
| `lastro req list`, `req show <code>`, `req start <code>`, `req link-test <code> <criterion> <file::test>` | Requirements |
| `lastro intake <file>` | Send a DOCX, PDF, chat export, audio, video, image or Markdown as a source |
| `lastro ask`, `lastro decide` | Open a question, record a decision or assumption |
| `lastro verify [code]` | Run the QA flow of a requirement on this machine and record the evidence |
| `lastro gate` | Fail while anything in building is not verified or its evidence went stale (CI, `pre-push`) |
| `lastro docs build`, `lastro report <PKG>` | Generate the project documents into the repository; the item-by-item report of a package |
| `lastro export`, `lastro import` | Write the project to `.lastro/`, or load `.lastro/` into the server (a person) |
| `lastro approve`, `lastro check` | Human actions: they ask for confirmation in a terminal |
| `lastro login [--url] [--token]` | Connect this machine: in the browser, or with a token made by hand |
| `lastro mcp` | MCP server over stdio for Claude Code and other agents |
| `lastro hook <event>` | The Claude Code hooks (used by the Lastro plugin) |
| `lastro install-hooks` | Install the git `pre-push` hook |

In CI, set `LASTRO_URL` and `LASTRO_TOKEN` instead of `lastro login`.

MIT license.
