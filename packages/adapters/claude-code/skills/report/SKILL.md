---
name: report
description: Report project status from Lastro - what is pending and why, what was verified, and the delivery report for the requester. Use when the developer asks what is left, for a status update, or for a report to send to the client.
---

# Report

- **What is left:** `lastro_list`, grouped by what holds each item (blockers). Only items not verified are pending; never list a verified item as pending.
- **For the requester:** the dashboard's Documentation screen (or `lastro docs build --format md,pdf`) builds `CLIENT-REPORT`: item by item, their own words, what was done, what was decided and how it was verified. Prefer it to a summary written from memory.
- **A message to send:** short, in the requester's language, one line per item: done (verified), waiting on them (open question), in progress. No internal codes unless they use them.
