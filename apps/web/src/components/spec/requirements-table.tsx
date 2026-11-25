import type { BlockerKind, Hallmark, RequirementStatus } from "@lastro/shared";
import { Link } from "@tanstack/react-router";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { RichText } from "@/lib/rich-text";
import { HallmarkDots } from "./hallmark";

export interface RequirementRow {
  code: string;
  title: string;
  type: string;
  status: RequirementStatus;
  package: { code: string; title: string } | null;
  hallmark: Hallmark;
  blockers: BlockerKind[];
  criteria: number;
  tested: number;
}

export function RequirementsTable({ projectKey, rows }: { projectKey: string; rows: RequirementRow[] }) {
  const { t } = useI18n();
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-[13px]">
        <thead>
          <tr className="border-b text-left text-[12px] text-muted-foreground">
            <th className="px-5 py-2.5 font-medium">{t("req.col.requirement")}</th>
            <th className="px-3 py-2.5 font-medium">{t("req.col.type")}</th>
            <th className="px-3 py-2.5 font-medium">{t("req.col.status")}</th>
            <th className="px-3 py-2.5 font-medium">{t("req.col.backing")}</th>
            <th className="px-3 py-2.5 text-right font-medium">{t("req.col.criteria")}</th>
            <th className="px-5 py-2.5 font-medium">{t("req.col.holding")}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.code} className="align-top hover:bg-accent/40">
              <td className="px-5 py-3">
                <Link to="/projects/$key/requirements/$code" params={{ key: projectKey, code: r.code }} className="group block">
                  <span className="font-mono text-[11.5px] text-muted-foreground">{r.code}</span>
                  <span className="block font-medium group-hover:text-primary">
                    <RichText text={r.title} />
                  </span>
                  {r.package && <span className="text-[12px] text-muted-foreground">{r.package.title}</span>}
                </Link>
              </td>
              <td className="px-3 py-3 font-mono text-[12px] text-muted-foreground">{r.type}</td>
              <td className="px-3 py-3">
                <StatusBadge status={r.status} />
              </td>
              <td className="px-3 py-3 pt-4">
                <HallmarkDots hallmark={r.hallmark} />
              </td>
              <td className="tabular px-3 py-3 text-right">
                {r.tested}/{r.criteria}
              </td>
              <td className="px-5 py-3 text-[12px] text-muted-foreground">{r.blockers.map((b) => t(`blocker.${b}`)).join(" · ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
