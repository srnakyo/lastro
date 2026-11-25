import { useQuery } from "@tanstack/react-query";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { timelineQuery } from "@/hooks/admin-queries";
import { useI18n } from "@/lib/i18n";

/** Runs per day (stacked) and requirements reaching verified or going back, over the last 30 days. */
export function ActivityCard({ projectKey }: { projectKey: string }) {
  const { t, lang } = useI18n();
  const { data = [] } = useQuery(timelineQuery(projectKey));
  const points = data.map((p) => ({ ...p, label: new Date(`${p.day}T00:00:00Z`).toLocaleDateString(lang, { day: "2-digit", month: "2-digit", timeZone: "UTC" }) }));
  const legend: [string, string][] = [["bg-success", t("timeline.runsPassed")], ["bg-destructive", t("timeline.runsFailed")], ["bg-primary", t("timeline.verified")], ["bg-warning", t("timeline.reopened")]];
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{t("timeline.title")}</CardTitle>
        <div className="flex flex-wrap gap-3 text-[12px] text-muted-foreground">
          {legend.map(([c, l]) => <span key={l} className="flex items-center gap-1.5"><span className={`size-2.5 rounded-sm ${c}`} />{l}</span>)}
        </div>
      </CardHeader>
      <div className="h-[220px] px-3 pb-3 pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} interval={4} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={24} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip cursor={{ fill: "hsl(var(--accent))" }} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="passed" name={t("timeline.runsPassed")} stackId="runs" fill="hsl(var(--success))" />
            <Bar dataKey="failed" name={t("timeline.runsFailed")} stackId="runs" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} />
            <Line dataKey="verified" name={t("timeline.verified")} stroke="hsl(var(--primary))" strokeWidth={2} dot={false} type="monotone" />
            <Line dataKey="reopened" name={t("timeline.reopened")} stroke="hsl(var(--warning))" strokeWidth={2} dot={false} type="monotone" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
