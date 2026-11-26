---
name: spec
description: Complete or fix the spec of Lastro requirements so they can be approved - required fields, criteria with the requester's numbers, tests linked to criteria. Use when requirements are captured or specified and the developer wants them ready for approval.
---

# Spec: ready for approval

1. `lastro_list` with status `captured` and `specified`. For each, `lastro_get_requirement` shows what holds it back.
2. Fill missing fields with `lastro_update_requirement`, only from the source or a recorded decision. If neither has it, `lastro_ask`.
3. Criteria: each one testable, with the requester's numbers. Link at least one test per criterion with `lastro_link_test` (`file::test name`, as the test runner reports it in JUnit), covering every level the requirement's type asks for (unit, integration, e2e with Playwright). Write the tests now, before the code: they are what gets approved and locked.
4. Check blocking questions with `lastro_context`. A requirement with an open blocking question cannot be approved.
5. In automatic mode, Lastro approves each requirement by itself when nothing holds it: say which ones it approved and which still wait, and for what. In review mode, ask the developer to approve them in the dashboard or with `lastro approve <code>`. Approval locks the criteria and their tests.
