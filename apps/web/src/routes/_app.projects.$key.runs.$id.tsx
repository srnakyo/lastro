import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { RunChanges, RunReleased, RunStages } from "@/components/quality/run-panels";
import { RunBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { runQuery } from "@/hooks/run-queries";
import { formatDateTime, formatDuration } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/projects/$key/runs/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(runQuery(params.key, params.id)),
  component: RunPage,
});

function RunPage() {
  const { t, lang } = useI18n();
  const { key, id } = Route.useParams();
  const { data: run } = useSuspenseQuery(runQuery(key, id));
  const env = Object.entries((run.environment ?? {}) as Record<string, string>);
  return (
    <>
      <Link to="/projects/$key/runs" params={{ key }} className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> {t("run.back")}
      </Link>
      <PageHeader
        title={<span className="flex items-center gap-3">{t("run.title", { commit: run.commit ?? run.id.slice(0, 8) })} <RunBadge status={run.status} /></span>}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono">{run.branch ?? "—"}{run.dirty ? " *" : ""}</span>
            <Badge tone={run.trigger === "ci" ? "primary" : run.trigger === "agent" ? "info" : "neutral"}>{t(`run.trigger.${run.trigger}` as never)}</Badge>
            <span>{formatDateTime(run.startedAt, lang)}</span>
            <span>{formatDuration(run.durationMs)}</span>
          </span>
        }
      />
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px] [&>*]:min-w-0">
        <RunStages projectKey={key} run={run} />
        <div className="grid gap-5">
          <RunChanges projectKey={key} run={run} />
          <RunReleased projectKey={key} run={run} />
          {env.length > 0 && (
            <Card>
              <CardHeader><CardTitle>{t("run.environment")}</CardTitle></CardHeader>
              <CardContent className="grid gap-1.5">
                {env.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 text-[12.5px]"><span className="text-muted-foreground">{k}</span><span className="truncate font-mono">{v}</span></div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
