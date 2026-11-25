import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { RunsChart } from "@/components/quality/runs-chart";
import { RunsTable } from "@/components/quality/runs-table";
import { EmptyState } from "@/components/states";
import { Card } from "@/components/ui/card";
import { runsQuery } from "@/hooks/run-queries";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/projects/$key/runs/")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(runsQuery(params.key)),
  component: Runs,
});

function Runs() {
  const { t } = useI18n();
  const { key } = Route.useParams();
  const { data: runs } = useSuspenseQuery(runsQuery(key));
  return (
    <>
      <PageHeader title={t("nav.runs")} description={t("runs.lead")} />
      {runs.length === 0 ? (
        <EmptyState icon={<Activity />} title={t("runs.empty")} body={t("runs.empty.body")} />
      ) : (
        <div className="grid gap-5 [&>*]:min-w-0">
          <RunsChart runs={runs} />
          <Card><RunsTable projectKey={key} runs={runs} /></Card>
        </div>
      )}
    </>
  );
}
