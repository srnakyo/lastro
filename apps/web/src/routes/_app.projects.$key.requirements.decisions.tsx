import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CircleCheck, Gavel } from "lucide-react";
import { z } from "zod";
import { BulkBar } from "@/components/decisions/bulk-bar";
import { DecisionRow } from "@/components/decisions/decision-card";
import { DecisionGroup } from "@/components/decisions/decision-group";
import { groupOf, type DecisionItem, type WaitingGroup } from "@/components/decisions/decision-rules";
import { PageHeader } from "@/components/page-header";
import { NewDecisionDialog } from "@/components/spec/decision-forms";
import { EmptyState } from "@/components/states";
import { Card } from "@/components/ui/card";
import { decisionsQuery } from "@/hooks/spec-queries";
import { useSelection } from "@/hooks/use-selection";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const VIEWS = ["waiting", "confirmed", "overturned"] as const;
type View = (typeof VIEWS)[number];
const GROUPS: WaitingGroup[] = ["person", "agent", "assumption"];
const STATUS: Record<View, DecisionItem["status"]> = { waiting: "proposed", confirmed: "confirmed", overturned: "overturned" };

export const Route = createFileRoute("/_app/projects/$key/requirements/decisions")({
  validateSearch: (s) => z.object({ view: z.enum(VIEWS).optional() }).parse(s),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(decisionsQuery(params.key)),
  component: Decisions,
});

function ViewTabs({ view, counts, onChange }: { view: View; counts: Record<View, number>; onChange: (v: View) => void }) {
  const { t } = useI18n();
  return (
    <div role="tablist" className="scrollbar-none mb-5 flex max-w-full gap-1 overflow-x-auto rounded-lg bg-muted p-1 sm:w-fit">
      {VIEWS.map((v) => (
        <button key={v} role="tab" aria-selected={view === v} onClick={() => onChange(v)} className={cn("flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors", view === v && "bg-card text-foreground shadow-sm")}>
          {t(`dec.view.${v}` as MessageKey)}
          <span className={cn("tabular rounded-full px-1.5 text-[11.5px] font-semibold", v === "waiting" && counts.waiting > 0 ? "bg-warning/15 text-warning" : "bg-background/60")}>{counts[v]}</span>
        </button>
      ))}
    </div>
  );
}

function Decisions() {
  const { t } = useI18n();
  const { key } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: decisions } = useSuspenseQuery(decisionsQuery(key));
  const { selected, toggle, clear } = useSelection();
  const counts = Object.fromEntries(VIEWS.map((v) => [v, decisions.filter((d) => d.status === STATUS[v]).length])) as Record<View, number>;
  const view: View = search.view ?? (counts.waiting > 0 || counts.confirmed === 0 ? "waiting" : "confirmed");
  const shown = decisions.filter((d) => d.status === STATUS[view]);
  const live = [...selected].filter((code) => shown.some((d) => d.code === code));
  return (
    <>
      <PageHeader title={t("spec.tabs.decisions")} description={t("dec.page.lead")} actions={<NewDecisionDialog projectKey={key} />} />
      {decisions.length === 0 ? (
        <EmptyState icon={<Gavel />} title={t("dec.empty")} body={t("dec.page.lead")} />
      ) : (
        <>
          <ViewTabs view={view} counts={counts} onChange={(v) => { clear(); void navigate({ search: { view: v }, replace: true }); }} />
          {view === "waiting" ? (
            shown.length === 0 ? (
              <EmptyState icon={<CircleCheck />} title={t("dec.none.waiting")} body="" />
            ) : (
              <div className="grid gap-8">
                {GROUPS.map((g) => (
                  <DecisionGroup key={g} projectKey={key} group={g} items={shown.filter((d) => groupOf(d) === g)} all={decisions} selected={selected} onSelect={toggle} />
                ))}
                <BulkBar projectKey={key} codes={live} onDone={clear} />
              </div>
            )
          ) : shown.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">{t("dec.none.view")}</p>
          ) : (
            <Card>
              <ul className="divide-y">
                {shown.map((d) => (
                  <DecisionRow key={d.code} projectKey={key} decision={d} />
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </>
  );
}
