import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { approveRequirements } from "@/fns/requirements";
import { markSourceFinal } from "@/fns/sources";
import { useAction } from "@/hooks/use-action";
import { errorText } from "@/lib/error-text";
import { useI18n } from "@/lib/i18n";

/** Marks a source final from wherever it holds requirements back. A person's action, confirmed in a dialog. */
export function MarkFinalButton({ projectKey, source, size = "sm" }: { projectKey: string; source: string; size?: "sm" | "default" }) {
  const { t } = useI18n();
  const { run } = useAction(projectKey);
  return (
    <ConfirmDialog
      trigger={<Button size={size}>{t("unblock.markFinal", { source })}</Button>}
      title={t("unblock.markFinal.title", { source })}
      description={t("unblock.markFinal.body")}
      confirmLabel={t("unblock.markFinal", { source })}
      onConfirm={() => run(() => markSourceFinal({ data: { key: projectKey, code: source } }), t("action.done"))}
    />
  );
}

/** Approves several requirements; says how many went through and why the others did not. */
export function useApproveMany(projectKey: string) {
  const { t, lang } = useI18n();
  const { run, pending } = useAction(projectKey);
  const approve = async (codes: string[]) => {
    const result = await run(() => approveRequirements({ data: { key: projectKey, codes } }));
    if (!result) return null;
    if (result.approved.length) toast.success(t("req.bulk.approved", { n: result.approved.length }));
    if (result.refused.length) toast.error(t("req.bulk.refused", { n: result.refused.length, list: result.refused.map((r) => `${r.code}: ${errorText(lang, r.message)}`).join(" · ") }));
    return result;
  };
  return { approve, pending };
}

/** "Approve the N", confirmed in a dialog because approval locks the criteria. */
export function ApproveManyButton({ projectKey, codes, label, onDone }: { projectKey: string; codes: string[]; label: string; onDone?: () => void }) {
  const { t } = useI18n();
  const { approve } = useApproveMany(projectKey);
  return (
    <ConfirmDialog
      trigger={<Button size="sm">{label}</Button>}
      title={t("unblock.approve.title", { n: codes.length })}
      description={t("unblock.approve.body")}
      confirmLabel={label}
      onConfirm={async () => {
        const result = await approve(codes);
        onDone?.();
        return result;
      }}
    />
  );
}
