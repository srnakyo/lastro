import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Action, DraftStage, FlowRef } from "./draft";

interface Props {
  flow: FlowRef;
  index: number;
  stage: DraftStage;
  commands: string[];
  conditions: string[];
  dispatch: (a: Action) => void;
}

export function StageRow({ flow, index, stage, commands, conditions, dispatch }: Props) {
  const { t } = useI18n();
  const set = (value: Partial<DraftStage>) => dispatch({ type: "stage.set", flow, index, stage: value });
  const toggle = (c: string) => set({ conditions: stage.conditions.includes(c) ? stage.conditions.filter((x) => x !== c) : [...stage.conditions, c] });
  return (
    <li className="grid gap-2 rounded-md border bg-card px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="tabular w-5 text-[12px] text-muted-foreground">{index + 1}</span>
        <Select value={stage.kind} onChange={(e) => set({ kind: e.target.value as DraftStage["kind"], manual: e.target.value === "check" })} className="h-8 w-auto" aria-label={t("flow.stages")}>
          <option value="run">{t("flow.run")}</option>
          <option value="check">{t("flow.check")}</option>
        </Select>
        {stage.kind === "run" ? (
          <Select value={stage.name} onChange={(e) => set({ name: e.target.value })} className="h-8 w-auto min-w-[120px]" aria-label={t("cmd.name")}>
            {!commands.includes(stage.name) && <option value={stage.name}>{stage.name || "—"}</option>}
            {commands.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        ) : (
          <Input value={stage.name} onChange={(e) => set({ name: e.target.value })} placeholder="preview" className="h-8 w-[120px]" aria-label={t("flow.check")} />
        )}
        {stage.kind === "check" && <Input value={stage.by} onChange={(e) => set({ by: e.target.value })} placeholder={t("flow.by")} className="h-8 w-[110px]" aria-label={t("flow.by")} />}
        <span className="ml-auto flex">
          <Button size="icon" variant="ghost" className="size-8" onClick={() => dispatch({ type: "stage.move", flow, index, by: -1 })} aria-label={t("flow.up")}><ArrowUp /></Button>
          <Button size="icon" variant="ghost" className="size-8" onClick={() => dispatch({ type: "stage.move", flow, index, by: 1 })} aria-label={t("flow.down")}><ArrowDown /></Button>
          <Button size="icon" variant="ghost" className="size-8 text-destructive" onClick={() => dispatch({ type: "stage.remove", flow, index })} aria-label={t("flow.removeStage")}><Trash2 /></Button>
        </span>
      </div>
      {conditions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pl-7">
          <span className="text-[11.5px] text-muted-foreground">{t("flow.conditions")}:</span>
          {conditions.map((c) => (
            <button key={c} type="button" aria-pressed={stage.conditions.includes(c)} onClick={() => toggle(c)} className={cn("rounded-full border px-2 py-0.5 text-[11.5px] transition-colors", stage.conditions.includes(c) ? "border-info/40 bg-info/15 text-info" : "text-muted-foreground hover:bg-accent")}>
              {c}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}
