import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Bug } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ReportIncidentDialog, TriageDialog } from "@/components/spec/incident-forms";
import { EmptyState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { incidentsQuery } from "@/hooks/spec-queries";
import { formatDateTime } from "@/lib/format";
import type { MessageKey } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/projects/$key/bugs")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(incidentsQuery(params.key)),
  component: Bugs,
});

function Tally({ title, counts, prefix }: { title: string; counts: Record<string, number>; prefix: "cause" | "billing" }) {
  const { t } = useI18n();
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="grid gap-2">
        {entries.length === 0 ? <p className="text-[13px] text-muted-foreground">—</p> : entries.map(([k, n]) => (
          <div key={k} className="flex justify-between text-[13px]"><span>{t(`${prefix}.${k}` as MessageKey)}</span><span className="tabular font-semibold">{n}</span></div>
        ))}
      </CardContent>
    </Card>
  );
}

function Bugs() {
  const { t, lang } = useI18n();
  const { key } = Route.useParams();
  const { data: incidents } = useSuspenseQuery(incidentsQuery(key));
  const count = (field: "cause" | "billing") => incidents.reduce<Record<string, number>>((acc, i) => (i[field] ? { ...acc, [i[field]]: (acc[i[field]] ?? 0) + 1 } : acc), {});
  return (
    <>
      <PageHeader title={t("nav.bugs")} description={t("bug.lead")} actions={<ReportIncidentDialog projectKey={key} />} />
      {incidents.length === 0 ? (
        <EmptyState icon={<Bug />} title={t("bug.empty")} body={t("bug.lead")} />
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <Card>
            <ul className="divide-y">
              {incidents.map((i) => (
                <li key={i.code} className="grid gap-3 px-5 py-4 lg:grid-cols-[1fr_auto]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-[12px]">
                      <span className="font-mono text-muted-foreground">{i.code}</span>
                      {i.triage ? <Badge tone={i.triage === "bug" ? "danger" : "neutral"}>{t(`triage.${i.triage}`)}</Badge> : <Badge tone="warning">{t("bug.untriaged")}</Badge>}
                      {i.cause && <Badge>{t(`cause.${i.cause}`)}</Badge>}
                      {i.billing && <Badge tone="info">{t(`billing.${i.billing}`)}</Badge>}
                      <span className="text-muted-foreground">{formatDateTime(i.createdAt, lang)}</span>
                    </div>
                    <p className="mt-1.5 max-w-[90ch] text-[13.5px] font-medium">{i.reported}</p>
                    <p className="mt-1 flex flex-wrap gap-x-3 text-[12px] text-muted-foreground">
                      {i.requirement && <Link to="/projects/$key/requirements/$code" params={{ key, code: i.requirement.code }} className="font-mono text-primary hover:underline">{i.requirement.code}</Link>}
                      {i.sourceRef && <span>{i.sourceRef}</span>}
                      {i.regressionTest && <code className="font-mono">{i.regressionTest}</code>}
                    </p>
                  </div>
                  {!i.triage && <TriageDialog projectKey={key} code={i.code} />}
                </li>
              ))}
            </ul>
          </Card>
          <div className="grid gap-4">
            <Tally title={t("bug.byCause")} counts={count("cause")} prefix="cause" />
            <Tally title={t("bug.byBilling")} counts={count("billing")} prefix="billing" />
          </div>
        </div>
      )}
    </>
  );
}
