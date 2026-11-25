import type { RequirementStatus } from "@lastro/shared";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Bot, ChevronRight, CircleCheck, CircleDashed, CircleX, Hourglass, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tooltip } from "@/components/ui/tooltip";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface NextStepsData {
  requirements: number;
  pending: number;
  byStatus: Partial<Record<RequirementStatus, number>>;
  tests: { tests: number; failed: number; pending: number };
  openQuestions: number;
  proposedDecisions: number;
  openIncidents: number;
}

type Who = "you" | "agent";

interface Step {
  who: Who;
  label: MessageKey;
  n?: number;
  to: string;
  search?: Record<string, string>;
}

/** What waits, in the order it should be done: a person's steps first, since the agent waits on them. */
function stepsOf(o: NextStepsData): Step[] {
  const s = (status: RequirementStatus) => o.byStatus[status] ?? 0;
  const all: Step[] = [
    { who: "you", label: "next.questions", n: o.openQuestions, to: "/requirements/questions" },
    { who: "you", label: "next.decisions", n: o.proposedDecisions, to: "/requirements/decisions" },
    { who: "you", label: "next.approve", n: s("specified"), to: "/requirements", search: { status: "specified" } },
    { who: "you", label: "next.triage", n: o.openIncidents, to: "/bugs" },
    { who: "you", label: "next.accept", n: s("delivered"), to: "/requirements", search: { status: "delivered" } },
    { who: "agent", label: "next.failing", n: o.tests.failed, to: "/tests", search: { filter: "failing" } },
    { who: "agent", label: "next.fields", n: s("captured"), to: "/requirements", search: { status: "captured" } },
    { who: "agent", label: "next.untested", n: o.tests.pending, to: "/tests" },
    { who: "agent", label: "next.build", n: s("approved") + s("building") + s("reopened"), to: "/requirements", search: { status: "building" } },
  ];
  return all.filter((step) => (step.n ?? 0) > 0);
}

const START: Step[] = [
  { who: "you", label: "start.source", to: "/sources" },
  { who: "agent", label: "start.intake", to: "/requirements" },
  { who: "you", label: "start.approve", to: "/requirements" },
  { who: "agent", label: "start.verify", to: "/runs" },
];

function WhoChip({ who }: { who: Who }) {
  const { t } = useI18n();
  const Icon = who === "you" ? User : Bot;
  return (
    <Tooltip content={t(who === "you" ? "next.you.help" : "next.agent.help")}>
      <span className={cn("inline-flex w-[74px] shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold", who === "you" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
        <Icon className="size-3.5" /> {t(who === "you" ? "next.you" : "next.agent")}
      </span>
    </Tooltip>
  );
}

function StepRow({ step, base }: { step: Step; base: string }) {
  const { t } = useI18n();
  return (
    <li>
      <Link to={`${base}${step.to}` as never} search={step.search as never} className="group flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-accent/60">
        <WhoChip who={step.who} />
        <span className="flex-1 text-[13.5px]">{t(step.label)}</span>
        {step.n !== undefined && <span className="tabular min-w-6 rounded-md bg-muted px-1.5 py-0.5 text-center text-[12.5px] font-semibold">{step.n}</span>}
        <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </Link>
    </li>
  );
}

const TONE = {
  neutral: "bg-muted text-muted-foreground",
  danger: "bg-destructive/10 text-destructive",
  warning: "bg-warning/12 text-warning",
  success: "bg-success/12 text-success",
};

interface Verdict {
  tone: keyof typeof TONE;
  icon: typeof CircleCheck;
  title: MessageKey;
  body: MessageKey;
  vars: Record<string, number>;
}

function verdictOf(o: NextStepsData): Verdict {
  if (o.requirements === 0) return { tone: "neutral", icon: CircleDashed, title: "verdict.empty.title", body: "verdict.empty.body", vars: {} };
  if (o.tests.failed > 0) return { tone: "danger", icon: CircleX, title: "verdict.failing.title", body: "verdict.failing.body", vars: { failed: o.tests.failed, tests: o.tests.tests } };
  if (o.pending > 0) return { tone: "warning", icon: Hourglass, title: "verdict.pending.title", body: "verdict.pending.body", vars: { done: o.requirements - o.pending, total: o.requirements } };
  return { tone: "success", icon: CircleCheck, title: "verdict.done.title", body: "verdict.done.body", vars: { total: o.requirements } };
}

/** The top of the overview: one sentence on where the project stands, then what to do now and who does it. */
export function NextSteps({ projectKey, data }: { projectKey: string; data: NextStepsData }) {
  const { t } = useI18n();
  const base = `/projects/${projectKey}`;
  const v = verdictOf(data);
  const steps = data.requirements === 0 ? START : stepsOf(data);
  return (
    <Card className="grid overflow-hidden lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="flex gap-4 border-b p-5 lg:border-b-0 lg:border-r">
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", TONE[v.tone])}>
          <v.icon className="size-[22px]" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[17px] font-bold leading-snug tracking-tight">{t(v.title, v.vars)}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{t(v.body, v.vars)}</p>
          <Link to={`${base}/guide` as never} className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline">
            {t("verdict.guide")} <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
      <div>
        <div className="flex items-baseline justify-between gap-3 border-b px-5 py-3">
          <h2 className="text-[14px] font-semibold tracking-tight">{t("next.title")}</h2>
          <span className="text-[12px] text-muted-foreground">{t("next.lead")}</span>
        </div>
        {steps.length === 0 ? (
          <p className="px-5 py-5 text-[13px] text-success">{t("next.none")}</p>
        ) : (
          <ol className="divide-y" aria-label={t("next.title")}>
            {steps.map((step) => (
              <StepRow key={step.label} step={step} base={base} />
            ))}
          </ol>
        )}
      </div>
    </Card>
  );
}
