import type { RequirementStatus } from "@lastro/shared";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { MoverChip } from "@/components/guide/mover-chip";
import { requirementQaQuery } from "@/hooks/run-queries";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { levelLabel } from "@/lib/type-label";
import { PATH, pathIndex, type Mover } from "@/lib/lifecycle";
import { MarkFinalButton } from "./approval-actions";
import { holdsForNextStep, type Hold } from "./requirement-holds";

interface Next {
  who: Mover | null;
  text: string;
  action?: ReactNode;
}

/** Who acts next on the plain path, when nothing in particular holds the requirement. */
function pathMover(status: RequirementStatus): Mover | null {
  if (status === "accepted" || status === "dropped") return null;
  if (status === "reopened" || status === "approved" || status === "building") return "agent";
  return PATH[pathIndex(status) + 1]?.who ?? null;
}

/** The one thing to do now for this requirement, from what actually holds it: the person's action comes with its button. */
function useNext(projectKey: string, code: string, status: RequirementStatus, holds: Hold[]): Next {
  const { t } = useI18n();
  const autonomy = useQuery(requirementQaQuery(projectKey, code)).data?.config.autonomy ?? "auto";
  const held = holdsForNextStep({ code, status, holds });
  const of = (kind: Hold["kind"]) => held.filter((h) => h.kind === kind).map((h) => h.detail);
  const sources = [...new Set(of("source_not_final"))];
  const questions = of("open_question");
  const fields = of("missing_field");
  if ((status === "specified" || status === "captured") && questions.length) {
    return {
      who: "you",
      text: t("life.next.openQuestion", { question: questions.join(", ") }),
      action: (
        <Link to="/projects/$key/requirements/questions" params={{ key: projectKey }} className="text-[13px] font-medium text-primary hover:underline">
          {t("unblock.answer")}
        </Link>
      ),
    };
  }
  if (status === "specified" && sources.length) {
    return { who: "you", text: t("life.next.sourceNotFinal", { source: sources.join(", ") }), action: sources.map((s) => <MarkFinalButton key={s} projectKey={projectKey} source={s} />) };
  }
  const untested = of("criterion_without_test");
  const levels = of("missing_test_level");
  if (status === "specified" && (untested.length || levels.length)) {
    const missing = levels.length ? t("life.next.levels", { levels: levels.map((l) => levelLabel(t, l)).join(", ") }) : "";
    return { who: "agent", text: t(autonomy === "review" ? "life.next.needsTests.review" : "life.next.needsTests", { levels: missing }) };
  }
  if (status === "specified" && held.length === 0) return { who: "you", text: t("life.next.ready") };
  if (status === "captured" && fields.length) return { who: "agent", text: t("life.next.missingFields", { fields: fields.join(", ") }) };
  if (status === "captured" && of("invalid_quote").length) return { who: "agent", text: t("life.next.invalidQuote") };
  return { who: pathMover(status), text: t(`life.next.${status}` as MessageKey) };
}

export function NextAction({ projectKey, code, status, holds }: { projectKey: string; code: string; status: RequirementStatus; holds: Hold[] }) {
  const { t } = useI18n();
  const next = useNext(projectKey, code, status, holds);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="flex shrink-0 items-center gap-2">
        <span className="text-[13px] font-semibold">{t("life.next")}:</span>
        {next.who && <MoverChip who={next.who} />}
      </span>
      <span className="min-w-0 basis-full text-[13px] text-muted-foreground sm:basis-0 sm:flex-1">{next.text}</span>
      {next.action && <span className="flex flex-wrap items-center gap-2">{next.action}</span>}
    </div>
  );
}
