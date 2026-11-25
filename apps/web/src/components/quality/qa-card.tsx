import { qaFlowDiagram } from "@lastro/docs";
import type { Stage } from "@lastro/shared";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { MermaidView } from "@/components/diagrams/mermaid-view";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { requirementQaQuery, type RequirementQa } from "@/hooks/run-queries";
import { formatDateTime } from "@/lib/format";
import { gateItemText } from "@/lib/gate-item";
import { useI18n } from "@/lib/i18n";
import { SignStageDialog } from "./sign-stage-dialog";

const ACTIVE = ["building", "verified", "reopened", "previewed", "delivered", "accepted"];

function manualStages(qa: RequirementQa) {
  const flow: Stage[] = [...qa.config.global_flow, ...(qa.config.types[qa.type]?.flow ?? [])];
  return flow.flatMap((s) => (typeof s === "object" && s.manual ? (s.conditions?.length ? s.conditions : [null]).map((condition) => ({ stage: s.check ?? s.run ?? "stage", condition })) : []));
}

function GateLists({ qa }: { qa: RequirementQa }) {
  const { t } = useI18n();
  if (qa.gate.pass) return null;
  const lists = [
    { title: "qa.fix" as const, items: qa.gate.fixItems.map((i) => gateItemText(t, i)) },
    { title: "qa.person" as const, items: qa.gate.personItems.map((i) => gateItemText(t, i)) },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {lists.map((list) =>
        list.items.length === 0 ? null : (
          <div key={list.title}>
            <p className="mb-1 text-[12px] font-medium text-muted-foreground">{t(list.title)}</p>
            <ul className="grid gap-1 text-[12.5px]">
              {list.items.map((i) => (
                <li key={i} className="break-words">{i}</li>
              ))}
            </ul>
          </div>
        ),
      )}
    </div>
  );
}

export function QaCard({ projectKey, code, status }: { projectKey: string; code: string; status: string }) {
  const { t, lang } = useI18n();
  const { data: qa } = useQuery(requirementQaQuery(projectKey, code));
  if (!qa) return null;
  const active = ACTIVE.includes(status);
  const pendingManual = manualStages(qa).filter((m) => qa.states[`${m.stage}|${m.condition ?? ""}`] !== "passed");
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t("qa.title")}</CardTitle>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{t("qa.lead")}</p>
        </div>
        {active && <Badge tone={qa.gate.pass ? "success" : "danger"}>{qa.gate.pass ? t("qa.gate.pass") : t("qa.gate.fail")}</Badge>}
      </CardHeader>
      <div className="grid gap-4 px-5 py-4">
        <MermaidView source={qaFlowDiagram(qa.config, qa.type, qa.states, lang)} minHeight={120} fit />
        {active && <GateLists qa={qa} />}
        {active && pendingManual.length > 0 && (
          <div className="flex flex-wrap gap-2">{pendingManual.map((m) => <SignStageDialog key={`${m.stage}${m.condition}`} projectKey={projectKey} code={code} stage={m.stage} condition={m.condition} />)}</div>
        )}
        <div>
          <p className="mb-1.5 text-[12px] font-medium text-muted-foreground">{t("qa.evidence")}</p>
          {qa.evidence.length === 0 ? (
            <p className="text-[12.5px] text-muted-foreground">{t("qa.evidence.none")}</p>
          ) : (
            <ul className="grid gap-1 text-[12.5px]">
              {qa.evidence.map((e) => (
                <li key={e.id} className="flex flex-wrap gap-x-3">
                  <Link to="/projects/$key/runs/$id" params={{ key: projectKey, id: e.runId }} className="font-mono text-primary hover:underline">{e.commit ?? e.runId.slice(0, 8)}</Link>
                  <span className="text-muted-foreground">{t(`run.trigger.${e.trigger}` as never)} · {formatDateTime(e.verifiedAt, lang)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}
