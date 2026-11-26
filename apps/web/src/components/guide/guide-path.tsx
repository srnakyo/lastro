import { CornerUpLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { PATH, type Mover } from "@/lib/lifecycle";
import { cn } from "@/lib/utils";
import { GuideSection } from "./guide-section";
import { MOVER, MoverChip } from "./mover-chip";

const MOVERS: Mover[] = ["you", "agent", "lastro"];

function Legend() {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
      {t("guide.legend")}:
      {MOVERS.map((m) => (
        <MoverChip key={m} who={m} />
      ))}
    </div>
  );
}

/** Desktop: the seven steps on one track, each node coloured by who moves it there, and the reopen loop under it. */
function Track() {
  const { t } = useI18n();
  return (
    <div className="hidden xl:block">
      <ol className="grid grid-cols-7">
        {PATH.map((step, i) => (
          <li key={step.status} className="relative flex flex-col items-center px-2 text-center">
            <div className="relative flex w-full justify-center">
              {i > 0 && <span className="absolute left-0 right-1/2 top-[19px] h-0.5 bg-border" />}
              {i < PATH.length - 1 && <span className="absolute left-1/2 right-0 top-[19px] h-0.5 bg-border" />}
              <span className={cn("tabular relative z-10 flex size-10 items-center justify-center rounded-full border-2 text-[14px] font-bold ring-4 ring-card", MOVER[step.who].node)}>{i + 1}</span>
            </div>
            <p className="mt-3 text-[14px] font-semibold leading-tight">{t(`status.${step.status}`)}</p>
            <p className="mt-1.5 max-w-[22ch] flex-1 text-[12.5px] leading-snug text-muted-foreground">{t(`guide.path.${step.status}` as MessageKey)}</p>
            <MoverChip who={step.who} className="mt-3" />
          </li>
        ))}
      </ol>
      <div className="mt-3 grid grid-cols-7">
        <div className="col-start-4 col-end-7 mx-[calc(100%/6)]">
          <div className="h-5 rounded-b-xl border-2 border-t-0 border-dashed border-destructive/45" />
          <p className="mt-2 text-center text-[12.5px] leading-snug text-muted-foreground">
            <CornerUpLeft className="mr-1 inline size-3.5 align-[-2px] text-destructive" />
            <span className="font-semibold text-destructive">{t("status.reopened")}</span> · {t("guide.path.reopened")}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Phones and tablets: the same steps as a vertical timeline. */
function Timeline() {
  const { t } = useI18n();
  return (
    <ol className="grid xl:hidden">
      {PATH.map((step, i) => (
        <li key={step.status} className="relative flex gap-4 pb-5 last:pb-0">
          {i < PATH.length - 1 && <span className="absolute bottom-0 left-[17px] top-9 w-0.5 bg-border" />}
          <span className={cn("tabular relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-[13px] font-bold", MOVER[step.who].node)}>{i + 1}</span>
          <div className="min-w-0 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[14px] font-semibold">{t(`status.${step.status}`)}</p>
              <MoverChip who={step.who} />
            </div>
            <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{t(`guide.path.${step.status}` as MessageKey)}</p>
          </div>
        </li>
      ))}
      <li className="mt-4 flex items-start gap-2 rounded-lg border border-dashed border-destructive/45 px-3 py-2.5 text-[12.5px] text-muted-foreground">
        <CornerUpLeft className="mt-0.5 size-3.5 shrink-0 text-destructive" />
        <span>
          <span className="font-semibold text-destructive">{t("status.reopened")}</span> · {t("guide.path.reopened")}
        </span>
      </li>
    </ol>
  );
}

export function GuidePath() {
  return (
    <GuideSection id="path" lead="guide.path.lead" aside={<Legend />}>
      <Card className="px-5 py-7 xl:px-6">
        <Track />
        <Timeline />
      </Card>
    </GuideSection>
  );
}
