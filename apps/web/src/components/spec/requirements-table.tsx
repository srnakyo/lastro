import type { BlockerKind, Hallmark, RequirementStatus } from "@lastro/shared";
import { Link } from "@tanstack/react-router";
import { TitleWithHelp } from "@/components/help-hint";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { RichText } from "@/lib/rich-text";
import { typeLabel } from "@/lib/type-label";
import { HallmarkDots } from "./hallmark";
import { holdsForNextStep, type Hold } from "./requirement-holds";

export interface RequirementRow {
  code: string;
  title: string;
  type: string;
  status: RequirementStatus;
  package: { code: string; title: string } | null;
  hallmark: Hallmark;
  blockers: BlockerKind[];
  holds: Hold[];
  criteria: number;
  tested: number;
}

interface Group {
  key: string;
  title: string;
  rows: RequirementRow[];
}

const DONE: RequirementStatus[] = ["verified", "previewed", "delivered", "accepted"];

/** Requirements grouped by package, in the order the packages first appear. */
function groupByPackage(rows: RequirementRow[], none: string): Group[] {
  const groups = new Map<string, Group>();
  for (const r of rows) {
    const key = r.package?.code ?? "";
    const group = groups.get(key) ?? { key, title: r.package ? `${r.package.code} · ${r.package.title}` : none, rows: [] };
    group.rows.push(r);
    groups.set(key, group);
  }
  return [...groups.values()];
}

function HoldChips({ row }: { row: RequirementRow }) {
  const { t } = useI18n();
  const holds = holdsForNextStep(row);
  const kinds = [...new Map(holds.map((h) => [h.kind, holds.filter((x) => x.kind === h.kind)])).entries()];
  return (
    <span className="flex flex-wrap gap-1">
      {kinds.map(([kind, items]) => (
        <Tooltip key={kind} content={`${t(`blocker.${kind}`)}${items.some((i) => i.detail) ? `: ${items.map((i) => i.detail).filter(Boolean).join(", ")}` : ""}`}>
          <span className="cursor-default whitespace-nowrap rounded-full bg-warning/12 px-2 py-0.5 text-[11.5px] font-medium text-warning">{t(`blocker.short.${kind}` as MessageKey)}</span>
        </Tooltip>
      ))}
    </span>
  );
}

function Row({ projectKey, row, selected, onSelect }: { projectKey: string; row: RequirementRow; selected: boolean; onSelect: (code: string) => void }) {
  const { t } = useI18n();
  return (
    <tr className="align-top hover:bg-accent/40">
      <td className="w-10 py-3 pl-5">
        {row.status === "specified" && <input type="checkbox" checked={selected} onChange={() => onSelect(row.code)} aria-label={t("req.select", { code: row.code })} className="mt-0.5 size-4 cursor-pointer accent-[hsl(var(--primary))]" />}
      </td>
      <td className="px-3 py-3">
        <Link to="/projects/$key/requirements/$code" params={{ key: projectKey, code: row.code }} className="group block">
          <span className="font-mono text-[11.5px] text-muted-foreground">{row.code}</span>
          <span className="block font-medium group-hover:text-primary">
            <RichText text={row.title} />
          </span>
        </Link>
      </td>
      <td className="px-3 py-3 text-[12.5px] text-muted-foreground">{typeLabel(t, row.type)}</td>
      <td className="px-3 py-3">
        <StatusBadge status={row.status} />
      </td>
      <td className="px-3 py-3 pt-4">
        <HallmarkDots hallmark={row.hallmark} />
      </td>
      <td className="tabular px-3 py-3 text-right">
        {row.tested}/{row.criteria}
      </td>
      <td className="px-5 py-3">
        <HoldChips row={row} />
      </td>
    </tr>
  );
}

function GroupHeader({ group, selected, onSelectMany }: { group: Group; selected: Set<string>; onSelectMany: (codes: string[], on: boolean) => void }) {
  const { t } = useI18n();
  const done = group.rows.filter((r) => DONE.includes(r.status)).length;
  const approvable = group.rows.filter((r) => r.status === "specified").map((r) => r.code);
  const all = approvable.length > 0 && approvable.every((c) => selected.has(c));
  return (
    <tr className="bg-muted/50">
      <td className="w-10 py-2 pl-5">
        {approvable.length > 0 && <input type="checkbox" checked={all} onChange={() => onSelectMany(approvable, !all)} aria-label={t("req.selectGroup")} title={t("req.selectGroup")} className="size-4 cursor-pointer accent-[hsl(var(--primary))]" />}
      </td>
      <td colSpan={6} className="px-3 py-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[13px] font-semibold">{group.title}</span>
          <span className="tabular text-[12px] text-muted-foreground">{t("req.group.verified", { done, total: group.rows.length })}</span>
          <span className="h-1.5 w-24 overflow-hidden rounded-full bg-background">
            <span className="block h-full rounded-full bg-success" style={{ width: `${(done / group.rows.length) * 100}%` }} />
          </span>
        </div>
      </td>
    </tr>
  );
}

export function RequirementsTable({ projectKey, rows, selected, onSelect, onSelectMany }: { projectKey: string; rows: RequirementRow[]; selected: Set<string>; onSelect: (code: string) => void; onSelectMany: (codes: string[], on: boolean) => void }) {
  const { t } = useI18n();
  const groups = groupByPackage(rows, t("req.group.none"));
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-[13px]">
        <thead>
          <tr className="border-b text-left text-[12px] text-muted-foreground">
            <th className="w-10 pl-5" />
            <th className="px-3 py-2.5 font-medium">{t("req.col.requirement")}</th>
            <th className="px-3 py-2.5 font-medium">{t("req.col.type")}</th>
            <th className="px-3 py-2.5 font-medium">{t("req.col.status")}</th>
            <th className="px-3 py-2.5 font-medium">
              <TitleWithHelp title={t("req.col.backing")} help={t("req.col.backing.help")} />
            </th>
            <th className="px-3 py-2.5 text-right font-medium">{t("req.col.criteria")}</th>
            <th className="px-5 py-2.5 font-medium">{t("req.col.holding")}</th>
          </tr>
        </thead>
        {groups.map((g) => (
          <tbody key={g.key} className="divide-y border-b last:border-b-0">
            {groups.length > 1 || g.key ? <GroupHeader group={g} selected={selected} onSelectMany={onSelectMany} /> : null}
            {g.rows.map((r) => (
              <Row key={r.code} projectKey={projectKey} row={r} selected={selected.has(r.code)} onSelect={onSelect} />
            ))}
          </tbody>
        ))}
      </table>
    </Card>
  );
}
