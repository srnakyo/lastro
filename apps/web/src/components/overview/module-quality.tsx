import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/lib/i18n";

export function ModuleQuality({ modules }: { modules: { name: string; requirements: number; backed: number; quality: number }[] }) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("overview.modules")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {modules.map((m) => (
          <div key={m.name}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="truncate text-[13px] font-medium">{m.name}</span>
              <span className="tabular shrink-0 text-[12px] text-muted-foreground">
                {t("overview.modules.backed", { backed: Math.round((m.quality * m.requirements) / 100), total: m.requirements })} · {m.quality}%
              </span>
            </div>
            <Progress value={m.quality} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
