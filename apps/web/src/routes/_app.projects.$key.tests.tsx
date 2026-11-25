import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, FlaskConical, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { TestsTable } from "@/components/quality/tests-table";
import { UncoveredCard } from "@/components/quality/uncovered-card";
import { EmptyState } from "@/components/states";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { testsQuery, type TestItem } from "@/hooks/run-queries";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/projects/$key/tests")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(testsQuery(params.key)),
  component: Tests,
});

type Filter = "all" | "failing" | "flaky" | "orphan";

const FILTERS: Record<Filter, (t: TestItem) => boolean> = {
  all: () => true,
  failing: (t) => t.last === "failed" || t.last === "error",
  flaky: (t) => t.flaky,
  orphan: (t) => t.orphan,
};

function Tests() {
  const { t } = useI18n();
  const { key } = Route.useParams();
  const { data } = useSuspenseQuery(testsQuery(key));
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const count = (f: Filter) => data.tests.filter(FILTERS[f]).length;
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.tests.filter(FILTERS[filter]).filter((x) => !q || x.ref.toLowerCase().includes(q));
  }, [data.tests, filter, search]);
  const labels: Record<Filter, string> = { all: t("tests.filter.all"), failing: t("tests.failing"), flaky: t("tests.flaky"), orphan: t("tests.orphan") };
  return (
    <>
      <PageHeader title={t("nav.tests")} description={t("tests.lead")} />
      {data.tests.length === 0 ? (
        <EmptyState icon={<FlaskConical />} title={t("tests.empty")} body={t("tests.empty.body")} />
      ) : (
        <div className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label={t("tests.total")} value={data.tests.length} icon={<FlaskConical />} tone="primary" />
            <KpiCard label={t("tests.passing")} value={data.tests.filter((x) => x.last === "passed").length} icon={<CheckCircle2 />} tone="success" />
            <KpiCard label={t("tests.failing")} value={count("failing")} icon={<XCircle />} tone={count("failing") ? "danger" : "neutral"} />
            <KpiCard label={t("tests.flaky")} value={count("flaky")} hint={t("tests.flaky.hint")} icon={<AlertTriangle />} tone={count("flaky") ? "warning" : "neutral"} />
          </div>
          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px] [&>*]:min-w-0">
            <Card>
              <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3">
                <div className="flex gap-1 rounded-md bg-muted p-0.5" role="tablist">
                  {(Object.keys(FILTERS) as Filter[]).map((f) => (
                    <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)} className={cn("rounded px-2.5 py-1 text-[12.5px] font-medium text-muted-foreground transition-colors", filter === f && "bg-card text-foreground shadow-sm")}>
                      {labels[f]} <span className="tabular ml-1 text-muted-foreground">{count(f)}</span>
                    </button>
                  ))}
                </div>
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("tests.search")} className="ml-auto h-8 w-full max-w-[260px]" />
              </div>
              {shown.length === 0 ? <p className="px-5 py-6 text-[13px] text-muted-foreground">{t("tests.none")}</p> : <TestsTable projectKey={key} tests={shown} />}
            </Card>
            <UncoveredCard projectKey={key} criteria={data.uncovered} />
          </div>
        </div>
      )}
    </>
  );
}
