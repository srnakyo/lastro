---
name: build
description: Implement an approved Lastro requirement until its gate is green - start it, write code and the linked tests, run lastro_verify, fix what fails. Use when the developer asks to implement, build or fix a requirement.
---

# Build: until the gate is green

1. `lastro_get_requirement <code>`: read the quote, the fields, the criteria and the QA flow of its type. If it is not approved, stop and say so.
2. `lastro_start <code>` before touching code.
3. Implement. Keep to the glossary, the invariants and the layout contract from `lastro_context`. Anything the spec does not say: `lastro_record_decision` or `lastro_ask`, never a silent choice.
4. Write the tests linked to the criteria, with exactly the linked names. Tests of locked criteria cannot be edited: if one is wrong, ask the developer to unlock the criterion.
5. `lastro_verify <code>` runs the project's stages on this machine, in every condition the type requires, and records the evidence. Only that counts: your own test runs do not.
6. Read what failed (`agentCanFix`), fix, verify again. What needs a person (`needsPerson`: a manual preview, a sign-off) is not yours: tell the developer.
7. Done means `lastro_submit <code>` answers `done: true`. If you must stop before that, `lastro_pause` with the reason.
