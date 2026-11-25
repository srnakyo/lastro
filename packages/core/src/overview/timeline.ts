import { db } from "../db";

const day = (d: Date) => d.toISOString().slice(0, 10);

/** One point per day for the last `days` days: runs passed and failed, and requirements that reached verified or went back. */
export async function activityTimeline(projectId: string, days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);
  const [runs, events] = await Promise.all([
    db().run.findMany({ where: { projectId, startedAt: { gte: since } }, select: { startedAt: true, status: true } }),
    db().stateEvent.findMany({ where: { projectId, createdAt: { gte: since }, toStatus: { in: ["verified", "building", "reopened", "approved"] } }, select: { createdAt: true, toStatus: true, fromStatus: true } }),
  ]);
  const points = new Map<string, { day: string; passed: number; failed: number; verified: number; reopened: number; approved: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = day(new Date(Date.now() - i * 86_400_000));
    points.set(d, { day: d, passed: 0, failed: 0, verified: 0, reopened: 0, approved: 0 });
  }
  for (const r of runs) {
    const p = points.get(day(r.startedAt));
    if (p) p[r.status === "passed" ? "passed" : "failed"] += 1;
  }
  for (const e of events) {
    const p = points.get(day(e.createdAt));
    if (!p) continue;
    if (e.toStatus === "verified") p.verified += 1;
    if (e.toStatus === "approved") p.approved += 1;
    if (e.toStatus === "reopened" || (e.toStatus === "building" && e.fromStatus === "verified")) p.reopened += 1;
  }
  return [...points.values()];
}
