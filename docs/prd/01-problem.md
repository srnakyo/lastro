# 1. The problem

## Summary

In development with AI agents, writing the code is no longer the bottleneck. The bottleneck is now the round trip between the requester and what gets delivered:

- the request arrives incomplete and in pieces (message, audio, video, document, screenshot);
- the agent fills in the gaps on its own and doesn't say so;
- the tests confirm the agent's interpretation, not the requester's;
- what was agreed gets lost from one session to the next;
- the requester only finds the divergence when using the system in production.

Instructions in `CLAUDE.md` or `AGENTS.md` help, but they depend on the agent remembering and obeying them. Lastro turns those rules into verifiable locks.

## Evidence from a real project

To back the thesis, we use as an example a real project that had enough material to measure the problem. Lastro is not built for that project or for that domain. The pattern repeats in any software built with an agent from someone else's requests.

The example is a management system built with Claude Code by a single developer, from August to November 2026. The client sent requests over WhatsApp (text, audio, narrated video, screenshot) and in DOCX and PDF documents. The data below comes from reading the sessions, the client's messages and the project notes. Names, brands and amounts were removed.

There were about **170 incidents** where the request and the delivery didn't match. Two independent reviews classified them like this:

| Cause | Aug–Oct | Oct–Nov |
|---|---|---|
| Incomplete or ambiguous requirement, and the agent assumed without saying so | 17 | 16 |
| Implicit business rule of the domain | 12 | 13 |
| Layout, visual pattern or fidelity to the original system | 15 | 9 |
| Wrong data source or calculation | 12 | 7 |
| Not tested under the client's usage conditions | not classified | 16 |
| Permission, profile or person with access to several units | 5 | 9 |
| Regression | 7 | 2 |
| Facade screen (the screen exists, the back end ignores the field) | 5 | not classified |
| Process and deploy | 9 | not classified |
| Not a defect | not classified | 7 |

The rounds of fixes did not shrink over time. The bonus module shows up in almost all of them and, at one point in the project, paid out 5 to 10 times the amount set in the client's document, with every test passing.

## The eight root causes

The agent almost never disobeyed what was written. The problem was everything around the request.

### 1. The request says what, not where, who, where the data comes from and how it shows up

When the developer asked whether the fixes were an implementation error or a scope error, the conclusion was: "the scope was incomplete". The rules document said which numbers go into the calculation, but not where or how those numbers get into the system. The agent invented an input window and chose where the button goes. The client had something else in mind.

**What's missing:** required fields in the requirement (where it lives, who sees it, who uses it, data source, reach, reference screen) and a ban on starting with those fields blank.

### 2. The assumption stays invisible

The document said "M-2 or M-2" and the agent went with "M-1 or M-2". A goal with no definition turned into running a checklist. A security feature became mandatory when the developer wanted it optional. The developer vetoed reports with "points to validate", because a question in a report looks like an unfinished item, and then the assumption disappeared for good.

**What's missing:** a decision log that shows the client "we decided X because the document didn't say", as a statement and not as a question.

### 3. The tests repeat the agent's interpretation

The bonus passed every test and paid far above what the document said. An end-to-end permissions test passed because it followed the matrix the agent itself had built. The error only showed up when someone checked the numbers in the PDF against production.

**What's missing:** acceptance criteria written with the requester's numeric examples, before implementation, and locked so the agent can't edit them.

### 4. Knowledge and decisions get lost between sessions

- The client's vocabulary ("Gerente" is the Gestor role in the system) had to be taught again.
- A hosting limitation was written down and ignored weeks later.
- Nine compaction summaries in a row stated a false state of a file in the repository.
- The deploy rule changed three times, and each session had to remember which one applied.

**What's missing:** glossary, invariants and decisions versioned in the repository and injected into every session, including after every compaction.

### 5. Item tracking is fragile

The developer asked "what is pending?" 29 times. The agent:

- listed items that weren't in the document;
- quoted a passage the document didn't have;
- stopped with 11 items it could still do;
- mixed up versions of documents with the same name;
- left 30 items "waiting for a screenshot" while the images were inside the DOCX itself.

**What's missing:** each atomic item with an ID, a literal quote and an anchor in the source (page, message, minute of the video), an explicit status, and the difference between document versions.

### 6. Tests run under conditions that aren't the client's

- The local database had 2 or 3 units; production had 46.
- The test used a clean draft; the client used the draft that came from the chat.
- The test ran as an administrator; the client used the employee profile.
- Zoom, F5, dark theme and 77,000-row imports were left out.

**What's missing:** reusable test conditions, required by requirement type.

### 7. There is no design contract

At one point the system had two filter styles. A module was ported from a prototype instead of following the system's pattern. A document went out with the wrong brand color. No tool fixes the client's taste. What fixes it is showing an approved preview before shipping.

**What's missing:** a layout contract (allowed components, reference screens, palette) and an approved preview step for visual changes.

### 8. Reach stays implicit

"Did you do this for all the units?" and "it was supposed to be created in the other three tabs too". The request applied to more places than it said.

**What's missing:** the reach field (modules and units), required and checked at the gate.

## What the developer was already doing to compensate

Over the course of the project, the developer created rules for each of these gaps:

- test with Playwright the way the client uses the system;
- screen preview by screenshot before the push;
- a documented layout pattern;
- the backend calculates and the front end only displays;
- a new document only comes in with sign-off;
- read the whole conversation before acting;
- audio transcription without a leading phrase.

They all worked as reminders. None of them blocked anything. Lastro exists so those rules no longer depend on the agent's memory.

## A business consequence

"Did we get it wrong or was the scope incomplete?" is the question that decides whether a change is a fix or a courtesy, and whether it goes into a quote. Without a record, the answer depends on reconstructing the conversation. With Lastro, it lives in each item's history: the quote from the source, the decisions made and the cause of each incident.
