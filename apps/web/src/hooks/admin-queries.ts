import { queryOptions } from "@tanstack/react-query";
import { getConfig, getTimeline, listAgentSessions, listAudit, listMembers } from "@/fns/admin";
import { getGlossary } from "@/fns/glossary";

export const auditQuery = (key: string, filter: { action?: string; actorType?: "user" | "agent" | "system" }) =>
  queryOptions({ queryKey: ["project", key, "audit", filter], queryFn: () => listAudit({ data: { key, ...filter } }) });
export const agentsQuery = (key: string) => queryOptions({ queryKey: ["project", key, "agents"], queryFn: () => listAgentSessions({ data: { key } }) });
export const timelineQuery = (key: string) => queryOptions({ queryKey: ["project", key, "timeline"], queryFn: () => getTimeline({ data: { key } }) });
export const configQuery = (key: string) => queryOptions({ queryKey: ["project", key, "config"], queryFn: () => getConfig({ data: { key } }) });
export const membersQuery = queryOptions({ queryKey: ["workspace", "members"], queryFn: () => listMembers() });
export const glossaryQuery = (key: string) => queryOptions({ queryKey: ["project", key, "glossary"], queryFn: () => getGlossary({ data: { key } }) });

export type AgentSession = Awaited<ReturnType<typeof listAgentSessions>>[number];
export type AuditItem = Awaited<ReturnType<typeof listAudit>>[number];
