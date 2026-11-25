import { PenLine } from "lucide-react";
import { useState } from "react";
import { FormDialog } from "@/components/common/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { signStage } from "@/fns/runs";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n";

/** A person signs a manual stage (a preview, a reconciliation) with where it was approved. */
export function SignStageDialog({ projectKey, code, stage, condition }: { projectKey: string; code: string; stage: string; condition: string | null }) {
  const { t } = useI18n();
  const { run } = useAction(projectKey);
  const [reference, setReference] = useState("");
  const [status, setStatus] = useState<"passed" | "failed">("passed");
  const name = condition ? `${stage} · ${condition}` : stage;
  return (
    <FormDialog
      trigger={<Button size="sm" variant="outline"><PenLine /> {t("qa.sign")} {name}</Button>}
      title={t("qa.sign.title", { stage: name })}
      description={t("qa.sign.body")}
      submitLabel={t("qa.sign")}
      disabled={!reference.trim()}
      onSubmit={() => run(() => signStage({ data: { key: projectKey, code, stage, condition, status, reference } }), t("action.done"))}
    >
      <label className="grid gap-1.5 text-[13px] font-medium">{t("qa.sign.reference")}<Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="WhatsApp 2026-11-25 14:02, e-mail, link" /></label>
      <label className="grid gap-1.5 text-[13px] font-medium">{t("qa.sign.result")}
        <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="passed">{t("result.passed")}</option>
          <option value="failed">{t("result.failed")}</option>
        </Select>
      </label>
    </FormDialog>
  );
}
