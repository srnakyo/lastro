import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { overviewQuery } from "@/hooks/queries";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "", label: "spec.tabs.requirements", waiting: "approve" },
  { to: "/packages", label: "spec.tabs.packages" },
  { to: "/decisions", label: "spec.tabs.decisions", waiting: "decisions" },
  { to: "/questions", label: "spec.tabs.questions", waiting: "questions" },
] as const;

/** Second-level navigation of the spec area. */
export function SpecTabs({ projectKey }: { projectKey: string }) {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const base = `/projects/${projectKey}/requirements`;
  const { data: o } = useQuery(overviewQuery(projectKey));
  const waiting = { approve: o?.byStatus.specified ?? 0, decisions: o?.proposedDecisions ?? 0, questions: o?.openQuestions ?? 0 };
  return (
    <nav className="scrollbar-none mb-5 flex gap-1 overflow-x-auto overflow-y-hidden border-b" aria-label={t("nav.requirements")}>
      {TABS.map((tab) => {
        const href = `${base}${tab.to}`;
        const active = tab.to === "" ? pathname === base || /\/requirements\/REQ-/.test(pathname) : pathname === href;
        return (
          <Link
            key={tab.to}
            to={href as never}
            className={cn("-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-[13.5px] font-medium", active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {t(tab.label)}
            {"waiting" in tab && waiting[tab.waiting] > 0 && (
              <span className="tabular ml-1.5 rounded-full bg-warning/15 px-1.5 py-px text-[11px] font-semibold text-warning" title={t("nav.waiting", { n: waiting[tab.waiting] })}>
                {waiting[tab.waiting]}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
