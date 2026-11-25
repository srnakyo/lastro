import { Link } from "@tanstack/react-router";
import { ArrowRight, CircleCheck, CircleDashed, CircleX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip } from "@/components/ui/tooltip";
import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export interface ProjectSummary {
  key: string;
  name: string;
  description: string | null;
  requirements: number;
  pending: number;
  coverage: number;
  tests: { tests: number; passed: number; failed: number; pending: number };
  lastRun: { startedAt: string | Date } | null;
  gate: "passing" | "failing" | "no_runs";
}

const GATE = {
  passing: { icon: CircleCheck, tone: "success" as const },
  failing: { icon: CircleX, tone: "danger" as const },
  no_runs: { icon: CircleDashed, tone: "neutral" as const },
};

export function ProjectCard({ project }: { project: ProjectSummary }) {
  const { t, lang } = useI18n();
  const gate = GATE[project.gate];
  return (
    <Link to="/projects/$key" params={{ key: project.key }} className="group block rounded-xl focus-visible:outline-offset-4">
      <Card className="flex h-full flex-col p-5 transition-[border-color,transform] duration-150 group-hover:-translate-y-0.5 group-hover:border-primary/40">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold tracking-tight">{project.name}</h2>
            <p className="font-mono text-[11.5px] text-muted-foreground">{project.key}</p>
          </div>
          <Tooltip content={t(`gate.help.${project.gate}`)}>
            <span className="shrink-0">
              <Badge tone={gate.tone}>
                <gate.icon className="size-3.5" /> {t(`gate.${project.gate}`)}
              </Badge>
            </span>
          </Tooltip>
        </div>
        {project.description && <p className="mt-2 line-clamp-2 text-[13px] text-muted-foreground">{project.description}</p>}
        {project.requirements === 0 ? (
          <div className="mt-4 flex flex-1 flex-col justify-between gap-3 border-t pt-4">
            <p className="text-[13px] text-muted-foreground">{t("home.start")}</p>
            <span className="inline-flex items-center gap-1 text-[13px] font-medium text-primary">
              {t("home.open")} <ArrowRight className="size-3.5" />
            </span>
          </div>
        ) : (
          <>
          <dl className="mt-4 grid grid-cols-3 gap-3 border-t pt-4">
            <div>
              <dt className="text-[11.5px] text-muted-foreground">{t("home.requirements")}</dt>
              <dd className="tabular text-[18px] font-bold">{project.requirements}</dd>
            </div>
            <div>
              <dt className="text-[11.5px] text-muted-foreground">{t("home.pending")}</dt>
              <dd className="tabular text-[18px] font-bold">{project.pending}</dd>
            </div>
            <div>
              <dt className="text-[11.5px] text-muted-foreground">{t("overview.kpi.failed")}</dt>
              <dd className={`tabular text-[18px] font-bold ${project.tests.failed > 0 ? "text-destructive" : ""}`}>{project.tests.failed}</dd>
            </div>
          </dl>
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-[12px] text-muted-foreground">
              <span>{t("home.coverage")}</span>
              <span className="tabular font-medium text-foreground">{project.coverage}%</span>
            </div>
            <Progress value={project.coverage} />
          </div>
          <p className="mt-4 text-[12px] text-muted-foreground">
            {t("home.lastRun")}: {project.lastRun ? formatDateTime(project.lastRun.startedAt, lang) : t("home.noRuns")}
          </p>
          </>
        )}
      </Card>
    </Link>
  );
}
