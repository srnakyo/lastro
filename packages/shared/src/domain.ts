/** What holds a requirement back, and which transition it blocks. */
export type BlockerKind =
  | "unknown_type"
  | "missing_field"
  | "missing_source"
  | "invalid_quote"
  | "open_question"
  | "source_not_final"
  | "unconfirmed_transcript"
  | "criterion_without_test"
  | "no_evidence"
  | "decision_overturned";

export type BlockedStep = "specified" | "approved" | "verified";

export interface Blocker {
  kind: BlockerKind;
  detail: string;
  blocks: BlockedStep;
}

export type LinkState = "ok" | "partial" | "missing";

/** The four links that back a requirement. */
export interface Hallmark {
  origin: LinkState;
  spec: LinkState;
  acceptance: LinkState;
  evidence: LinkState;
}

export type ActorType = "user" | "agent" | "system";

/** Who performs an operation. Human-only operations refuse agent actors. */
export interface Actor {
  type: ActorType;
  id: string | null;
}
