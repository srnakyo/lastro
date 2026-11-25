import { traceabilityDiagram, traceIds, type TestStates, type TraceRequirement } from "@lastro/docs";
import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { MermaidView } from "./mermaid-view";

/** Traceability where a requirement, a source passage or a run opens its page when clicked. */
export function TraceDiagram({ projectKey, requirements, tests, minHeight }: { projectKey: string; requirements: TraceRequirement[]; tests: TestStates; minHeight?: number }) {
  const navigate = useNavigate();
  const { lang } = useI18n();
  const links = useMemo(() => {
    const map = new Map<string, () => void>();
    for (const r of requirements) {
      map.set(traceIds.requirement(r.code), () => void navigate({ to: "/projects/$key/requirements/$code", params: { key: projectKey, code: r.code } }));
      for (const c of r.citations) map.set(traceIds.passage(c.source, c.anchor), () => void navigate({ to: "/projects/$key/sources/$code", params: { key: projectKey, code: c.source } }));
    }
    for (const state of Object.values(tests)) {
      if (typeof state === "object" && state.runId) {
        const id = state.runId;
        map.set(traceIds.run(id), () => void navigate({ to: "/projects/$key/runs/$id", params: { key: projectKey, id } }));
      }
    }
    return map;
  }, [requirements, tests, projectKey, navigate]);
  const onNodeClick = (nodeId: string) => {
    const go = links.get(nodeId);
    go?.();
    return !!go;
  };
  return <MermaidView source={traceabilityDiagram(requirements, tests, lang)} minHeight={minHeight} onNodeClick={onNodeClick} />;
}
