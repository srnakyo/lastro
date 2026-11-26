import { Button } from "@/components/ui/button";
import { confirmDecisions } from "@/fns/decisions";
import { useAction } from "@/hooks/use-action";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { DecisionCard } from "./decision-card";
import type { DecisionItem, WaitingGroup } from "./decision-rules";

const TEXT: Record<WaitingGroup, { title: MessageKey; lead: MessageKey }> = {
  person: { title: "dec.group.person", lead: "dec.group.person.lead" },
  agent: { title: "dec.group.agent", lead: "dec.group.agent.lead" },
  assumption: { title: "dec.group.assumption", lead: "dec.group.assumption.lead" },
};

/** One group of waiting decisions with what the person is asked to do about them. */
export function DecisionGroup({ projectKey, group, items, all, selected, onSelect }: { projectKey: string; group: WaitingGroup; items: DecisionItem[]; all: DecisionItem[]; selected: Set<string>; onSelect: (code: string) => void }) {
  const { t } = useI18n();
  const { run, pending } = useAction(projectKey);
  if (items.length === 0) return null;
  return (
    <section aria-labelledby={`group-${group}`} className="grid gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id={`group-${group}`} className="flex items-center gap-2 text-[15.5px] font-semibold">
            {t(TEXT[group].title)}
            <span className="tabular rounded-full bg-warning/15 px-2 py-px text-[12px] font-semibold text-warning">{items.length}</span>
          </h2>
          <p className="mt-0.5 max-w-[90ch] text-[13px] text-muted-foreground">{t(TEXT[group].lead)}</p>
        </div>
        {group === "person" && items.length > 1 && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => void run(() => confirmDecisions({ data: { key: projectKey, codes: items.map((d) => d.code) } }), t("action.done"))}>
            {t("dec.group.confirmAll", { n: items.length })}
          </Button>
        )}
      </div>
      <ul className="grid gap-3">
        {items.map((d) => (
          <DecisionCard key={d.code} projectKey={projectKey} decision={d} all={all} selected={selected.has(d.code)} onSelect={onSelect} />
        ))}
      </ul>
    </section>
  );
}
