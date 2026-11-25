import type { Actor } from "@lastro/shared";
import { LastroError } from "../errors";

/** Operations a person must do: approving, accepting, unlocking, confirming. Agents are refused. */
export function requireHuman(actor: Actor, action: string): void {
  if (actor.type !== "user") throw new LastroError("HUMAN_ONLY", `${action} needs a person; agents cannot do it`);
}

export const systemActor: Actor = { type: "system", id: null };
