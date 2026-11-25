import { queryOptions } from "@tanstack/react-query";
import type { RequirementStatus } from "@lastro/shared";
import { listDecisions, listPackages, listQuestions } from "@/fns/decisions";
import { getRequirement, listRequirements } from "@/fns/requirements";
import { getSource, listIncidents, listSources } from "@/fns/sources";

export interface RequirementFilter {
  status?: RequirementStatus;
  type?: string;
  pkg?: string;
}

export const requirementsQuery = (key: string, filter: RequirementFilter) =>
  queryOptions({ queryKey: ["project", key, "requirements", filter], queryFn: () => listRequirements({ data: { key, ...filter } }) });
export const requirementQuery = (key: string, code: string) =>
  queryOptions({ queryKey: ["project", key, "requirement", code], queryFn: () => getRequirement({ data: { key, code } }) });
export const packagesQuery = (key: string) => queryOptions({ queryKey: ["project", key, "packages"], queryFn: () => listPackages({ data: { key } }) });
export const decisionsQuery = (key: string) => queryOptions({ queryKey: ["project", key, "decisions"], queryFn: () => listDecisions({ data: { key } }) });
export const questionsQuery = (key: string) => queryOptions({ queryKey: ["project", key, "questions"], queryFn: () => listQuestions({ data: { key } }) });
export const sourcesQuery = (key: string) => queryOptions({ queryKey: ["project", key, "sources"], queryFn: () => listSources({ data: { key } }) });
export const sourceQuery = (key: string, code: string) => queryOptions({ queryKey: ["project", key, "source", code], queryFn: () => getSource({ data: { key, code } }) });
export const incidentsQuery = (key: string) => queryOptions({ queryKey: ["project", key, "incidents"], queryFn: () => listIncidents({ data: { key } }) });
