import { REQUIREMENT_STATUSES, type RequirementStatus } from "@lastro/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const FLOW: RequirementStatus[] = REQUIREMENT_STATUSES.filter((s) => s !== "dropped" && s !== "previewed");

/** How many requirements sit in each state, in lifecycle order. */
export function StatusFunnel({ byStatus, total }: { byStatus: Partial<Record<RequirementStatus, number>>; total: number }) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("overview.funnel")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2.5">
        {FLOW.map((status) => {
          const n = byStatus[status] ?? 0;
          const width = total === 0 ? 0 : (n / total) * 100;
          return (
            <div key={status} className="grid grid-cols-[112px_1fr_32px] items-center gap-3">
              <span className={cn("truncate text-[12.5px]", n === 0 ? "text-muted-foreground" : "font-medium")}>{t(`status.${status}`)}</span>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full", status === "reopened" ? "bg-destructive" : status === "verified" || status === "delivered" || status === "accepted" ? "bg-success" : "bg-primary")} style={{ width: `${width}%` }} />
              </div>
              <span className="tabular text-right text-[12.5px] text-muted-foreground">{n}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
