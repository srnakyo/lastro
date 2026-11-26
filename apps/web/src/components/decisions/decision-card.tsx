import { Link } from "@tanstack/react-router";
import { Copy } from "lucide-react";
import { MoverChip } from "@/components/guide/mover-chip";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { DecisionActions } from "./decision-actions";
import { likelyRepeatOf, type DecisionItem } from "./decision-rules";

function Affects({ projectKey, decision }: { projectKey: string; decision: DecisionItem }) {
  const { t } = useI18n();
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px]">
      <span className="text-muted-foreground">{t("dec.affects")}:</span>
      {decision.requirements.length === 0 ? (
        <span className="text-muted-foreground">{t("dec.affects.none")}</span>
      ) : (
        decision.requirements.map((r) => (
          <Link
            key={r.code}
            to="/projects/$key/requirements/$code"
            params={{ key: projectKey, code: r.code }}
            title={r.title}
            className="inline-flex max-w-[280px] items-center gap-1.5 rounded-md border px-1.5 py-0.5 hover:border-primary/40 hover:bg-accent"
          >
            <span className="shrink-0 whitespace-nowrap font-mono text-[11.5px] text-primary">{r.code}</span>
            <span className="truncate text-muted-foreground">{r.title}</span>
          </Link>
        ))
      )}
    </div>
  );
}

/** One decision waiting for a person: who made it, what it says, why, what it touches and what to do. */
export function DecisionCard({ projectKey, decision, all, selected, onSelect }: { projectKey: string; decision: DecisionItem; all: DecisionItem[]; selected: boolean; onSelect: (code: string) => void }) {
  const { t } = useI18n();
  const repeat = likelyRepeatOf(decision, all);
  return (
    <li id={decision.code} className={cn("scroll-mt-24 rounded-xl border bg-card p-4 transition-colors target:ring-2 target:ring-primary/40", selected && "border-primary/50 bg-primary/[0.03]")}>
      <div className="flex gap-3">
        <input type="checkbox" checked={selected} onChange={() => onSelect(decision.code)} aria-label={t("dec.select", { code: decision.code })} className="mt-1 size-4 shrink-0 cursor-pointer accent-[hsl(var(--primary))]" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <MoverChip who={decision.decidedByAgent ? "agent" : "you"} />
            <Badge>{t(`dec.kind.${decision.kind}`)}</Badge>
            <span className="font-mono text-muted-foreground">{decision.code}</span>
            {repeat && (
              <a href={`#${repeat.code}`} className="inline-flex items-center gap-1 rounded-full bg-warning/12 px-2 py-0.5 font-medium text-warning hover:underline">
                <Copy className="size-3" /> {t("dec.repeat.hint", { code: repeat.code })}
              </a>
            )}
          </div>
          <p className="mt-2 max-w-[100ch] text-[14.5px] font-medium leading-snug">{decision.text}</p>
          {decision.reason && (
            <p className="mt-1.5 max-w-[100ch] text-[13px] leading-snug text-muted-foreground">
              <span className="font-medium text-foreground">{t("dec.why")}:</span> {decision.reason}
            </p>
          )}
          {decision.sourceRef && (
            <p className="mt-1 break-words text-[13px] text-muted-foreground">
              <span className="font-medium text-foreground">{decision.decidedByAgent ? t("dec.source") : t("dec.said")}:</span> {decision.sourceRef}
            </p>
          )}
          <Affects projectKey={projectKey} decision={decision} />
        </div>
      </div>
      <DecisionActions projectKey={projectKey} decision={decision} all={all} suggested={repeat} />
    </li>
  );
}

/** A decided or overturned decision, compact. */
export function DecisionRow({ projectKey, decision }: { projectKey: string; decision: DecisionItem }) {
  const { t } = useI18n();
  return (
    <li id={decision.code} className="grid scroll-mt-24 gap-1 px-5 py-3 target:bg-primary/[0.04]">
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <span className="font-mono text-muted-foreground">{decision.code}</span>
        <Badge tone={decision.status === "overturned" ? "danger" : "success"}>{t(`dec.status.${decision.status}`)}</Badge>
        <span className="text-muted-foreground">{decision.decidedByAgent ? t("dec.row.agent") : t("dec.row.person")}</span>
      </div>
      <p className={cn("text-[13.5px]", decision.status === "overturned" && "text-muted-foreground line-through decoration-muted-foreground/40")}>{decision.text}</p>
      {decision.requirements.length > 0 && (
        <p className="flex flex-wrap gap-2">
          {decision.requirements.map((r) => (
            <Link key={r.code} to="/projects/$key/requirements/$code" params={{ key: projectKey, code: r.code }} title={r.title} className="font-mono text-[11.5px] text-primary hover:underline">
              {r.code}
            </Link>
          ))}
        </p>
      )}
    </li>
  );
}
