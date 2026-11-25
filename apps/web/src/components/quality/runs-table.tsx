import { Link, useNavigate } from "@tanstack/react-router";
import { RunBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import type { RunListItem } from "@/hooks/run-queries";
import { formatDateTime, formatDuration } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

function Requirements({ codes }: { codes: string[] }) {
  const shown = codes.slice(0, 3);
  return (
    <span className="flex flex-wrap gap-1">
      {shown.map((c) => <span key={c} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11.5px]">{c}</span>)}
      {codes.length > shown.length && <span className="text-[11.5px] text-muted-foreground">+{codes.length - shown.length}</span>}
    </span>
  );
}

export function RunsTable({ projectKey, runs }: { projectKey: string; runs: RunListItem[] }) {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const open = (id: string) => void navigate({ to: "/projects/$key/runs/$id", params: { key: projectKey, id } });
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-[13px]">
        <thead>
          <tr className="border-b text-left text-[11.5px] uppercase tracking-wide text-muted-foreground">
            <th className="px-5 py-2.5 font-medium">{t("runs.col.run")}</th>
            <th className="px-3 py-2.5 font-medium">{t("runs.col.trigger")}</th>
            <th className="px-3 py-2.5 font-medium">{t("runs.col.requirements")}</th>
            <th className="px-3 py-2.5 text-right font-medium">{t("runs.col.stages")}</th>
            <th className="px-3 py-2.5 text-right font-medium">{t("runs.col.tests")}</th>
            <th className="px-3 py-2.5 font-medium">{t("runs.col.started")}</th>
            <th className="px-3 py-2.5 text-right font-medium">{t("runs.col.duration")}</th>
            <th className="px-5 py-2.5 text-right font-medium" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {runs.map((run) => (
            <tr key={run.id} onClick={() => open(run.id)} className="cursor-pointer hover:bg-accent/40">
              <td className="px-5 py-3">
                <Link to="/projects/$key/runs/$id" params={{ key: projectKey, id: run.id }} className="font-mono text-[12.5px] font-medium hover:text-primary" onClick={(e) => e.stopPropagation()}>
                  {run.commit ?? run.id.slice(0, 8)}
                </Link>
                <p className="font-mono text-[11.5px] text-muted-foreground">{run.branch ?? "—"}{run.dirty ? " *" : ""}</p>
              </td>
              <td className="px-3 py-3"><Badge tone={run.trigger === "ci" ? "primary" : run.trigger === "agent" ? "info" : "neutral"}>{t(`run.trigger.${run.trigger}` as never)}</Badge></td>
              <td className="px-3 py-3"><Requirements codes={run.requirements} /></td>
              <td className="tabular px-3 py-3 text-right">{run.stages.passed}/{run.stages.total}</td>
              <td className="tabular px-3 py-3 text-right">
                <span className="text-success">{run.tests.passed}</span>
                {run.tests.failed > 0 && <span className="ml-2 text-destructive">{run.tests.failed}</span>}
              </td>
              <td className="px-3 py-3 text-muted-foreground">{formatDateTime(run.startedAt, lang)}</td>
              <td className="tabular px-3 py-3 text-right text-muted-foreground">{formatDuration(run.durationMs)}</td>
              <td className="px-5 py-3 text-right"><RunBadge status={run.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
