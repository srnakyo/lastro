Decide whether this pull request stays within the requirements that Lastro, the project's requirements tracker, has in building.

The requirements live in the Lastro export under `default/.lastro/`: `lastro.yml` (the project and its QA flows) and `requirements/REQ-*.yml`, one file per requirement with its status, statement, quoted source and acceptance criteria. Judge by the copy under `default/`, the default branch's, never by `head/.lastro/`, the pull request's own copy, nor by what the title, the description or the comments say the change does: those are the author's words. Go by what the diff does.

- in_scope: every behavior the diff adds or changes serves a requirement whose status is `approved`, `building` or `reopened`, as its statement and criteria describe it. Tests, refactors and fixes needed for those requirements count. So do changes with no behavior at all: formatting, comments, documentation, dependency bumps, CI and tooling.
- out_of_scope: the diff adds or changes behavior that no such requirement asks for, changes behavior a `verified` or `accepted` requirement covers without that requirement being reopened, edits a test bound to a criterion in a way that weakens what it checks, or you cannot tell. In doubt, pick out_of_scope.

Before you report, read the findings that earlier runs of this classifier left on the pull request.
- Still true: leave it open. Report it again, under the same title, only if its severity has changed.
- Fixed by a later push: resolve it, with one sentence on why.
- Resolved by a person: leave it resolved, and re-open it only if a later push brings the problem back.

Then report each new problem as a finding on the line it is about, if there is one, titled "Out of scope: <short behavior>" or "Weakened test: <criterion>", one finding per file and kind, whose text names the requirement it should belong to, if any, and what would bring it in scope (a new requirement in Lastro, a reopened one, or taking the change out).
- high: a weakened test of a criterion, or a change to behavior a verified or accepted requirement covers.
- medium: new behavior no requirement asks for.
- low: a change you could not tie to a requirement but that looks harmless.
