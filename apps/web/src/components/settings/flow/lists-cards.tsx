import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import type { Action, Draft } from "./draft";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="grid gap-1 text-[12px] font-medium text-muted-foreground">{label}{children}</label>;

export function ConditionsCard({ draft, dispatch }: { draft: Draft; dispatch: (a: Action) => void }) {
  const { t } = useI18n();
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div><CardTitle>{t("cond.title")}</CardTitle><p className="mt-0.5 text-[12px] text-muted-foreground">{t("cond.lead")}</p></div>
        <Button size="sm" variant="outline" onClick={() => dispatch({ type: "condition.add" })}><Plus /> {t("cond.add")}</Button>
      </CardHeader>
      <ul className="divide-y">
        {draft.conditions.map((c, i) => (
          <li key={i} className="grid gap-2 px-5 py-3 md:grid-cols-[160px_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <Field label={t("cond.name")}><Input value={c.name} onChange={(e) => dispatch({ type: "condition.set", index: i, value: { name: e.target.value } })} className="h-8 font-mono" /></Field>
            <Field label={t("cond.env")}><Textarea value={c.env} onChange={(e) => dispatch({ type: "condition.set", index: i, value: { env: e.target.value } })} rows={2} className="font-mono text-[12px]" /></Field>
            <div className="grid gap-2">
              <Field label={t("cond.setup")}><Input value={c.setup} onChange={(e) => dispatch({ type: "condition.set", index: i, value: { setup: e.target.value } })} className="h-8 font-mono text-[12px]" /></Field>
              <Field label={t("cond.note")}><Input value={c.note} onChange={(e) => dispatch({ type: "condition.set", index: i, value: { note: e.target.value } })} className="h-8" /></Field>
            </div>
            <Button size="icon" variant="ghost" className="size-8 self-start text-destructive md:mt-5" onClick={() => dispatch({ type: "condition.remove", index: i })} aria-label={`${t("flow.removeStage")} ${c.name}`}><Trash2 /></Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function CommandsCard({ draft, dispatch }: { draft: Draft; dispatch: (a: Action) => void }) {
  const { t } = useI18n();
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div><CardTitle>{t("cmd.title")}</CardTitle><p className="mt-0.5 text-[12px] text-muted-foreground">{t("cmd.lead")}</p></div>
        <Button size="sm" variant="outline" onClick={() => dispatch({ type: "command.add" })}><Plus /> {t("cmd.add")}</Button>
      </CardHeader>
      <ul className="divide-y">
        {draft.commands.map((c, i) => (
          <li key={i} className="grid gap-2 px-5 py-3 md:grid-cols-[140px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <Field label={t("cmd.name")}><Input value={c.name} onChange={(e) => dispatch({ type: "command.set", index: i, value: { name: e.target.value } })} className="h-8 font-mono" /></Field>
            <Field label={t("cmd.run")}><Input value={c.run} onChange={(e) => dispatch({ type: "command.set", index: i, value: { run: e.target.value } })} className="h-8 font-mono text-[12px]" /></Field>
            <Field label={t("cmd.junit")}><Input value={c.junit} onChange={(e) => dispatch({ type: "command.set", index: i, value: { junit: e.target.value } })} className="h-8 font-mono text-[12px]" /></Field>
            <Field label={t("cmd.sarif")}><Input value={c.sarif} onChange={(e) => dispatch({ type: "command.set", index: i, value: { sarif: e.target.value } })} className="h-8 font-mono text-[12px]" /></Field>
            <Button size="icon" variant="ghost" className="size-8 self-end text-destructive" onClick={() => dispatch({ type: "command.remove", index: i })} aria-label={`${t("flow.removeStage")} ${c.name}`}><Trash2 /></Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function GateCard({ draft, dispatch }: { draft: Draft; dispatch: (a: Action) => void }) {
  const { t } = useI18n();
  const check = (label: string, on: boolean, change: (v: boolean) => void) => (
    <label className="flex items-center gap-2.5 text-[13px]"><input type="checkbox" checked={on} onChange={(e) => change(e.target.checked)} className="size-4 accent-[hsl(var(--primary))]" />{label}</label>
  );
  return (
    <Card className="min-w-0">
      <CardHeader><CardTitle>{t("gate.title")}</CardTitle></CardHeader>
      <div className="grid gap-3 px-5 py-4">
        {check(t("gate.blockStop"), draft.gate.block_agent_stop, (v) => dispatch({ type: "gate.set", value: { block_agent_stop: v } }))}
        {check(t("gate.stale"), draft.gate.stale_on_change, (v) => dispatch({ type: "gate.set", value: { stale_on_change: v } }))}
        {check(t("gate.requireFinal"), draft.requireFinal, (v) => dispatch({ type: "approval.final", on: v }))}
        <label className="flex items-center gap-2.5 text-[13px]">
          <Input type="number" min={1} max={20} value={draft.gate.max_stop_blocks} onChange={(e) => dispatch({ type: "gate.set", value: { max_stop_blocks: Math.max(1, Number(e.target.value) || 1) } })} className="h-8 w-20" />
          {t("gate.maxBlocks")}
        </label>
      </div>
    </Card>
  );
}
