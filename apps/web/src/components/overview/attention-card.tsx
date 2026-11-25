import { CircleHelp, Gavel, Siren } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

export function AttentionCard({ questions, decisions, incidents }: { questions: number; decisions: number; incidents: number }) {
  const { t } = useI18n();
  const rows = [
    { icon: CircleHelp, label: t("overview.attention.questions"), value: questions },
    { icon: Gavel, label: t("overview.attention.decisions"), value: decisions },
    { icon: Siren, label: t("overview.attention.incidents"), value: incidents },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("overview.attention")}</CardTitle>
      </CardHeader>
      <ul className="divide-y">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-3 px-5 py-2.5">
            <r.icon className="size-4 text-muted-foreground" />
            <span className="flex-1 text-[13px]">{r.label}</span>
            <span className={`tabular text-[13px] font-semibold ${r.value > 0 ? "text-warning" : "text-muted-foreground"}`}>{r.value}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
