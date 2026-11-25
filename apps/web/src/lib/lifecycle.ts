import type { RequirementStatus } from "@lastro/shared";

export type Mover = "you" | "agent" | "lastro";

/** The main path of a requirement and who moves it into each step (see packages/core/src/lifecycle/transitions.ts). */
export const PATH: { status: RequirementStatus; who: Mover }[] = [
  { status: "captured", who: "agent" },
  { status: "specified", who: "lastro" },
  { status: "approved", who: "you" },
  { status: "building", who: "agent" },
  { status: "verified", who: "lastro" },
  { status: "delivered", who: "you" },
  { status: "accepted", who: "you" },
];

/** Where a status sits on the main path; reopened goes back to building, previewed sits with verified. */
export function pathIndex(status: RequirementStatus): number {
  if (status === "reopened") return PATH.findIndex((p) => p.status === "building");
  if (status === "previewed") return PATH.findIndex((p) => p.status === "verified");
  return PATH.findIndex((p) => p.status === status);
}
