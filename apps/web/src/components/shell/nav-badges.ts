import { useQuery } from "@tanstack/react-query";
import { overviewQuery } from "@/hooks/queries";
import type { NavBadge } from "./nav";

export interface BadgeCount {
  n: number;
  tone: "warning" | "danger";
}

/** Counts shown next to nav items: what waits for a person, and failing tests. Empty until the overview loads. */
export function useNavBadges(projectKey: string | null): Partial<Record<NavBadge, BadgeCount>> {
  const { data: o } = useQuery({ ...overviewQuery(projectKey ?? ""), enabled: Boolean(projectKey) });
  if (!o) return {};
  return {
    spec: { n: o.openQuestions + o.proposedDecisions + (o.byStatus.specified ?? 0), tone: "warning" },
    bugs: { n: o.openIncidents, tone: "warning" },
    tests: { n: o.tests.failed, tone: "danger" },
  };
}
