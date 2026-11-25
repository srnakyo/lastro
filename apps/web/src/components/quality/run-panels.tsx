import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { ResultBadge } from "@/components/status-badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { RunDetail } from "@/hooks/run-queries";
import { useI18n } from "@/lib/i18n";
import { RunStageRow } from "./run-stage";

export function RunChanges({ projectKey, run }: { projectKey: string; run: RunDetail }) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="min-w-0">{t("run.changes")}</CardTitle>
        {run.previousId && (
          <Link to="/projects/$key/runs/$id" params={{ key: projectKey, id: run.previousId }} className="shrink-0 whitespace-nowrap text-[12.5px] text-primary hover:underline">{t("run.previous")}</Link>
        )}
      </CardHeader>
      {!run.previousId || run.changed.length === 0 ? (
        <p className="px-5 py-4 text-[13px] text-muted-foreground">{run.previousId ? t("run.changes.none") : t("run.changes.first")}</p>
      ) : (
        <ul className="divide-y">
          {run.changed.map((c) => (
            <li key={c.ref} className="flex flex-wrap items-center gap-2 px-5 py-2.5">
              <span className="min-w-0 flex-1 truncate font-mono text-[12px]">{c.ref}</span>
              {c.from && <ResultBadge status={c.from} />}
              <ArrowRight className="size-3.5 text-muted-foreground" />
              <ResultBadge status={c.to} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function RunReleased({ projectKey, run }: { projectKey: string; run: RunDetail }) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader><CardTitle>{t("run.released")}</CardTitle></CardHeader>
      {run.evidence.length === 0 ? (
        <p className="px-5 py-4 text-[13px] text-muted-foreground">{t("run.released.none")}</p>
      ) : (
        <ul className="divide-y">
          {run.evidence.map((e) => (
            <li key={e.id} className="px-5 py-2.5">
              <Link to="/projects/$key/requirements/$code" params={{ key: projectKey, code: e.requirement.code }} className="font-mono text-[12.5px] text-primary hover:underline">{e.requirement.code}</Link>
              <p className="truncate font-mono text-[11px] text-muted-foreground">{e.treeHash.slice(0, 23)}…</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Stages grouped by requirement, in run order. */
export function RunStages({ projectKey, run }: { projectKey: string; run: RunDetail }) {
  const { t } = useI18n();
  const groups = new Map<string, { title: string | null; stages: RunDetail["stages"] }>();
  for (const s of run.stages) {
    const code = s.requirement?.code ?? "";
    const group = groups.get(code) ?? { title: s.requirement?.title ?? null, stages: [] };
    group.stages.push(s);
    groups.set(code, group);
  }
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      {[...groups.entries()].map(([code, group]) => (
        <Card key={code || "project"}>
          <CardHeader>
            {code ? (
              <Link to="/projects/$key/requirements/$code" params={{ key: projectKey, code }} className="min-w-0 hover:text-primary">
                <span className="font-mono text-[12px] text-muted-foreground">{code}</span>
                <CardTitle className="truncate">{group.title}</CardTitle>
              </Link>
            ) : (
              <CardTitle>{t("run.noRequirement")}</CardTitle>
            )}
          </CardHeader>
          <div className="divide-y text-[13px]">
            {group.stages.map((s) => <RunStageRow key={s.id} stage={s} />)}
          </div>
        </Card>
      ))}
    </div>
  );
}
