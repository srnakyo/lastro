# Lastro and Claude Ship

Templates that put Lastro's requirements in front of Claude Code Review and Claude Approvals. They live under `templates/` with neutral names, so they never act as policy in this repository. Copy them into your repository's root, renamed:

| Template | Copy to | What it does |
|---|---|---|
| `templates/REVIEW.md` | `REVIEW.md` | Guides Claude Code Review: scope against `.lastro/`, the requester's words, locked tests, silent assumptions |
| `templates/approvals.yml` | `.claude/approvals.yml` | A starter policy, **in observe mode**: two people; one, and Claude approves, when Claude's review passes and `lastro_scope` says the change is in scope |
| `templates/classifiers/lastro_scope/` | `.claude/classifiers/lastro_scope/` | A custom classifier: does the diff stay within the requirements Lastro has in building? It judges by the default branch's `.lastro/`, which the pull request cannot change |

```sh
cp templates/REVIEW.md REVIEW.md
mkdir -p .claude/classifiers && cp templates/approvals.yml .claude/approvals.yml
cp -r templates/classifiers/lastro_scope .claude/classifiers/
```

If your repository already has a `.claude/approvals.yml`, do not add a second one: merge the `lastro_scope` override into your existing rule instead.

Also require the **"Lastro gate"** check (the GitHub Action in `packages/adapters/github-action`): Claude Approvals cannot read other checks, so the gate and the approvals are two separate required checks.

## Before you turn it on

- Claude Approvals runs only where the repository's Claude organization is on a Team or Enterprise plan, without Zero Data Retention or the HIPAA configuration; some other compliance settings keep it out too. Elsewhere it posts nothing, and the policy guards nothing.
- With fewer than two people with write access, this policy locks once it enforces: use one person in `seats` instead.
- `lastro_scope` and Code Review are paid runs, billed to the Claude organization's usage credits, mostly once per push that changes the diff, in observe mode too.

## Risks once it enforces

- A run reads text the author wrote, and that text can try to steer it. A steered `in_scope` beside a passed review lets the author merge with one approval: on paths that matter (sign-in, payments, migrations), add a rule that asks for people whatever the classifiers say.
- GitHub can count Claude's approval as a required one, so `seats: 1` can let the author merge alone.
- Where GitHub requires approvals but neither "Dismiss stale pull request approvals when new commits are pushed" nor "Require approval of the most recent reviewable push" is on, Claude's approval keeps counting after a later push until Claude Approvals withdraws it. Turn one of them on.
- The override reads `lastro_scope` beside Code Review, so a pull request whose review Code Review declines can stay red, whoever approves.
- Files outside the four paths of the second rule, such as `CODEOWNERS` and `.github/`, take one person on a pass, and Claude approves.

## Going live

Wait until pull requests that should merge show "(observe mode) Would be approved by Claude" or "(observe mode) Would pass", then delete the `mode: observe` line. Require the "Claude Approvals" check from the App that reported it. Keep at least one required approval on GitHub.
