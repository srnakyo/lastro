import { TitleWithHelp } from "@/components/help-hint";
import type { BlockerKind } from "@lastro/shared";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

export function BlockersCard({ blockers, total }: { blockers: Partial<Record<BlockerKind, number>>; total: number }) {
  const { t } = useI18n();
  const entries = (Object.entries(blockers) as [BlockerKind, number][]).sort((a, b) => b[1] - a[1]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <TitleWithHelp title={t("overview.blockers")} help={t("overview.blockers.help")} />
        </CardTitle>
      </CardHeader>
      {entries.length === 0 ? (
        <p className="px-5 py-6 text-[13px] text-success">{t("overview.blockers.none")}</p>
      ) : (
        <ul className="divide-y">
          {entries.map(([kind, n]) => (
            <li key={kind} className="flex items-center gap-3 px-5 py-2.5">
              <span className="flex-1 text-[13px]">{t(`blocker.${kind}`)}</span>
              <span className="tabular text-[12.5px] text-muted-foreground">
                {n}/{total}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
