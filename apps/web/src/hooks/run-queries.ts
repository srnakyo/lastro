import { queryOptions } from "@tanstack/react-query";
import { getDiagrams, getRequirementQa, getRun, listRuns, listTests } from "@/fns/runs";

export const runsQuery = (key: string) => queryOptions({ queryKey: ["project", key, "runs"], queryFn: () => listRuns({ data: { key } }) });
export const runQuery = (key: string, id: string) => queryOptions({ queryKey: ["project", key, "run", id], queryFn: () => getRun({ data: { key, id } }) });
export const testsQuery = (key: string) => queryOptions({ queryKey: ["project", key, "tests"], queryFn: () => listTests({ data: { key } }) });

export type RunListItem = Awaited<ReturnType<typeof listRuns>>[number];
export type RunDetail = Awaited<ReturnType<typeof getRun>>;
export type TestItem = Awaited<ReturnType<typeof listTests>>["tests"][number];

export const requirementQaQuery = (key: string, code: string) => queryOptions({ queryKey: ["project", key, "requirement", code, "qa"], queryFn: () => getRequirementQa({ data: { key, code } }) });
export const diagramsQuery = (key: string) => queryOptions({ queryKey: ["project", key, "diagrams"], queryFn: () => getDiagrams({ data: { key } }) });
export type RequirementQa = Awaited<ReturnType<typeof getRequirementQa>>;
