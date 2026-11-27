---
name: build
description: Implement a Lastro requirement test first until its gate is green - write the tests at every level its type asks, see them fail, write the code, run lastro_verify, fix what fails. Use when the developer asks to implement, build or fix a requirement.
---

# Build: tests first, until the gate is green

1. `lastro_get_requirement <code>`: read the quote, the fields, the examples, the criteria and the QA flow of its type, and the test levels and coverage its type asks for (`lastro_context` has the project's test rules). In automatic mode Lastro approves the requirement by itself once every criterion has its tests; in review mode a person approves it.
2. **Write the tests before the code**, one or more per criterion, at every level the type asks:
   - **unit**: each rule and calculation in isolation, with the requester's numbers from the examples, the boundaries around them (the value itself, just below, just above) and the invalid inputs;
   - **integration**: the real database, queue or API the requirement touches, no mocks of what is being tested;
   - **e2e (Playwright)**: the user's path on the real screens, in every condition the type requires (theme, viewport, profile), with web-first assertions (`expect(locator).toBeVisible()`, roles and labels over CSS), no fixed sleeps.
   Each test independent (its own data, no order between tests), named after what it proves, arrange / act / assert. Never `expect(true)`, never a test that cannot fail.
3. Link every test with `lastro_link_test` (`file::test name`, exactly as the runner reports it in JUnit). Linking the last missing test lets the requirement be approved and locks the criteria. You may still link one more test to a locked criterion (Lastro seals it into the lock), and you may fix your own test until it first passes. Once it passed, its file is sealed: never weaken it; changing a criterion's text or removing a test is the developer's.
4. `lastro_start <code>` (or `lastro req work <code>` for one already in building) so the files you change count for this requirement only. Then `lastro_verify <code>` **before writing the code**: the new tests must fail. Lastro records that red; with `red_first` on, a test it never saw fail does not count. A test of a behavior that already existed cannot fail first: record it with `lastro_mark_preexisting` (or `lastro req existing <code> <criterion> --reason "..."`), saying where the behavior already was. Never break working code to get a red run.
5. Implement. Keep to the glossary, the invariants and the layout contract from `lastro_context`. Anything the spec does not say: `lastro_record_decision` or `lastro_ask`, never a silent choice. When the person already decided it (in the chat, a call, a document), record it with `madeBy: "person"` and `sourceRef` saying where they said it.
6. `lastro_verify <code>` runs the project's stages on this machine, in every condition, plus the `test-quality` stage when the type asks: the requester's numbers must be in the tests, and the functions and lines of the files you touched must run in tests up to the type's coverage. Only that counts: your own test runs do not.
7. Read what failed (`agentCanFix`): a failing test, a routine no test runs (cover it with a test, do not delete it), an example whose number no test uses. Fix, verify again. What needs a person (`needsPerson`) is not yours: tell the developer.
8. Done means `lastro_submit <code>` answers `done: true`. If you must stop before that, `lastro_pause` with the reason.
