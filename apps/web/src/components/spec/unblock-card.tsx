import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { MoverChip } from "@/components/guide/mover-chip";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import type { Mover } from "@/lib/lifecycle";
import { ApproveManyButton, MarkFinalButton } from "./approval-actions";
import type { UnblockSummary } from "./requirement-holds";

function Line({ who, text, children }: { who: Mover; text: string; children?: ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3">
      <MoverChip who={who} />
      <span className="min-w-0 flex-1 text-[13.5px]">{text}</span>
      {children && <span className="flex flex-wrap items-center gap-2">{children}</span>}
    </li>
  );
}

const linkClass = "text-[13px] font-medium text-primary hover:underline";

/** The few things that unlock the requirements on screen, each with who does it and the action itself. */
export function UnblockCard({ projectKey, summary }: { projectKey: string; summary: UnblockSummary }) {
  const { t } = useI18n();
  const lines: ReactNode[] = [];
  for (const { source, count } of summary.sources) {
    lines.push(
      <Line key={`src-${source}`} who="you" text={t("unblock.sourceNotFinal", { source, n: count })}>
        <Link to="/projects/$key/sources/$code" params={{ key: projectKey, code: source }} className={linkClass}>
          {t("unblock.openSource")}
        </Link>
        <MarkFinalButton projectKey={projectKey} source={source} />
      </Line>,
    );
  }
  if (summary.questions.requirements > 0) {
    lines.push(
      <Line key="questions" who="you" text={t("unblock.questions", { n: summary.questions.codes.length, m: summary.questions.requirements })}>
        <Link to="/projects/$key/requirements/questions" params={{ key: projectKey }} className={linkClass}>
          {t("unblock.answer")}
        </Link>
      </Line>,
    );
  }
  if (summary.ready.length > 0) {
    lines.push(
      <Line key="ready" who="you" text={t("unblock.ready", { n: summary.ready.length })}>
        <ApproveManyButton projectKey={projectKey} codes={summary.ready} label={t("unblock.approveAll", { n: summary.ready.length })} />
      </Line>,
    );
  }
  if (summary.missingFields > 0) lines.push(<Line key="fields" who="agent" text={t("unblock.fields", { n: summary.missingFields })} />);
  if (summary.needsTests > 0) lines.push(<Line key="tests" who="agent" text={t("unblock.tests", { n: summary.needsTests })} />);
  if (summary.invalidQuotes > 0) lines.push(<Line key="quotes" who="agent" text={t("unblock.invalidQuote", { n: summary.invalidQuotes })} />);
  if (summary.noEvidence > 0) lines.push(<Line key="evidence" who="agent" text={t("unblock.evidence", { n: summary.noEvidence })} />);
  if (lines.length === 0) return null;
  return (
    <Card className="mb-5">
      <CardHeader>
        <CardTitle>{t("unblock.title")}</CardTitle>
      </CardHeader>
      <ul className="divide-y">{lines}</ul>
    </Card>
  );
}
