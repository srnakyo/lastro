import type { ProjectConfig, Stage } from "@lastro/shared";

export interface PlannedStage {
  /** Name of the command, or of the check. */
  stage: string;
  condition: string | null;
  kind: "command" | "check" | "manual";
  by: string | null;
}

function expand(stage: Stage): PlannedStage[] {
  if (typeof stage === "string") return [{ stage, condition: null, kind: "command", by: null }];
  const name = stage.run ?? stage.check ?? "stage";
  const kind = stage.manual ? "manual" : stage.run ? "command" : "check";
  const conditions = stage.conditions?.length ? stage.conditions : [null];
  return conditions.map((condition) => ({ stage: name, condition, kind, by: stage.by ?? null }));
}

/** The stages a requirement of this type must pass: the global flow, then its type's flow, each condition once. */
export function planStages(config: ProjectConfig, type: string): PlannedStage[] {
  const seen = new Set<string>();
  return [...config.global_flow, ...(config.types[type]?.flow ?? [])]
    .flatMap(expand)
    .filter((s) => {
      const key = `${s.stage}|${s.condition ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
