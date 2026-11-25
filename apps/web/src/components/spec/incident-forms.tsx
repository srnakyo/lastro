import { BILLINGS, INCIDENT_CAUSES, TRIAGES } from "@lastro/shared";
import { Plus } from "lucide-react";
import { useState } from "react";
import { FormDialog } from "@/components/common/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { reportIncident, triageIncident } from "@/fns/sources";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n";

export function ReportIncidentDialog({ projectKey }: { projectKey: string }) {
  const { t } = useI18n();
  const { run } = useAction(projectKey);
  const [reported, setReported] = useState("");
  const [requirement, setRequirement] = useState("");
  const [sourceRef, setSourceRef] = useState("");
  return (
    <FormDialog
      trigger={<Button><Plus /> {t("bug.report")}</Button>}
      title={t("bug.report")}
      submitLabel={t("common.save")}
      disabled={!reported}
      onSubmit={() => run(() => reportIncident({ data: { key: projectKey, input: { reported, requirement: requirement || undefined, sourceRef: sourceRef || undefined } } }), t("action.done"))}
    >
      <label className="grid gap-1.5 text-[13px] font-medium">{t("bug.reported")}<Textarea value={reported} onChange={(e) => setReported(e.target.value)} /></label>
      <label className="grid gap-1.5 text-[13px] font-medium">{t("bug.requirement")}<Input value={requirement} onChange={(e) => setRequirement(e.target.value.trim())} className="font-mono" placeholder="REQ-XXXXX" /></label>
      <label className="grid gap-1.5 text-[13px] font-medium">{t("bug.source")}<Input value={sourceRef} onChange={(e) => setSourceRef(e.target.value)} /></label>
    </FormDialog>
  );
}

export function TriageDialog({ projectKey, code }: { projectKey: string; code: string }) {
  const { t } = useI18n();
  const { run } = useAction(projectKey);
  const [triage, setTriage] = useState<(typeof TRIAGES)[number]>("bug");
  const [cause, setCause] = useState<(typeof INCIDENT_CAUSES)[number]>("implementation");
  const [billing, setBilling] = useState<(typeof BILLINGS)[number]>("fix");
  const [regression, setRegression] = useState("");
  return (
    <FormDialog
      trigger={<Button size="sm">{t("bug.triage")}</Button>}
      title={t("bug.triage.title")}
      submitLabel={t("common.save")}
      disabled={triage === "bug" && !regression}
      onSubmit={() => run(() => triageIncident({ data: { key: projectKey, code, input: { triage, cause, billing, regressionTest: regression || undefined } } }), t("action.done"))}
    >
      <label className="grid gap-1.5 text-[13px] font-medium">{t("bug.triage.kind")}
        <Select value={triage} onChange={(e) => setTriage(e.target.value as typeof triage)}>{TRIAGES.map((v) => <option key={v} value={v}>{t(`triage.${v}`)}</option>)}</Select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-[13px] font-medium">{t("bug.triage.cause")}
          <Select value={cause} onChange={(e) => setCause(e.target.value as typeof cause)}>{INCIDENT_CAUSES.map((v) => <option key={v} value={v}>{t(`cause.${v}`)}</option>)}</Select>
        </label>
        <label className="grid gap-1.5 text-[13px] font-medium">{t("bug.triage.billing")}
          <Select value={billing} onChange={(e) => setBilling(e.target.value as typeof billing)}>{BILLINGS.map((v) => <option key={v} value={v}>{t(`billing.${v}`)}</option>)}</Select>
        </label>
      </div>
      <label className="grid gap-1.5 text-[13px] font-medium">{t("bug.triage.regression")}<Input value={regression} onChange={(e) => setRegression(e.target.value)} className="font-mono" /></label>
    </FormDialog>
  );
}
