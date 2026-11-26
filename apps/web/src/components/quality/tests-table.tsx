import { Link } from "@tanstack/react-router";
import { ResultBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import type { TestItem } from "@/hooks/run-queries";
import { formatDateTime, formatDuration } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { HistoryStrip } from "./result-dot";

const average = (values: number[]) => (values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null);

function Covers({ projectKey, covers }: { projectKey: string; covers: string[] }) {
  const { t } = useI18n();
  if (covers.length === 0) return <Badge tone="warning">{t("tests.orphan.one")}</Badge>;
  return (
    <span className="flex flex-wrap gap-1">
      {covers.map((c) => {
        const [code, criterion] = c.split(" ");
        return (
          <Link key={c} to="/projects/$key/requirements/$code" params={{ key: projectKey, code: code ?? "" }} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11.5px] hover:text-primary">
            {code} {criterion}
          </Link>
        );
      })}
    </span>
  );
}

export function TestsTable({ projectKey, tests }: { projectKey: string; tests: TestItem[] }) {
  const { t, lang } = useI18n();
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-[13px]">
        <thead>
          <tr className="border-b text-left text-[11.5px] uppercase tracking-wide text-muted-foreground">
            <th className="px-5 py-2.5 font-medium">{t("tests.col.test")}</th>
            <th className="px-3 py-2.5 font-medium">{t("tests.col.covers")}</th>
            <th className="px-3 py-2.5 font-medium">{t("tests.col.history")}</th>
            <th className="px-3 py-2.5 text-right font-medium">{t("tests.col.duration")}</th>
            <th className="px-5 py-2.5 text-right font-medium">{t("tests.col.last")}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {tests.map((test) => (
            <tr key={test.id} className="align-top hover:bg-accent/40">
              <td className="max-w-[420px] px-5 py-3">
                <p className="font-medium">{test.name}</p>
                <p className="truncate font-mono text-[11.5px] text-muted-foreground">{test.file}</p>
                {test.flaky && <Badge tone="warning" className="mt-1.5">{t("tests.flaky.one")}</Badge>}
              </td>
              <td className="px-3 py-3"><Covers projectKey={projectKey} covers={test.covers} /></td>
              <td className="px-3 py-3">
                <HistoryStrip statuses={[...test.history].reverse().map((h) => ({ status: h.status, title: `${t(`result.${h.status}` as never)} · ${h.runStage.run.commit ?? "—"}${h.runStage.condition ? ` · ${h.runStage.condition}` : ""} · ${formatDateTime(h.runStage.startedAt, lang)}` }))} />
              </td>
              <td className="tabular px-3 py-3 text-right text-muted-foreground">{formatDuration(average(test.history.map((h) => h.durationMs)))}</td>
              <td className="px-5 py-3 text-right">{test.last ? <ResultBadge status={test.last} /> : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
