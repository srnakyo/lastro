import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MessageKey } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n";
import { RichText } from "@/lib/rich-text";

interface Fields {
  statement: string;
  where: string | null;
  who: unknown;
  dataSource: string | null;
  period: string | null;
  whenMissing: string | null;
  reach: unknown;
  examples: unknown;
}

const asText = (v: unknown) => (v === null || v === undefined ? null : typeof v === "string" ? v : JSON.stringify(v));

export function FieldsCard({ requirement, required }: { requirement: Fields; required: string[] }) {
  const { t } = useI18n();
  const rows: [MessageKey, string, string | null][] = [
    ["field.where", "where", requirement.where],
    ["field.who", "who", asText(requirement.who)],
    ["field.dataSource", "data_source", requirement.dataSource],
    ["field.period", "period", requirement.period],
    ["field.whenMissing", "when_missing", requirement.whenMissing],
    ["field.reach", "reach", asText(requirement.reach)],
  ];
  const visible = rows.filter(([, name, value]) => value || required.includes(name));
  const examples = Array.isArray(requirement.examples) ? (requirement.examples as { given: string; expect: string }[]) : [];
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("req.detail.statement")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <p className="max-w-[80ch] text-[14px] leading-relaxed">
          <RichText text={requirement.statement} />
        </p>
        {visible.length > 0 && (
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[max-content_1fr]">
            {visible.map(([label, name, value]) => (
              <div key={name} className="contents">
                <dt className="text-[12.5px] text-muted-foreground">
                  {t(label)}
                  {required.includes(name) && <span className="ml-1 text-warning" title={t("req.detail.required")}>*</span>}
                </dt>
                <dd className={value ? "font-mono text-[12.5px]" : "text-[12.5px] text-destructive"}>{value ?? "—"}</dd>
              </div>
            ))}
          </dl>
        )}
        {examples.length > 0 && (
          <div>
            <p className="mb-2 text-[12.5px] font-medium text-muted-foreground">{t("req.detail.examples")}</p>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[12px] text-muted-foreground">
                  <th className="w-1/2 pb-1.5 font-medium">{t("req.detail.given")}</th>
                  <th className="pb-1.5 font-medium">{t("req.detail.expect")}</th>
                </tr>
              </thead>
              <tbody className="divide-y border-t">
                {examples.map((e, i) => (
                  <tr key={i} className="align-top">
                    <td className="py-2 pr-4"><RichText text={e.given} /></td>
                    <td className="py-2"><RichText text={e.expect} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
