import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { RunListItem } from "@/hooks/run-queries";
import { useI18n } from "@/lib/i18n";

/** Stacked test results of the last 20 runs, oldest first. */
export function RunsChart({ runs }: { runs: RunListItem[] }) {
  const { t } = useI18n();
  const data = runs.slice(0, 20).reverse().map((r) => ({ name: r.commit ?? r.id.slice(0, 7), passed: r.tests.passed, failed: r.tests.failed, skipped: r.tests.skipped }));
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{t("runs.chart")}</CardTitle>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{t("runs.chart.hint")}</p>
        </div>
        <div className="flex gap-3 text-[12px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-success" />{t("result.passed")}</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-destructive" />{t("result.failed")}</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-muted-foreground/40" />{t("result.skipped")}</span>
        </div>
      </CardHeader>
      <div className="h-[220px] px-3 pb-3 pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontFamily: "JetBrains Mono Variable" }} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip cursor={{ fill: "hsl(var(--accent))" }} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="passed" name={t("result.passed")} stackId="r" fill="hsl(var(--success))" />
            <Bar dataKey="failed" name={t("result.failed")} stackId="r" fill="hsl(var(--destructive))" />
            <Bar dataKey="skipped" name={t("result.skipped")} stackId="r" fill="hsl(var(--muted-foreground) / 0.4)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
