import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Gavel } from "lucide-react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { NewDecisionDialog } from "@/components/spec/decision-forms";
import { EmptyState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { decisionAction } from "@/fns/decisions";
import { decisionsQuery } from "@/hooks/spec-queries";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/projects/$key/requirements/decisions")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(decisionsQuery(params.key)),
  component: Decisions,
});

const TONE = { proposed: "warning", confirmed: "success", overturned: "danger" } as const;

function Decisions() {
  const { t } = useI18n();
  const { key } = Route.useParams();
  const { data: decisions } = useSuspenseQuery(decisionsQuery(key));
  const { run } = useAction(key);
  const act = (code: string, action: "confirm" | "overturn") => (reason: string) => run(() => decisionAction({ data: { key, code, action, reason } }), t("action.done"));
  return (
    <>
      <PageHeader title={t("spec.tabs.decisions")} description={t("dec.lead")} actions={<NewDecisionDialog projectKey={key} />} />
      {decisions.length === 0 ? (
        <EmptyState icon={<Gavel />} title={t("dec.empty")} body={t("dec.lead")} />
      ) : (
        <Card>
          <ul className="divide-y">
            {decisions.map((d) => (
              <li key={d.code} className="grid gap-3 px-5 py-4 lg:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[12px]">
                    <span className="font-mono text-muted-foreground">{d.code}</span>
                    <Badge tone={TONE[d.status]}>{t(`dec.status.${d.status}`)}</Badge>
                    <Badge>{t(`dec.kind.${d.kind}`)}</Badge>
                    <span className="text-muted-foreground">{t(`role.${d.decidedBy}`)}{d.decidedByAgent ? ` · ${t("dec.byAgent")}` : ""}</span>
                  </div>
                  <p className="mt-1.5 max-w-[90ch] text-[13.5px] font-medium">{d.text}</p>
                  {d.reason && <p className="mt-1 max-w-[90ch] text-[13px] text-muted-foreground">{d.reason}</p>}
                  {d.requirements.length > 0 && (
                    <p className="mt-2 flex flex-wrap gap-2">
                      {d.requirements.map((code) => (
                        <Link key={code} to="/projects/$key/requirements/$code" params={{ key, code }} className="font-mono text-[11.5px] text-primary hover:underline">{code}</Link>
                      ))}
                    </p>
                  )}
                </div>
                {d.status !== "overturned" && (
                  <div className="flex items-start gap-2">
                    {d.status === "proposed" && (
                      <ConfirmDialog trigger={<Button size="sm">{t("dec.confirm")}</Button>} title={t("dec.confirm.title")} description={t("dec.confirm.body")} confirmLabel={t("dec.confirm")} onConfirm={act(d.code, "confirm")} />
                    )}
                    <ConfirmDialog trigger={<Button size="sm" variant="outline">{t("dec.overturn")}</Button>} title={t("dec.overturn.title")} description={t("dec.overturn.body")} confirmLabel={t("dec.overturn")} reasonLabel={t("dec.overturn.reason")} destructive onConfirm={act(d.code, "overturn")} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
