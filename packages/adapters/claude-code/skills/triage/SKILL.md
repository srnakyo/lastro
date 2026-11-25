---
name: triage
description: Record and pre-triage a complaint after delivery in Lastro - find the requirement, compare with the quote and the evidence, and propose the cause. Use when the developer forwards a bug report, complaint or change request from the requester.
---

# Triage a complaint

1. `lastro_report_incident` with the complaint in the requester's words and where it came from (message, e-mail, ticket).
2. Find the requirement: `lastro_list` and `lastro_get_requirement`. Compare the complaint with the literal quote, the criteria and the latest evidence.
3. Propose, to the developer, one of:
   - **bug**: the quote and criteria say it, and the build does not do it;
   - **spec gap**: the quote did not say it; it is new or it was ambiguous;
   - **not a defect / usage / config / missing data**.
4. The developer triages (cause and billing) in the dashboard. For a bug, add a regression test linked to the criterion and run `lastro_verify`.
