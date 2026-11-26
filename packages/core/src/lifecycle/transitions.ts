import type { ActorType, RequirementStatus } from "@lastro/shared";

/** Who may move a requirement along each edge of the lifecycle. */
const EDGES: Record<string, ActorType[]> = {
  "captured>specified": ["system"],
  "specified>captured": ["system"],
  "specified>approved": ["user", "system"],
  "approved>specified": ["system"],
  "approved>building": ["user", "agent"],
  "building>specified": ["system"],
  "building>verified": ["system"],
  "verified>building": ["system"],
  "verified>previewed": ["user"],
  "verified>delivered": ["system"],
  "previewed>delivered": ["system"],
  "delivered>accepted": ["user"],
  "delivered>reopened": ["system"],
  "accepted>reopened": ["system"],
  "verified>reopened": ["system"],
  "reopened>building": ["user", "agent"],
  "captured>dropped": ["user"],
  "specified>dropped": ["user"],
  "approved>dropped": ["user"],
};

export const LIFECYCLE_EDGES = Object.keys(EDGES).map((k) => k.split(">") as [RequirementStatus, RequirementStatus]);

export function allowedActors(from: RequirementStatus, to: RequirementStatus): ActorType[] {
  return EDGES[`${from}>${to}`] ?? [];
}

/** Pending means not verified yet: only what is still to be done counts. */
export function isPending(status: RequirementStatus): boolean {
  return ["captured", "specified", "approved", "building", "reopened"].includes(status);
}
