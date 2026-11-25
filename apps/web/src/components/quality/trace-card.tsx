import { useQuery } from "@tanstack/react-query";
import { TraceDiagram } from "@/components/diagrams/trace-diagram";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { diagramsQuery } from "@/hooks/run-queries";
import { useI18n } from "@/lib/i18n";

/** The traceability of one requirement, on its own page: source, criteria, tests and runs, with the gaps. */
export function TraceCard({ projectKey, code }: { projectKey: string; code: string }) {
  const { t } = useI18n();
  const { data } = useQuery(diagramsQuery(projectKey));
  const requirement = data?.requirements.find((r) => r.code === code);
  if (!data || !requirement) return null;
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>{t("diagrams.trace")}</CardTitle>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{t("diagrams.trace.lead")}</p>
        </div>
      </CardHeader>
      <div className="px-5 py-4"><TraceDiagram projectKey={projectKey} requirements={[requirement]} tests={data.tests} minHeight={140} /></div>
    </Card>
  );
}
