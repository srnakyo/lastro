import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CircleCheck, CircleX, FlaskConical, ShieldCheck } from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { AttentionCard } from "@/components/overview/attention-card";
import { BackingCard } from "@/components/overview/backing-card";
import { BlockersCard } from "@/components/overview/blockers-card";
import { LatestRuns } from "@/components/overview/latest-runs";
import { ModuleQuality } from "@/components/overview/module-quality";
import { ResultDistribution } from "@/components/overview/result-distribution";
import { StatusFunnel } from "@/components/overview/status-funnel";
import { PageHeader } from "@/components/page-header";
import { overviewQuery, projectQuery } from "@/hooks/queries";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/projects/$key/")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(overviewQuery(params.key)),
  component: Overview,
});

function Overview() {
  const { t } = useI18n();
  const { key } = Route.useParams();
  const { data: project } = useSuspenseQuery(projectQuery(key));
  const { data: o } = useSuspenseQuery(overviewQuery(key));
  const covered = Math.round((o.coverage * o.requirements) / 100);
  return (
    <>
      <PageHeader title={project.name} description={project.description ?? undefined} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t("overview.kpi.coverage")} value={`${o.coverage}%`} icon={<ShieldCheck />} tone="primary" hint={t("overview.kpi.ofTotal", { n: covered, total: o.requirements })} />
        <KpiCard label={t("overview.kpi.run")} value={o.tests.tests} icon={<FlaskConical />} hint={t("overview.kpi.pendingCriteria", { n: o.tests.pending })} />
        <KpiCard label={t("overview.kpi.passed")} value={o.tests.passed} icon={<CircleCheck />} tone="success" />
        <KpiCard label={t("overview.kpi.failed")} value={o.tests.failed} icon={<CircleX />} tone={o.tests.failed > 0 ? "danger" : "neutral"} />
      </div>
      <div className="mt-4 grid items-start gap-4 lg:grid-cols-12">
        <div className="grid content-start gap-4 lg:col-span-8">
          <ResultDistribution passed={o.tests.passed} failed={o.tests.failed} pending={o.tests.pending} />
          <LatestRuns projectKey={key} runs={o.runs} />
          <ModuleQuality modules={o.modules} />
        </div>
        <div className="grid content-start gap-4 lg:col-span-4">
          <AttentionCard questions={o.openQuestions} decisions={o.proposedDecisions} incidents={o.openIncidents} />
          <StatusFunnel byStatus={o.byStatus} total={o.requirements} />
          <BlockersCard blockers={o.blockers} total={o.requirements} />
          <BackingCard links={o.links} total={o.requirements} />
        </div>
      </div>
    </>
  );
}
