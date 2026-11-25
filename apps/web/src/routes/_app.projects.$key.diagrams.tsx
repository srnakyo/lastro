import { lifecycleDiagram, qaFlowDiagram, traceabilityDiagram } from "@lastro/docs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MermaidView } from "@/components/diagrams/mermaid-view";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { diagramsQuery } from "@/hooks/run-queries";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/projects/$key/diagrams")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(diagramsQuery(params.key)),
  component: Diagrams,
});

function DiagramCard({ title, lead, action, source, minHeight }: { title: string; lead?: string; action?: React.ReactNode; source: string; minHeight?: number }) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          {lead && <p className="mt-0.5 text-[12px] text-muted-foreground">{lead}</p>}
        </div>
        {action}
      </CardHeader>
      <div className="px-5 py-4"><MermaidView source={source} minHeight={minHeight} /></div>
    </Card>
  );
}

function Diagrams() {
  const { t } = useI18n();
  const { key } = Route.useParams();
  const { data } = useSuspenseQuery(diagramsQuery(key));
  const [type, setType] = useState(data.types[0] ?? "");
  const [requirement, setRequirement] = useState("");
  const traced = requirement ? data.requirements.filter((r) => r.code === requirement) : data.requirements;
  return (
    <>
      <PageHeader title={t("nav.diagrams")} description={t("diagrams.lead")} />
      <div className="grid grid-cols-1 gap-5">
        {data.types.length > 0 && (
          <DiagramCard
            title={t("diagrams.flow")}
            action={<Select value={type} onChange={(e) => setType(e.target.value)} className="h-8 w-auto">{data.types.map((x) => <option key={x} value={x}>{x}</option>)}</Select>}
            source={qaFlowDiagram(data.config, type)}
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
          source={traceabilityDiagram(traced, data.tests)}
          minHeight={320}
        />
        <DiagramCard title={t("diagrams.lifecycle")} lead={t("diagrams.lifecycle.lead")} source={lifecycleDiagram(data.edges, data.counts)} minHeight={260} />
      </div>
    </>
  );
}
