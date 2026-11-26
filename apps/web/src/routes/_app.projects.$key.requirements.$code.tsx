import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { QaCard } from "@/components/quality/qa-card";
import { TraceCard } from "@/components/quality/trace-card";
import { CitationCard } from "@/components/spec/citation-card";
import { FieldsCard } from "@/components/spec/fields-card";
import { HallmarkPanel } from "@/components/spec/hallmark";
import { LifecycleStepper } from "@/components/spec/lifecycle-stepper";
import { RequirementActions } from "@/components/spec/requirement-actions";
import { BlockersList, CriteriaList, HistoryList, RelatedList } from "@/components/spec/requirement-sections";
import { StatusBadge } from "@/components/status-badge";
import { requirementAction } from "@/fns/requirements";
import { requirementQuery } from "@/hooks/spec-queries";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n";
import { RichText } from "@/lib/rich-text";
import { typeLabel } from "@/lib/type-label";

export const Route = createFileRoute("/_app/projects/$key/requirements/$code")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(requirementQuery(params.key, params.code)),
  component: RequirementDetail,
});

function RequirementDetail() {
  const { t } = useI18n();
  const { key, code } = Route.useParams();
  const { data: r } = useSuspenseQuery(requirementQuery(key, code));
  const { run } = useAction(key);
  const locked = r.criteria.some((c) => c.lockedHash);
  return (
    <article className="grid gap-5">
      <div>
        <Link to="/projects/$key/requirements" params={{ key }} className="inline-flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> {t("nav.requirements")}
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
              <span className="font-mono">{r.code}</span>
              <StatusBadge status={r.status} />
              <span>{typeLabel(t, r.type)}</span>
              {r.package && <span>· {r.package.title}</span>}
            </div>
            <h1 className="mt-1.5 max-w-[60ch] text-[22px] font-bold leading-tight tracking-tight">
              <RichText text={r.title} />
            </h1>
          </div>
          <RequirementActions projectKey={key} code={r.code} status={r.status} locked={locked} approveBlockedBy={[...new Set(r.blockers.filter((b) => b.blocks !== "verified").map((b) => t(`blocker.${b.kind}`)))]} />
        </div>
      </div>
      <LifecycleStepper projectKey={key} code={r.code} status={r.status} holds={r.blockers} />
      <HallmarkPanel hallmark={r.hallmark} />
      <BlockersList blockers={r.blockers} />
      <section className="grid gap-3" aria-label={t("req.detail.request")}>
        <h2 className="text-[15px] font-semibold">{t("req.detail.request")}</h2>
        {r.citations.map((c) => (
          <CitationCard
            key={c.position}
            projectKey={key}
            citation={c}
            onConfirm={() => void run(() => requirementAction({ data: { key, code: r.code, action: "confirmQuote", position: c.position } }), t("action.done"))}
          />
        ))}
      </section>
      <FieldsCard requirement={r} required={r.required} />
      <CriteriaList criteria={r.criteria} />
      <QaCard projectKey={key} code={r.code} status={r.status} />
      <TraceCard projectKey={key} code={r.code} />
      <div className="grid gap-5 lg:grid-cols-2">
        <RelatedList projectKey={key} decisions={r.decisions} questions={r.questions} />
        <HistoryList history={r.history} />
      </div>
    </article>
  );
}
