import { CircleCheck, CircleX, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { RunBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { GuideSection } from "./guide-section";

const mono = (text: string) => <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11.5px]">{text}</span>;

/** Each word, with what it looks like on the dashboard so it is recognised there. */
function samples(t: (k: MessageKey) => string): Record<string, ReactNode> {
  return {
    gate: (
      <>
        <Badge tone="success"><CircleCheck className="size-3.5" /> {t("qa.gate.pass")}</Badge>
        <Badge tone="danger"><CircleX className="size-3.5" /> {t("qa.gate.fail")}</Badge>
      </>
    ),
    evidence: mono("0a1b2c3 · 25/11 18:53"),
    locked: <Badge tone="info"><Lock className="size-3" /> {t("req.detail.locked")}</Badge>,
    package: mono("PKG-4H2NQ"),
    source: (
      <>
        {mono("SRC-RB97V")}
        <Badge tone="success">v1 · Final</Badge>
      </>
    ),
    run: <RunBadge status="passed" />,
    flaky: <Badge tone="warning">{t("tests.flaky.one")}</Badge>,
    orphan: <Badge tone="warning">{t("tests.orphan.one")}</Badge>,
  };
}

const TERMS = ["gate", "evidence", "locked", "run", "source", "package", "flaky", "orphan"] as const;

export function GuideTerms() {
  const { t } = useI18n();
  const look = samples(t);
  return (
    <GuideSection id="terms">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {TERMS.map((term) => (
          <Card key={term} className="flex flex-col p-4">
            <h3 className="text-[14.5px] font-semibold">{t(`guide.terms.${term}` as MessageKey)}</h3>
            <p className="mt-1 flex-1 text-[12.5px] leading-snug text-muted-foreground">{t(`guide.terms.${term}.body` as MessageKey)}</p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-3">
              <span className="mr-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("guide.terms.looks")}</span>
              {look[term]}
            </div>
          </Card>
        ))}
      </div>
    </GuideSection>
  );
}
