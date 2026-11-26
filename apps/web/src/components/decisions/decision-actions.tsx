import { useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { FormDialog } from "@/components/common/form-dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { confirmDecisions, decisionAction, mergeDecision } from "@/fns/decisions";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n";
import { reopenedByOverturn, type DecisionItem } from "./decision-rules";

/** The person's answers to one waiting decision: confirm, claim it as theirs, overturn, or merge a repeat. */
export function DecisionActions({ projectKey, decision, all, suggested }: { projectKey: string; decision: DecisionItem; all: DecisionItem[]; suggested: DecisionItem | null }) {
  const { t } = useI18n();
  const { run, pending } = useAction(projectKey);
  const reopened = reopenedByOverturn(decision);
  const confirm = (mine: boolean) => void run(() => confirmDecisions({ data: { key: projectKey, codes: [decision.code], mine } }), t("action.done"));
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
      <Button size="sm" disabled={pending} onClick={() => confirm(false)}>
        {t("dec.confirm")}
      </Button>
      {decision.decidedByAgent && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => confirm(true)} title={t("dec.mine.help")}>
          {t("dec.mine")}
        </Button>
      )}
      <ConfirmDialog
        trigger={<Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">{t("dec.overturn")}</Button>}
        title={t("dec.overturn.title")}
        description={reopened > 0 ? t("dec.overturn.effect", { n: reopened }) : t("dec.overturn.noEffect")}
        confirmLabel={t("dec.overturn")}
        reasonLabel={t("dec.overturn.reason")}
        destructive
        onConfirm={(reason) => run(() => decisionAction({ data: { key: projectKey, code: decision.code, action: "overturn", reason } }), t("action.done"))}
      />
      <RepeatDialog projectKey={projectKey} decision={decision} all={all} suggested={suggested} />
      {reopened > 0 && <span className="ml-auto text-[12px] font-medium text-warning">{t("dec.overturn.effect", { n: reopened })}</span>}
    </div>
  );
}

function RepeatDialog({ projectKey, decision, all, suggested }: { projectKey: string; decision: DecisionItem; all: DecisionItem[]; suggested: DecisionItem | null }) {
  const { t } = useI18n();
  const { run } = useAction(projectKey);
  const options = all.filter((d) => d.code !== decision.code && d.status !== "overturned");
  const [into, setInto] = useState(suggested?.code ?? options[0]?.code ?? "");
  if (options.length === 0) return null;
  return (
    <FormDialog
      trigger={<Button size="sm" variant="ghost">{t("dec.repeat")}</Button>}
      title={t("dec.repeat.title")}
      description={t("dec.repeat.body")}
      submitLabel={t("dec.repeat")}
      disabled={!into}
      onSubmit={() => run(() => mergeDecision({ data: { key: projectKey, code: decision.code, into } }), t("dec.repeat.done", { code: into }))}
    >
      <p className="rounded-md bg-muted px-3 py-2 text-[13px]">{decision.text}</p>
      <label className="grid gap-1.5 text-[13px] font-medium">
        {t("dec.repeat.into")}
        <Select value={into} onChange={(e) => setInto(e.target.value)}>
          {options.map((d) => (
            <option key={d.code} value={d.code}>
              {d.code} · {d.text.length > 80 ? `${d.text.slice(0, 80)}…` : d.text}
            </option>
          ))}
        </Select>
      </label>
    </FormDialog>
  );
}
