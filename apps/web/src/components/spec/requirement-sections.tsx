import { values } from "@lastro/docs";
import type { Blocker } from "@lastro/shared";
import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { MoverChip } from "@/components/guide/mover-chip";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { RichText } from "@/lib/rich-text";

export function BlockersList({ blockers }: { blockers: Blocker[] }) {
  const { t } = useI18n();
  const groups = new Map<string, Blocker[]>();
  for (const b of blockers) groups.set(b.kind, [...(groups.get(b.kind) ?? []), b]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("req.detail.whatHolds")}</CardTitle>
      </CardHeader>
      {blockers.length === 0 ? (
        <p className="px-5 py-4 text-[13px] text-success">{t("req.detail.nothingHolds")}</p>
      ) : (
        <ul className="divide-y">
          {[...groups.entries()].map(([kind, list]) => (
            <li key={kind} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5">
              <span className="text-[13px] font-medium">{t(`blocker.${kind}` as never)}</span>
              <span className="font-mono text-[11.5px] text-muted-foreground">{list.map((b) => b.detail).filter(Boolean).join(", ")}</span>
              <span className="ml-auto text-[12px] text-muted-foreground">{t("req.detail.blocks", { step: t(`step.${list[0]?.blocks ?? "verified"}`) })}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function CriteriaList({ criteria }: { criteria: { code: string; text: string; lockedHash: string | null; tests: { testRef: string }[] }[] }) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("req.detail.criteria")}</CardTitle>
      </CardHeader>
      <ol className="divide-y">
        {criteria.map((c) => (
          <li key={c.code} className="grid gap-1.5 px-5 py-3.5 md:grid-cols-[64px_1fr]">
            <span className="font-mono text-[12px] text-muted-foreground">{c.code}</span>
            <div>
              <p className="max-w-[80ch] leading-relaxed">
                <RichText text={c.text} />
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {c.lockedHash && (
                  <Badge tone="primary">
                    <Lock className="size-3" /> {t("req.detail.locked")}
                  </Badge>
                )}
                {c.tests.length === 0 ? <Badge tone="danger">{t("req.detail.noTest")}</Badge> : c.tests.map((test) => <code key={test.testRef} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11.5px]">{test.testRef}</code>)}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function RelatedList({ projectKey, decisions, questions }: { projectKey: string; decisions: { decision: { code: string; text: string; status: string; decidedByAgent?: boolean } }[]; questions: { question: { code: string; text: string; answer: string | null; blocks: boolean } }[] }) {
  const { t } = useI18n();
  const empty = decisions.length === 0 && questions.length === 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("req.detail.related")}</CardTitle>
      </CardHeader>
      {empty ? (
        <p className="px-5 py-4 text-[13px] text-muted-foreground">{t("req.detail.noRelated")}</p>
      ) : (
        <ul className="divide-y text-[13px]">
          {decisions.map(({ decision: d }) => (
            <li key={d.code} className="px-5 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Link to="/projects/$key/requirements/decisions" params={{ key: projectKey }} hash={d.code} className="font-mono text-[11.5px] text-muted-foreground hover:text-primary">
                  {d.code}
                </Link>
                {d.decidedByAgent !== undefined && <MoverChip who={d.decidedByAgent ? "agent" : "you"} />}
                <Badge tone={d.status === "confirmed" ? "success" : d.status === "overturned" ? "danger" : "warning"}>
                  {d.status === "proposed" ? t("dec.view.waiting") : t(`dec.status.${d.status}` as never)}
                </Badge>
                {d.status === "proposed" && (
                  <Link to="/projects/$key/requirements/decisions" params={{ key: projectKey }} hash={d.code} className="ml-auto text-[12.5px] font-medium text-primary hover:underline">
                    {t("dec.decide")} →
                  </Link>
                )}
              </div>
              <p className="mt-1">{d.text}</p>
            </li>
          ))}
          {questions.map(({ question: q }) => (
            <li key={q.code} className="px-5 py-3">
              <span className="font-mono text-[11.5px] text-muted-foreground">{q.code}</span>
              <Badge className="ml-2" tone={q.answer ? "success" : q.blocks ? "danger" : "warning"}>
                {q.answer ? t("q.answered") : q.blocks ? t("q.blocking") : t("q.open")}
              </Badge>
              <p className="mt-1">{q.text}</p>
              {q.answer && <p className="mt-1 text-success">{q.answer}</p>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function HistoryList({ history }: { history: { id: string; fromStatus: string | null; toStatus: string; reason: string | null; actorType: string; createdAt: string | Date }[] }) {
  const { t, lang } = useI18n();
  const words = values(lang);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("req.detail.history")}</CardTitle>
      </CardHeader>
      <ol className="divide-y text-[13px]">
        {history.map((h) => (
          <li key={h.id} className="flex flex-wrap items-baseline gap-x-3 px-5 py-2.5">
            <span className="tabular font-mono text-[11.5px] text-muted-foreground">{formatDateTime(h.createdAt, lang)}</span>
            <span>
              {h.fromStatus ? `${t(`status.${h.fromStatus}` as never)} → ` : ""}
              <span className="font-medium">{t(`status.${h.toStatus}` as never)}</span>
            </span>
            <span className="text-[12px] text-muted-foreground">
              {t(`actor.${h.actorType}` as MessageKey)}
              {h.reason ? ` · ${words.reason(h.reason)}` : ""}
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
