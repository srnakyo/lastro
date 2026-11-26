import { qaFlowDiagram } from "@lastro/docs";
import type { ProjectConfig } from "@lastro/shared";
import { Trash2 } from "lucide-react";
import { MermaidView } from "@/components/diagrams/mermaid-view";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { FIELDS, type Action, type Draft } from "./draft";
import { FlowList } from "./flow-list";
import { TypeTests } from "./type-tests";

export function TypeCard({ draft, index, preview, dispatch }: { draft: Draft; index: number; preview: ProjectConfig; dispatch: (a: Action) => void }) {
  const { t, lang } = useI18n();
  const type = draft.types[index];
  if (!type) return null;
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="font-mono">{type.name}</CardTitle>
        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => dispatch({ type: "type.remove", index })}><Trash2 /> {t("flow.removeType")}</Button>
      </CardHeader>
      <div className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-4">
          <div>
            <p className="mb-1.5 text-[12px] font-medium text-muted-foreground">{t("flow.required")}</p>
            <div className="flex flex-wrap gap-1.5">
              {FIELDS.map((f) => {
                const on = type.required.includes(f);
                return (
                  <button key={f} type="button" aria-pressed={on} onClick={() => dispatch({ type: "type.required", index, field: f, on: !on })} className={cn("rounded-full border px-2 py-0.5 font-mono text-[11.5px]", on ? "border-primary/40 bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent")}>
                    {f}
                  </button>
                );
              })}
            </div>
          </div>
          <TypeTests draft={draft} index={index} dispatch={dispatch} />
          <div>
            <p className="mb-1.5 text-[12px] font-medium text-muted-foreground">{t("flow.stages")}</p>
            <FlowList flow={index} stages={type.flow} commands={draft.commands.map((c) => c.name).filter(Boolean)} conditions={draft.conditions.map((c) => c.name).filter(Boolean)} dispatch={dispatch} />
          </div>
        </div>
        <div className="min-w-0">
          <p className="mb-1.5 text-[12px] font-medium text-muted-foreground">{t("flow.preview")}</p>
          <div className="rounded-md border bg-muted/30 p-3"><MermaidView source={qaFlowDiagram(preview, type.name, undefined, lang)} minHeight={120} fit /></div>
        </div>
      </div>
    </Card>
  );
}
