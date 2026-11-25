import { ChevronRight } from "lucide-react";
import { ResultBadge, RunBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import type { RunDetail } from "@/hooks/run-queries";
import { formatDuration } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

type Stage = RunDetail["stages"][number];

const ORDER: Record<string, number> = { failed: 0, error: 0, skipped: 1, passed: 2 };

function Results({ stage }: { stage: Stage }) {
  const sorted = [...stage.results].sort((a, b) => (ORDER[a.status] ?? 3) - (ORDER[b.status] ?? 3));
  return (
    <ul className="divide-y rounded-md border">
      {sorted.map((r) => (
        <li key={r.id} className="flex items-start gap-3 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="break-words font-mono text-[12px]">{r.test.ref}</p>
            {r.message && <p className="mt-0.5 text-[12px] text-destructive">{r.message}</p>}
          </div>
          <span className="tabular text-[12px] text-muted-foreground">{formatDuration(r.durationMs)}</span>
          <ResultBadge status={r.status} />
        </li>
      ))}
    </ul>
  );
}

function Findings({ stage }: { stage: Stage }) {
  const { t } = useI18n();
  return (
    <div>
      <p className="mb-1.5 text-[12px] font-medium text-muted-foreground">{t("run.findings")}</p>
      <ul className="divide-y rounded-md border">
        {stage.findings.map((f) => (
          <li key={f.id} className="flex items-start gap-3 px-3 py-2 text-[12px]">
            <Badge tone={f.level === "error" ? "danger" : f.level === "warning" ? "warning" : "neutral"}>{f.level}</Badge>
            <span className="min-w-0 flex-1">{f.message}</span>
            <span className="font-mono text-muted-foreground">{f.file}{f.line ? `:${f.line}` : ""}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Artifacts({ projectKey, stage }: { projectKey: string; stage: Stage }) {
  const { t } = useI18n();
  return (
    <div>
      <p className="mb-1.5 text-[12px] font-medium text-muted-foreground">{t("run.artifacts")}</p>
      <div className="flex flex-wrap gap-2">
        {stage.artifacts.map((a) =>
          a.contentType.startsWith("image/") ? (
            <a key={a.code} href={`/api/projects/${projectKey}/artifacts/${a.code}`} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border">
              <img src={`/api/projects/${projectKey}/artifacts/${a.code}`} alt={`${a.kind} ${a.code}`} className="h-24 w-auto" loading="lazy" />
            </a>
          ) : (
            <a key={a.code} href={`/api/projects/${projectKey}/artifacts/${a.code}`} target="_blank" rel="noreferrer" className="rounded-md border px-2 py-1 font-mono text-[11.5px] hover:bg-accent">{a.kind} · {a.code}</a>
          ),
        )}
      </div>
    </div>
  );
}

/** One stage of a run: its result, and on open the tests, findings, artifacts and output tail. */
export function RunStageRow({ projectKey, stage }: { projectKey: string; stage: Stage }) {
  const { t } = useI18n();
  const failed = stage.results.filter((r) => r.status === "failed" || r.status === "error").length;
  return (
    <details className="group min-w-0" open={stage.status !== "passed"}>
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 hover:bg-accent/40">
        <ChevronRight className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
        <span className="font-medium">{stage.stage}</span>
        {stage.condition && <Badge tone="info">{stage.condition}</Badge>}
        {stage.manual && <Badge>{t("run.manual")}</Badge>}
        <span className="ml-auto text-[12px] text-muted-foreground">{stage.results.length > 0 && t("run.results", { passed: stage.results.length - failed, failed })}</span>
        <span className="tabular w-16 text-right text-[12px] text-muted-foreground">{formatDuration(stage.durationMs)}</span>
        <RunBadge status={stage.status} />
      </summary>
      <div className="grid min-w-0 gap-3 px-5 pb-4 sm:pl-12">
        {stage.command && <p className="font-mono text-[12px] text-muted-foreground">$ {stage.command}{stage.exitCode !== null ? `  → exit ${stage.exitCode}` : ""}</p>}
        {stage.reference && <p className="text-[12.5px]">{t("run.reference")}: <span className="font-mono">{stage.reference}</span></p>}
        {stage.results.length > 0 && <Results stage={stage} />}
        {stage.findings.length > 0 && <Findings stage={stage} />}
        {stage.artifacts.length > 0 && <Artifacts projectKey={projectKey} stage={stage} />}
        {stage.output && (
          <div>
            <p className="mb-1.5 text-[12px] font-medium text-muted-foreground">{t("run.output")}</p>
            <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 font-mono text-[11.5px] leading-relaxed">{stage.output}</pre>
          </div>
        )}
      </div>
    </details>
  );
}
