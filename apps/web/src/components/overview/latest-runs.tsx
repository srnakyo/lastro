import { GitCommitHorizontal } from "lucide-react";
import { RunBadge } from "@/components/status-badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatDuration } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { RichText } from "@/lib/rich-text";

interface RunRow {
  id: string;
  trigger: string;
  commit: string | null;
  branch: string | null;
  status: string;
  startedAt: string | Date;
  durationMs: number | null;
}

export function LatestRuns({ runs }: { runs: RunRow[] }) {
  const { t, lang } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("overview.runs")}</CardTitle>
      </CardHeader>
      {runs.length === 0 ? (
        <p className="px-5 py-6 text-[13px] text-muted-foreground">
          <RichText text={t("overview.runs.empty")} />
        </p>
      ) : (
        <ul className="divide-y">
          {runs.map((run) => (
            <li key={run.id} className="flex items-center gap-3 px-5 py-3 hover:bg-accent/50">
              <GitCommitHorizontal className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[12.5px]">
                  {run.branch ?? "—"} @ {run.commit ?? "—"}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {t(`run.trigger.${run.trigger}` as never)} · {formatDateTime(run.startedAt, lang)} · {formatDuration(run.durationMs)}
                </p>
              </div>
              <RunBadge status={run.status} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
