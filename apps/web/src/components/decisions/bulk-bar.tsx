import { Button } from "@/components/ui/button";
import { confirmDecisions } from "@/fns/decisions";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n";

/** Shown while decisions are selected: confirm them, or confirm them as the person's own, in one go. */
export function BulkBar({ projectKey, codes, onDone }: { projectKey: string; codes: string[]; onDone: () => void }) {
  const { t } = useI18n();
  const { run, pending } = useAction(projectKey);
  if (codes.length === 0) return null;
  const confirm = async (mine: boolean) => {
    const result = await run(() => confirmDecisions({ data: { key: projectKey, codes, mine } }), t("action.done"));
    if (result) onDone();
  };
  return (
    <div role="region" aria-label={t("dec.selected", { n: codes.length })} className="sticky bottom-4 z-20 mx-auto flex w-fit max-w-full flex-wrap items-center gap-2 rounded-xl border bg-card px-4 py-2.5 shadow-lg">
      <span className="tabular mr-1 text-[13px] font-semibold">{t("dec.selected", { n: codes.length })}</span>
      <Button size="sm" disabled={pending} onClick={() => void confirm(false)}>
        {t("dec.bulk.confirm")}
      </Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => void confirm(true)} title={t("dec.mine.help")}>
        {t("dec.bulk.mine")}
      </Button>
      <Button size="sm" variant="ghost" onClick={onDone}>
        {t("dec.bulk.clear")}
      </Button>
    </div>
  );
}
