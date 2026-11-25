import { queryOptions } from "@tanstack/react-query";
import { getProject, getProjectOverview, listProjects } from "@/fns/projects";
import { getViewer } from "@/fns/session";

export const keys = {
  viewer: ["viewer"] as const,
  projects: ["projects"] as const,
  project: (key: string) => ["project", key] as const,
  overview: (key: string) => ["project", key, "overview"] as const,
};

export const viewerQuery = queryOptions({ queryKey: keys.viewer, queryFn: () => getViewer() });
export const projectsQuery = queryOptions({ queryKey: keys.projects, queryFn: () => listProjects() });
export const projectQuery = (key: string) => queryOptions({ queryKey: keys.project(key), queryFn: () => getProject({ data: { key } }) });
export const overviewQuery = (key: string) => queryOptions({ queryKey: keys.overview(key), queryFn: () => getProjectOverview({ data: { key } }) });
