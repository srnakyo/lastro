import type { ProjectConfig } from "@lastro/shared";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { levelLabel, orderedLevels } from "@/lib/type-label";
import { cn } from "@/lib/utils";
import type { Action, Draft } from "./draft";

const MODES: { value: ProjectConfig["autonomy"]; title: MessageKey; body: MessageKey }[] = [
  { value: "auto", title: "qrules.auto", body: "qrules.auto.body" },
  { value: "review", title: "qrules.review", body: "qrules.review.body" },
];

/** Autonomy and the project-wide test rules: red first, the requester's numbers, the coverage report. */
export function TestRulesCard({ draft, dispatch }: { draft: Draft; dispatch: (a: Action) => void }) {
  const { t } = useI18n();
  const check = (label: string, on: boolean, change: (v: boolean) => void) => (
    <label className="flex items-start gap-2.5 text-[13px]">
      <input type="checkbox" checked={on} onChange={(e) => change(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[hsl(var(--primary))]" />
      {label}
    </label>
  );
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div>
          <CardTitle>{t("qrules.title")}</CardTitle>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">{t("qrules.lead")}</p>
        </div>
      </CardHeader>
      <div className="grid gap-5 px-5 py-4">
        <div role="radiogroup" aria-label={t("qrules.title")} className="grid gap-3 md:grid-cols-2">
          {MODES.map((m) => {
            const on = draft.autonomy === m.value;
            return (
              <button key={m.value} type="button" role="radio" aria-checked={on} onClick={() => dispatch({ type: "autonomy.set", value: m.value })} className={cn("rounded-xl border p-4 text-left transition-colors", on ? "border-primary bg-primary/[0.06] ring-1 ring-primary/30" : "hover:bg-accent/60")}>
                <span className="flex items-center gap-2 text-[14px] font-semibold">
                  <span className={cn("size-3.5 rounded-full border-2", on ? "border-primary bg-primary" : "border-muted-foreground/40")} />
                  {t(m.title)}
                </span>
                <span className="mt-1.5 block text-[12.5px] leading-snug text-muted-foreground">{t(m.body)}</span>
              </button>
            );
          })}
        </div>
        <div className="grid gap-3">
          {check(t("qrules.redFirst"), draft.tests.red_first, (v) => dispatch({ type: "tests.set", value: { red_first: v } }))}
          {check(t("qrules.examples"), draft.tests.examples_in_tests, (v) => dispatch({ type: "tests.set", value: { examples_in_tests: v } }))}
        </div>
        <label className="grid max-w-xl gap-1.5 text-[13px] font-medium">
          {t("qrules.coverageReport")}
          <Input value={draft.tests.coverage_report ?? ""} onChange={(e) => dispatch({ type: "tests.set", value: { coverage_report: e.target.value } })} placeholder="coverage/lcov.info" className="h-8 font-mono text-[12px]" />
          <span className="text-[12px] font-normal text-muted-foreground">{t("qrules.coverageReport.help")}</span>
        </label>
        <div>
          <p className="mb-1.5 text-[12px] font-medium text-muted-foreground">{t("qrules.levels")}</p>
          <ul className="grid gap-1.5 sm:grid-cols-3">
            {orderedLevels(Object.keys(draft.base.tests.levels)).map((level) => [level, draft.base.tests.levels[level] ?? []] as const).map(([level, patterns]) => (
              <li key={level} className="rounded-lg border px-3 py-2">
                <p className="text-[13px] font-semibold">{levelLabel(t, level)}</p>
                <p className="mt-0.5 break-words font-mono text-[11.5px] text-muted-foreground">{patterns.join("  ")}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
