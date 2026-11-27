import { ArrowRight, Bot, Inbox, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useI18n, type MessageKey } from "@/lib/i18n";
import type { Mover } from "@/lib/lifecycle";
import { cn } from "@/lib/utils";
import { GuideConnect } from "./guide-connect";
import { GuideMap } from "./guide-map";
import { GuidePath } from "./guide-path";
import { GuideProofs } from "./guide-proofs";
import { GuideRoles } from "./guide-roles";
import { GUIDE_SECTIONS } from "./guide-section";
import { GuideTerms } from "./guide-terms";
import { MOVER } from "./mover-chip";

const FLOW: { who: Mover; icon: typeof Inbox; title: MessageKey; body: MessageKey }[] = [
  { who: "you", icon: Inbox, title: "guide.flow.ask", body: "guide.flow.ask.body" },
  { who: "agent", icon: Bot, title: "guide.flow.build", body: "guide.flow.build.body" },
  { who: "lastro", icon: ShieldCheck, title: "guide.flow.check", body: "guide.flow.check.body" },
];

/** Lastro in one line of three steps: the request comes in, the agent builds, Lastro checks. */
function Flow() {
  const { t } = useI18n();
  return (
    <ol className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-stretch">
      {FLOW.map((step, i) => (
        <li key={step.title} className="contents">
          <Card className="flex gap-3.5 p-4">
            <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", MOVER[step.who].chip)}>
              <step.icon className="size-5" />
            </span>
            <div>
              <p className="text-[14.5px] font-semibold">{t(step.title)}</p>
              <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{t(step.body)}</p>
            </div>
          </Card>
          {i < FLOW.length - 1 && (
            <span className="hidden items-center justify-center text-muted-foreground lg:flex" aria-hidden="true">
              <ArrowRight className="size-5" />
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

function Contents() {
  const { t } = useI18n();
  return (
    <nav aria-label={t("guide.toc")} className="sticky top-20 hidden self-start 2xl:block">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t("guide.toc")}</p>
      <ol className="grid gap-0.5 border-l">
        {GUIDE_SECTIONS.map((s, i) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className="-ml-px flex gap-2 border-l border-transparent py-1.5 pl-3 text-[13px] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground">
              <span className="tabular w-3 text-[12px]">{i + 1}</span> {t(s.title)}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** How Lastro works, in plain words: the path, the four proofs, who does what, the words and where things are. */
export function GuidePage({ projectKey }: { projectKey?: string }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-10 pb-12 2xl:grid-cols-[minmax(0,1fr)_200px]">
      <div className="grid min-w-0 gap-9">
        <header>
          <h1 className="text-[26px] font-bold leading-tight tracking-tight">{t("guide.title")}</h1>
          <p className="mt-2 max-w-[80ch] text-[14.5px] leading-relaxed text-muted-foreground">{t("guide.lead")}</p>
          <div className="mt-6">
            <Flow />
          </div>
        </header>
        <GuidePath />
        <GuideProofs />
        <GuideRoles />
        <GuideConnect projectKey={projectKey} />
        <GuideTerms />
        <GuideMap projectKey={projectKey} />
      </div>
      <Contents />
    </div>
  );
}
