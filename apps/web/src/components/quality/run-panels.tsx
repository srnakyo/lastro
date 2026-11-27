import { Link } from "@tanstack/react-router";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { RunDetail } from "@/hooks/run-queries";
import { useI18n } from "@/lib/i18n";
import { RunStageRow } from "./run-stage";

function TestList({ title, refs, tone }: { title: string; refs: string[]; tone: "danger" | "success" }) {
  if (refs.length === 0) return null;
  return (
    <div>
      <p className={tone === "danger" ? "text-[12px] font-medium text-destructive" : "text-[12px] font-medium text-success"}>{title} ({refs.length})</p>
      <ul className="mt-1 grid gap-0.5">{refs.map((ref) => <li key={ref} className="truncate font-mono text-[12px]">{ref}</li>)}</ul>
    </div>
  );
}

/** Per requirement: the previous run of that requirement, the tests that started failing and those passing again. */
export function RunChanges({ projectKey, run }: { projectKey: string; run: RunDetail }) {
  const { t } = useI18n();
  return (
    <Card role="region" aria-label={t("run.changes")}>
      <CardHeader><CardTitle className="min-w-0">{t("run.changes")}</CardTitle></CardHeader>
      {run.comparisons.length === 0 ? (
        <p className="px-5 py-4 text-[13px] text-muted-foreground">{t("run.changes.first")}</p>
      ) : (
        <ul className="divide-y">
          {run.comparisons.map((c) => (
            <li key={c.requirement} className="grid gap-2 px-5 py-3">
              <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
                <span className="font-mono font-medium">{c.requirement}</span>
                {c.previousId ? (
                  <Link to="/projects/$key/runs/$id" params={{ key: projectKey, id: c.previousId }} className="shrink-0 whitespace-nowrap text-primary hover:underline">
                    {t("run.previousOf", { commit: c.previousCommit ?? c.previousId.slice(0, 8) })}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">{t("run.changes.first")}</span>
                )}
              </div>
              {c.previousId && c.newlyFailing.length === 0 && c.newlyPassing.length === 0 && <p className="text-[12.5px] text-muted-foreground">{t("run.changes.none")}</p>}
              <TestList title={t("run.newlyFailing")} refs={c.newlyFailing} tone="danger" />
              <TestList title={t("run.newlyPassing")} refs={c.newlyPassing} tone="success" />
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
            {group.stages.map((s) => <RunStageRow key={s.id} projectKey={projectKey} stage={s} />)}
          </div>
        </Card>
      ))}
    </div>
  );
}
