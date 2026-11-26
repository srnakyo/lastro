import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useApproveMany } from "./approval-actions";

/** Shown while requirements are selected: approve them in one go. */
export function RequirementsBulkBar({ projectKey, codes, onDone }: { projectKey: string; codes: string[]; onDone: () => void }) {
  const { t } = useI18n();
  const { approve, pending } = useApproveMany(projectKey);
  if (codes.length === 0) return null;
  return (
    <div role="region" aria-label={t("req.bulk.selected", { n: codes.length })} className="sticky bottom-4 z-20 mx-auto mt-4 flex w-fit max-w-full flex-wrap items-center gap-2 rounded-xl border bg-card px-4 py-2.5 shadow-lg">
      <span className="tabular mr-1 text-[13px] font-semibold">{t("req.bulk.selected", { n: codes.length })}</span>
      <Button size="sm" disabled={pending} onClick={async () => { if (await approve(codes)) onDone(); }} title={t("unblock.approve.body")}>
        {t("req.bulk.approve")}
      </Button>
      <Button size="sm" variant="ghost" onClick={onDone}>
        {t("req.bulk.clear")}
      </Button>
    </div>
  );
}
