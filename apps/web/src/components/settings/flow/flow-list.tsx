import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import type { Action, DraftStage, FlowRef } from "./draft";
import { StageRow } from "./stage-row";

export function FlowList({ flow, stages, commands, conditions, dispatch }: { flow: FlowRef; stages: DraftStage[]; commands: string[]; conditions: string[]; dispatch: (a: Action) => void }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-2">
      <ol className="grid gap-2">
        {stages.map((s, i) => <StageRow key={i} flow={flow} index={i} stage={s} commands={commands} conditions={conditions} dispatch={dispatch} />)}
      </ol>
      <div><Button size="sm" variant="outline" onClick={() => dispatch({ type: "stage.add", flow })}><Plus /> {t("flow.addStage")}</Button></div>
    </div>
  );
}
