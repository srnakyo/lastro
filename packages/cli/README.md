# lastro

The command line of [Lastro](https://github.com/srnakyo/lastro): requirements with the requester's literal words, QA flows that Lastro runs itself, and a gate that says when something is really done.

The CLI talks to your Lastro server with a token. It never touches the database.

```sh
npm install -g @nakyo/lastro
lastro login --url https://lastro.example.com   # opens the browser: authorize this machine, once
lastro init my-project            # creates the project when it does not exist, and links this folder
```

`lastro login` shows a code, opens the dashboard and waits while you compare the code and click **Authorize**. The machine gets an agent token for every project of the workspace, kept in `~/.config/lastro/credentials.json`; each repository names its project in `.lastro/lastro.yml`, so one login serves every repository. The agent token does everything but what is a person's (approve, accept, unlock, answer): that happens in the dashboard. Without a browser, create a token in **Workspace settings › Access tokens** and run `lastro login --token <token>`; a token made in a project's settings works only there, and the CLI keeps it for that project.

| Command | What it does |
|---|---|
| `lastro pending` | What is not verified yet, grouped by what holds it |
| `lastro req list`, `req show <code>`, `req start <code>`, `req link-test <code> <criterion> <file::test>` | Requirements |
| `lastro req unlink-test <code> <criterion> <file::test>` | Take a test that never passed off a criterion, once another test covers it (a test that passed is a person's to take off) |
| `lastro req work <code>` | Say which requirement you are working on: the files you change count for it |
| `lastro req touches <code> [--set <files...>]` | The files a requirement touches (its coverage is measured on these), or replace them when they got files of other requirements; the audit keeps what changed |
| `lastro req prove <code> <criterion> --at <commit>` or `--without <files...>` | Run a criterion's tests, as they are now, without the code they check: on a commit from before it, or on this one with the behavior's files taken out. Failing there is their red; passing there means they do not check it |
| `lastro req existing <code> <criterion> --reason <text>` | A criterion whose tests check a behavior that already existed: recorded as a decision, and its tests are not asked to fail first |
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

**Verify only what a requirement needs.** A command in `lastro.yml` may name the tests to run: `{files}` (the linked test files), `{dirs}` (their folders, `./pkg`) and `{names}` (their names as a regex, `A|B`), with `level` (only the linked tests at that level of `tests.levels`) and `dir` (the folder it runs in; paths are relative to it). `lastro verify REQ-…` then runs only that requirement's tests, and a stage with none of its tests is not run.

```yaml
commands:
  integration:
    run: go test {dirs} -run '^({names})$' -json | go-junit-report -parser gojson > ../.lastro/.out/integration.xml
    dir: backend
    level: integration
    report: { junit: .lastro/.out/integration.xml }
```

**Tests link themselves.** A test whose name says its criterion, `TestX_REQ60KTK_AC1` or `… (REQ-60KTK AC-1)`, is linked to it the first time it runs.

MIT license.
