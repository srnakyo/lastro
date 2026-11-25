# Review guide

This repository tracks its requirements in Lastro. The export under `.lastro/` holds every requirement with the requester's literal quote, its acceptance criteria and the tests bound to them.

When you review a pull request:

1. **Scope.** Each behavior the diff adds or changes should serve a requirement in `approved`, `building` or `reopened` in `.lastro/requirements/`. Flag new behavior no requirement asks for, and changes to behavior that a `verified` or `accepted` requirement covers.
2. **The requester's words.** Compare the change with the quote and the examples of its requirement, not with the pull request's description. A number, a label or a rule that differs from the quote is a bug, even if the code is clean.
3. **Locked tests.** Criteria marked locked were approved by a person. A diff that edits one of their tests so it checks less (removed assertions, loosened values, skipped cases) is a high-severity finding.
4. **Silent assumptions.** Where the code decides something the requirement does not say (a default, a rounding, an empty state, who can see it), it should match a decision in `.lastro/decisions/`. If none does, flag it so the author records it.
5. **Invariants and layout contract.** `.lastro/glossary.yml` lists invariants and forbidden patterns; a change that breaks one is a bug.
6. **Do not** re-review what the Lastro gate already proves: whether the tests pass is the "Lastro gate" check, not your call.
