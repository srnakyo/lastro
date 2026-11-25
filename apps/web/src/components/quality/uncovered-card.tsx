import { Link } from "@tanstack/react-router";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

interface Uncovered {
  code: string;
  text: string;
  requirement: { code: string; title: string };
}

export function UncoveredCard({ projectKey, criteria }: { projectKey: string; criteria: Uncovered[] }) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("tests.uncovered")}</CardTitle>
        <span className="tabular text-[13px] font-semibold text-muted-foreground">{criteria.length}</span>
      </CardHeader>
      {criteria.length === 0 ? (
        <p className="px-5 py-4 text-[13px] text-muted-foreground">{t("tests.uncovered.none")}</p>
      ) : (
        <ul className="divide-y">
          {criteria.map((c) => (
            <li key={`${c.requirement.code}-${c.code}`} className="px-5 py-3">
              <Link to="/projects/$key/requirements/$code" params={{ key: projectKey, code: c.requirement.code }} className="font-mono text-[12px] text-primary hover:underline">
                {c.requirement.code} · {c.code}
              </Link>
              <p className="mt-0.5 text-[13px]">{c.text}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
