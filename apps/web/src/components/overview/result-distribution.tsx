import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { RichText } from "@/lib/rich-text";

/** Passed, failed and pending as one bar, with the counts under it. */
export function ResultDistribution({ passed, failed, pending }: { passed: number; failed: number; pending: number }) {
  const { t } = useI18n();
  const total = passed + failed + pending;
  const parts = [
    { key: "passed", value: passed, colour: "bg-chart-1", label: t("overview.distribution.passed") },
    { key: "failed", value: failed, colour: "bg-chart-2", label: t("overview.distribution.failed") },
    { key: "pending", value: pending, colour: "bg-chart-3", label: t("overview.distribution.pending") },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("overview.distribution")}</CardTitle>
        <span className="tabular text-[12px] text-muted-foreground">{total}</span>
      </CardHeader>
      <CardContent>
        <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={parts.map((p) => `${p.value} ${p.label}`).join(", ")}>
          {total > 0 && parts.map((p) => p.value > 0 && <div key={p.key} className={p.colour} style={{ flexGrow: p.value }} />)}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
          {parts.map((p) => (
            <span key={p.key} className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
              <span className={`size-2.5 rounded-sm ${p.colour}`} />
              <span className="tabular font-semibold text-foreground">{p.value}</span> {p.label}
            </span>
          ))}
        </div>
        {passed + failed === 0 && (
          <p className="mt-3 text-[12.5px] text-muted-foreground">
            <RichText text={t("overview.distribution.empty")} />
          </p>
        )}
      </CardContent>
    </Card>
  );
}
