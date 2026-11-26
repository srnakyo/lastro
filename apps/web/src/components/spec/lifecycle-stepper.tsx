import type { RequirementStatus } from "@lastro/shared";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { PATH, pathIndex } from "@/lib/lifecycle";
import { cn } from "@/lib/utils";
import { NextAction } from "./next-action";
import type { Hold } from "./requirement-holds";

/** The requirement's place on the main path, what comes next and who does it. */
export function LifecycleStepper({ projectKey, code, status, holds }: { projectKey: string; code: string; status: RequirementStatus; holds: Hold[] }) {
  const { t } = useI18n();
  const current = pathIndex(status);
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
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3">
        <div className="min-w-0 basis-full md:basis-0 md:flex-1">
          <NextAction projectKey={projectKey} code={code} status={status} holds={holds} />
        </div>
        <Link to="/projects/$key/guide" params={{ key: projectKey }} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-primary hover:underline">
          {t("nav.guide")} <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </Card>
  );
}
