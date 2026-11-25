import { packageInputSchema, type Actor, type PackageInput } from "@lastro/shared";
import { auditService } from "../audit/service";
import { newCode } from "../codes/generate";
import { db, transaction } from "../db";
import { LastroError, notFound } from "../errors";
import { isPending } from "../lifecycle/transitions";
import { loadScope } from "../scope/project-scope";

export const packagesService = {
  async create(projectId: string, actor: Actor, raw: PackageInput) {
    const input = packageInputSchema.parse(raw);
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      const exists = async (c: string) => !!(await tx.package.findUnique({ where: { projectId_code: { projectId, code: c } } }));
      if (input.code && (await exists(input.code))) throw new LastroError("CONFLICT", `${input.code} already exists`);
      const code = input.code ?? (await newCode("PKG", exists));
      const sources = await tx.source.findMany({ where: { projectId, code: { in: input.sources } }, select: { id: true } });
      const pkg = await tx.package.create({
        data: { projectId, code, title: input.title, report: input.report, sources: { create: sources.map((s) => ({ sourceId: s.id })) } },
      });
      await auditService.record(tx, { workspaceId: scope.workspaceId, projectId, actor, action: "package.create", entity: "package", entityId: code });
      return pkg;
    });
  },

  /** A package closes when nothing in it is pending. */
  async close(projectId: string, actor: Actor, code: string) {
    return transaction(async (tx) => {
      const scope = await loadScope(tx, projectId);
      const pkg = await tx.package.findUnique({ relationLoadStrategy: "join", where: { projectId_code: { projectId, code } }, include: { requirements: { select: { code: true, status: true } } } });
      if (!pkg) throw notFound(`package ${code}`);
      const pending = pkg.requirements.filter((r) => isPending(r.status)).map((r) => r.code);
      if (pending.length > 0) throw new LastroError("BLOCKED", `${code} still has pending requirements`, pending);
      await tx.package.update({ where: { id: pkg.id }, data: { closedAt: new Date() } });
      await auditService.record(tx, { workspaceId: scope.workspaceId, projectId, actor, action: "package.close", entity: "package", entityId: code });
    });
  },

  list(projectId: string) {
    return db().package.findMany({
      where: { projectId },
      orderBy: { openedAt: "asc" },
      include: { sources: { include: { source: { select: { code: true, title: true } } } }, requirements: { select: { code: true, status: true } } },
    });
  },
};
