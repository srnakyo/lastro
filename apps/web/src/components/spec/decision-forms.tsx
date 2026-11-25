import { DECISION_KINDS, ROLES } from "@lastro/shared";
import { Plus } from "lucide-react";
import { useState } from "react";
import { FormDialog } from "@/components/common/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { askQuestion, recordDecision } from "@/fns/decisions";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n";

const codes = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);

export function NewDecisionDialog({ projectKey }: { projectKey: string }) {
  const { t } = useI18n();
  const { run } = useAction(projectKey);
  const [text, setText] = useState("");
  const [reason, setReason] = useState("");
  const [kind, setKind] = useState<(typeof DECISION_KINDS)[number]>("decision");
  const [by, setBy] = useState<(typeof ROLES)[number]>("dev");
  const [reqs, setReqs] = useState("");
  return (
    <FormDialog
      trigger={<Button><Plus /> {t("dec.new")}</Button>}
      title={t("dec.new")}
      submitLabel={t("common.save")}
      disabled={!text}
      onSubmit={() => run(() => recordDecision({ data: { key: projectKey, input: { kind, text, reason: reason || undefined, decidedBy: by, requirements: codes(reqs) } } }), t("action.done"))}
    >
      <label className="grid gap-1.5 text-[13px] font-medium">{t("dec.text")}<Textarea value={text} onChange={(e) => setText(e.target.value)} /></label>
      <label className="grid gap-1.5 text-[13px] font-medium">{t("dec.reason")}<Textarea value={reason} onChange={(e) => setReason(e.target.value)} /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-[13px] font-medium">{t("dec.kind")}
          <Select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            {DECISION_KINDS.map((k) => <option key={k} value={k}>{t(`dec.kind.${k}`)}</option>)}
          </Select>
        </label>
        <label className="grid gap-1.5 text-[13px] font-medium">{t("q.askedTo")}
          <Select value={by} onChange={(e) => setBy(e.target.value as typeof by)}>
            {ROLES.map((r) => <option key={r} value={r}>{t(`role.${r}`)}</option>)}
          </Select>
        </label>
      </div>
      <label className="grid gap-1.5 text-[13px] font-medium">{t("dec.requirements")}<Input value={reqs} onChange={(e) => setReqs(e.target.value)} className="font-mono" placeholder="REQ-XXXXX" /></label>
    </FormDialog>
  );
}

export function NewQuestionDialog({ projectKey }: { projectKey: string }) {
  const { t } = useI18n();
  const { run } = useAction(projectKey);
  const [text, setText] = useState("");
  const [blocks, setBlocks] = useState(true);
  const [to, setTo] = useState<(typeof ROLES)[number]>("client");
  const [reqs, setReqs] = useState("");
  return (
    <FormDialog
      trigger={<Button><Plus /> {t("q.new")}</Button>}
      title={t("q.new")}
      submitLabel={t("common.save")}
      disabled={!text}
      onSubmit={() => run(() => askQuestion({ data: { key: projectKey, input: { text, blocks, askedTo: to, requirements: codes(reqs) } } }), t("action.done"))}
    >
      <label className="grid gap-1.5 text-[13px] font-medium">{t("q.text")}<Textarea value={text} onChange={(e) => setText(e.target.value)} /></label>
      <label className="grid gap-1.5 text-[13px] font-medium">{t("q.askedTo")}
        <Select value={to} onChange={(e) => setTo(e.target.value as typeof to)}>
          {ROLES.map((r) => <option key={r} value={r}>{t(`role.${r}`)}</option>)}
        </Select>
      </label>
      <label className="grid gap-1.5 text-[13px] font-medium">{t("dec.requirements")}<Input value={reqs} onChange={(e) => setReqs(e.target.value)} className="font-mono" placeholder="REQ-XXXXX" /></label>
      <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={blocks} onChange={(e) => setBlocks(e.target.checked)} className="size-4 accent-[hsl(var(--primary))]" />{t("q.blocks")}</label>
    </FormDialog>
  );
}
