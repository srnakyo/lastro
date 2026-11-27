---
name: start
description: Put this repository under Lastro. Use when the person says to use Lastro here ("let's use Lastro", "vamos usar o Lastro", "set up Lastro", "put this project in Lastro"), or when a Lastro command says the folder is not linked to a project.
---

# Start: this repository under Lastro

Do it yourself, end to end. The person only authorizes the machine once, in the browser.

1. Check the CLI: `lastro --version`. Missing: `npm install -g @nakyo/lastro`.
2. Check the login with `lastro pending`. If it says "not logged in", ask the person to run `! lastro login` (you cannot run it: it is theirs) and to click **Authorize** in the page it opens. One login serves every project of the workspace.
3. `lastro init <key>`, with the key from the folder name (lowercase letters, digits and hyphens) unless the person named one. It creates the project on the server when it does not exist, with the strict start (automatic approval, tests written first, the requester's numbers in the tests, coverage, test levels per type), links this folder and writes `.lastro/`. Commit `.lastro/`.
4. `lastro install-hooks`, so `git push` runs the gate.
5. Fill in the QA commands in `.lastro/lastro.yml` (`commands`: how this repository runs its unit, integration and Playwright tests, with JUnit reports and LCOV coverage), then `lastro import` is the person's: ask them to apply it in the dashboard if they changed rules.
6. Bring the material in: for each document the person points to (briefs, specs, chats, designs), `lastro intake <file>`. Then follow /lastro:intake to turn each source into requirements with literal quotes.
7. Tell the person what you did, the project's dashboard link (`<server>/projects/<key>`) and what waits for them (questions, decisions).

From then on every change follows /lastro:spec and /lastro:build: requirement, a failing test first, the code, `lastro verify`, and the gate before saying done.
