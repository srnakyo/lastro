import type { DecisionInput } from "@lastro/shared";

/** Where the build reads a requirement in a way its text does not spell out: proposed, for a person to confirm or overturn. */
export const DECISIONS: DecisionInput[] = [
  {
    kind: "assumption", decidedBy: "dev", requirements: ["REQ-F7H2Q"],
    text: "Join tables (PackageSource, RequirementDependency, DecisionRequirement, QuestionRequirement) keep composite primary keys instead of a uuid(7) id.",
    reason: "A row of a join table is identified by the pair it joins; a separate id adds an index and nothing any query uses. Every other model has a uuid(7) key.",
  },
  {
    kind: "assumption", decidedBy: "dev", requirements: ["REQ-A2C7H"],
    text: "An invariant joins a requirement's gate where its tests run in that requirement's stages.",
    reason: "PRD rule 6 says 'the invariants whose tests touch the same files'; Lastro does not know which files a test covers, so the suites a requirement runs stand for its files. Incident regression tests are always required.",
  },
  {
    kind: "assumption", decidedBy: "dev", requirements: ["REQ-Q3W6Z"],
    text: "A test is flaky when it passed and failed with the same fingerprint of the files its requirement is bound to; for a test no requirement covers, on the same commit.",
    reason: "'No change in the files it covers' needs to know those files; the evidence fingerprint is what Lastro records for them.",
  },
  {
    kind: "assumption", decidedBy: "dev", requirements: ["REQ-R6Y9A"],
    text: "The QA flow diagram on the dashboard shows the latest commit that ran the requirement; lastro gate judges the repository's HEAD.",
    reason: "The server does not know the developer's checkout; the latest commit it ran is its 'current commit'. The CLI sends HEAD to the gate.",
  },
];
