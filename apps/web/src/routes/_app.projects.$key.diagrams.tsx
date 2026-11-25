import { lifecycleDiagram, moduleMapDiagram, qaFlowDiagram } from "@lastro/docs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MermaidView } from "@/components/diagrams/mermaid-view";
import { TraceDiagram } from "@/components/diagrams/trace-diagram";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { diagramsQuery } from "@/hooks/run-queries";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/projects/$key/diagrams")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(diagramsQuery(params.key)),
  component: Diagrams,
});

function DiagramCard({ title, lead, action, source, minHeight, children }: { title: string; lead?: string; action?: React.ReactNode; source?: string; minHeight?: number; children?: React.ReactNode }) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          {lead && <p className="mt-0.5 text-[12px] text-muted-foreground">{lead}</p>}
        </div>
        {action}
      </CardHeader>
      <div className="px-5 py-4">{children ?? (source ? <MermaidView source={source} minHeight={minHeight} /> : null)}</div>
    </Card>
  );
}

function Diagrams() {
  const { t, lang } = useI18n();
  const { key } = Route.useParams();
  const { data } = useSuspenseQuery(diagramsQuery(key));
  const [type, setType] = useState(data.types[0] ?? "");
  const [requirement, setRequirement] = useState("");
  const [pkg, setPkg] = useState("");
  const traced = requirement ? data.requirements.filter((r) => r.code === requirement) : data.requirements;
  const inPackage = pkg ? data.requirements.filter((r) => r.package === pkg) : data.requirements;
  const counts: Record<string, number> = {};
  for (const r of inPackage) counts[r.status] = (counts[r.status] ?? 0) + 1;
  const blocked = {
    "captured>specified": [...new Set(inPackage.flatMap((r) => r.holds.toSpecified))],
    "specified>approved": [...new Set(inPackage.flatMap((r) => r.holds.toApproved))],
  };
  return (
    <>
      <PageHeader title={t("nav.diagrams")} description={t("diagrams.lead")} />
      <div className="grid grid-cols-1 gap-5">
        {data.types.length > 0 && (
          <DiagramCard
            title={t("diagrams.flow")}
            action={<Select value={type} onChange={(e) => setType(e.target.value)} className="h-8 w-auto">{data.types.map((x) => <option key={x} value={x}>{x}</option>)}</Select>}
            source={qaFlowDiagram(data.config, type, undefined, lang)}
            minHeight={140}
          />
        )}
        <DiagramCard
          title={t("diagrams.trace")}
          lead={t("diagrams.trace.lead")}
          action={
            <Select value={requirement} onChange={(e) => setRequirement(e.target.value)} className="h-8 w-auto max-w-[260px]">
              <option value="">{t("common.all")}</option>
              {data.requirements.map((r) => <option key={r.code} value={r.code}>{r.code} · {r.title}</option>)}
            </Select>
          }
        >
          <TraceDiagram projectKey={key} requirements={traced} tests={data.tests} minHeight={320} />
        </DiagramCard>
        <DiagramCard title={t("diagrams.modules")} lead={t("diagrams.modules.lead")} source={moduleMapDiagram(data.requirements, lang)} minHeight={220} />
        <DiagramCard
          title={t("diagrams.lifecycle")}
          lead={t("diagrams.lifecycle.lead")}
          action={
            data.packages.length > 0 ? (
              <Select value={pkg} onChange={(e) => setPkg(e.target.value)} className="h-8 w-auto max-w-[260px]" aria-label={t("spec.tabs.packages")}>
                <option value="">{t("common.all")}</option>
                {data.packages.map((p) => <option key={p.code} value={p.code}>{p.code} · {p.title}</option>)}
              </Select>
            ) : undefined
          }
          source={lifecycleDiagram(data.edges, counts, blocked, lang)}
          minHeight={260}
        />
      </div>
    </>
  );
}
