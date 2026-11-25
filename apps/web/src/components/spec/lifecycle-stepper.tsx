import type { RequirementStatus } from "@lastro/shared";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { MoverChip } from "@/components/guide/mover-chip";
import { Card } from "@/components/ui/card";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { PATH, pathIndex, type Mover } from "@/lib/lifecycle";
import { cn } from "@/lib/utils";

/** Who acts next from each status: the mover of the following step, or the requester's acceptance. */
function nextMover(status: RequirementStatus): Mover | null {
  if (status === "accepted" || status === "dropped") return null;
  if (status === "reopened" || status === "approved") return "agent";
  if (status === "building") return "agent";
  const i = pathIndex(status);
  return PATH[i + 1]?.who ?? null;
}

/** The requirement's place on the main path, what comes next and who does it. */
export function LifecycleStepper({ projectKey, status }: { projectKey: string; status: RequirementStatus }) {
  const { t } = useI18n();
  const current = pathIndex(status);
  const mover = nextMover(status);
  const dropped = status === "dropped";
  return (
    <Card className="min-w-0 p-4">
      <ol className="flex items-center gap-1 overflow-x-auto pb-1" aria-label={t("life.title")}>
        {PATH.map((step, i) => {
          const done = !dropped && i < current;
          const here = !dropped && i === current;
          return (
            <li key={step.status} className="flex min-w-0 shrink-0 items-center gap-1" aria-current={here ? "step" : undefined}>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-medium",
                  here && (status === "reopened" ? "bg-destructive text-white" : "bg-primary text-primary-foreground"),
                  done && "bg-success/12 text-success",
                  !done && !here && "text-muted-foreground",
                )}
              >
                {done && <Check className="size-3.5" />}
                {here && status !== step.status ? t(`status.${status}`) : t(`status.${step.status}`)}
              </span>
              {i < PATH.length - 1 && <span className={cn("h-px w-4 shrink-0", done ? "bg-success/50" : "bg-border")} />}
            </li>
          );
        })}
      </ol>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3 text-[13px]">
        <span className="font-semibold">{t("life.next")}:</span>
        {mover && <MoverChip who={mover} />}
        <span className="text-muted-foreground">{t(`life.next.${status}` as MessageKey)}</span>
        <Link to="/projects/$key/guide" params={{ key: projectKey }} className="ml-auto inline-flex items-center gap-1 text-[12.5px] font-medium text-primary hover:underline">
          {t("nav.guide")} <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </Card>
  );
}
