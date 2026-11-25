export const REQUIREMENT_STATUSES = [
  "captured",
  "specified",
  "approved",
  "building",
  "verified",
  "previewed",
  "delivered",
  "accepted",
  "reopened",
  "dropped",
] as const;
export type RequirementStatus = (typeof REQUIREMENT_STATUSES)[number];

export const SOURCE_KINDS = ["docx", "pdf", "chat", "audio", "video", "image", "meeting", "text"] as const;
export const ROLES = ["client", "dev", "team"] as const;
export const DECISION_KINDS = ["assumption", "decision", "client_answer"] as const;
export const DECISION_STATUSES = ["proposed", "confirmed", "overturned"] as const;
export const TRIAGES = ["bug", "config", "missing_data", "usage", "improvement", "not_a_defect"] as const;
export const INCIDENT_CAUSES = ["spec_gap", "implementation", "regression", "client_change", "environment"] as const;
export const BILLINGS = ["fix", "courtesy", "quote"] as const;
export const LANGUAGES = ["en", "pt-BR"] as const;
export type Language = (typeof LANGUAGES)[number];
