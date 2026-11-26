import type { ProjectConfig } from "@lastro/shared";
import { Plus, Save } from "lucide-react";
import { useEffect, useMemo, useReducer, useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { saveConfig } from "@/fns/admin";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n";
import { fromDraft, reducer, toDraft } from "./draft";
import { FlowList } from "./flow-list";
import { CommandsCard, ConditionsCard, GateCard } from "./lists-cards";
import { TestRulesCard } from "./test-rules-card";
import { TypeCard } from "./type-card";

/** Visual editor of lastro.yml's QA part: flows per type, conditions, commands and gate. A person saves it. */
export function FlowEditor({ projectKey, config }: { projectKey: string; config: ProjectConfig }) {
  const { t } = useI18n();
  const { run } = useAction(projectKey);
  const [draft, dispatch] = useReducer(reducer, config, toDraft);
  const [newType, setNewType] = useState("");
  useEffect(() => dispatch({ type: "reset", config }), [config]);
  const preview = useMemo(() => fromDraft(draft), [draft]);
  const dirty = JSON.stringify(preview) !== JSON.stringify(fromDraft(toDraft(config)));
  const commands = draft.commands.map((c) => c.name).filter(Boolean);
  const conditions = draft.conditions.map((c) => c.name).filter(Boolean);
  return (
    <div className="grid gap-5">
      <div className="sticky top-14 z-10 -mx-1 flex flex-wrap items-center gap-3 rounded-lg border bg-card/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold">{t("flow.title")}</p>
          <p className="text-[12px] text-muted-foreground">{t("flow.lead")}</p>
        </div>
        {dirty && <Badge tone="warning">{t("flow.unsaved")}</Badge>}
        <ConfirmDialog
          trigger={<Button disabled={!dirty}><Save /> {t("flow.save")}</Button>}
          title={t("flow.save.title")}
          description={t("flow.save.body")}
          confirmLabel={t("common.save")}
          onConfirm={() => run(() => saveConfig({ data: { key: projectKey, config: preview } }), t("flow.saved"))}
        />
      </div>
      <TestRulesCard draft={draft} dispatch={dispatch} />
      <Card className="min-w-0">
        <CardHeader><CardTitle>{t("flow.global")}</CardTitle></CardHeader>
        <div className="px-5 py-4"><FlowList flow="global" stages={draft.global} commands={commands} conditions={conditions} dispatch={dispatch} /></div>
      </Card>
      {draft.types.map((type, i) => <TypeCard key={type.name} draft={draft} index={i} preview={preview} dispatch={dispatch} />)}
      <div className="flex flex-wrap items-center gap-2">
        <Input value={newType} onChange={(e) => setNewType(e.target.value.replace(/[^a-z0-9_-]/gi, "").toLowerCase())} placeholder={t("flow.typeName")} className="h-9 w-[200px] font-mono" aria-label={t("flow.typeName")} />
        <Button variant="outline" disabled={!newType} onClick={() => { dispatch({ type: "type.add", name: newType }); setNewType(""); }}><Plus /> {t("flow.addType")}</Button>
      </div>
      <ConditionsCard draft={draft} dispatch={dispatch} />
      <CommandsCard draft={draft} dispatch={dispatch} />
      <GateCard draft={draft} dispatch={dispatch} />
    </div>
  );
}
