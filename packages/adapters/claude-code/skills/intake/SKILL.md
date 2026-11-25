---
name: intake
description: Turn material a requester sent (brief, document, chat export, audio, call notes) into Lastro requirements with literal quotes. Use when the developer brings new or changed material from a client or product owner.
---

# Intake: from the requester's material to requirements

1. Make sure the material is a Lastro source. If the developer has a file, ask them to run `lastro intake <file>` (or upload it in the dashboard) and tell you the source code (`SRC-…`).
2. Read it with `lastro_get_source` anchor by anchor. Never work from memory or a summary.
3. Split it into atomic requirements: one behavior, one rule or one screen change each. For each one call `lastro_propose_requirements` with:
   - a **literal quote** copied from the passage and its anchor (`@file#heading/p2`). Lastro checks the quote; a paraphrase is rejected;
   - the requester's own examples and numbers as `examples` and acceptance criteria;
   - the fields the type requires (see `lastro_context`: `where`, `data_source`, `period`…).
4. Where the material is silent or ambiguous, do not fill the gap with a guess:
   - `lastro_ask` with `blocks: true` when the answer changes what gets built;
   - `lastro_record_decision` (kind `assumption`) when a reasonable default exists, with the reason.
5. Finish with a short list: requirements created, questions opened (and to whom), assumptions recorded. A person approves; you never approve.
