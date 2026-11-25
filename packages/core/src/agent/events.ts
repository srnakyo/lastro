import type { Prisma } from "@lastro/database";
import { db } from "../db";

/** Records what an agent did in a session: tool calls, submits, blocked stops, pauses. */
export const agentEventsService = {
  async record(projectId: string, session: { agent: string; externalId: string }, kind: string, payload: Prisma.InputJsonValue = {}) {
    const saved = await db().agentSession.upsert({
      where: { projectId_externalId: { projectId, externalId: session.externalId } },
      create: { projectId, agent: session.agent, externalId: session.externalId },
      update: {},
    });
    await db().agentEvent.create({ data: { sessionId: saved.id, kind, payload } });
  },

  sessions(projectId: string, take = 30) {
    return db().agentSession.findMany({
      where: { projectId },
      orderBy: { startedAt: "desc" },
      take,
      include: { events: { orderBy: { createdAt: "asc" } } },
    });
  },
};
