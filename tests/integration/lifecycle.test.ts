import { beforeEach, describe, expect, it } from "bun:test";
import { criteriaService, lifecycleService, requirementsService, sourcesService } from "@lastro/core";
import { resetDatabase } from "../helpers/db";
import { agent, createBriefSource, createProject, discountRequirement } from "../helpers/fixtures";

beforeEach(resetDatabase);

async function specified(requireFinal = true) {
  const ctx = await createProject({ requireFinal });
  const source = await createBriefSource(ctx.project.id, ctx.actor);
  const req = await requirementsService.create(ctx.project.id, ctx.actor, discountRequirement(source.code));
  return { ...ctx, source, code: req.code };
}

describe("approval", () => {
  it("is refused while the source is a draft, and allowed once a person marks it final", async () => {
    const { project, actor, source, code } = await specified();
    await expect(lifecycleService.approve(project.id, actor, code)).rejects.toThrow("cannot be approved yet");
    await sourcesService.markFinal(project.id, actor, source.code);
    await lifecycleService.approve(project.id, actor, code);
    const view = await requirementsService.get(project.id, code);
    expect(view.status).toBe("approved");
    expect(view.criteria.every((c) => c.lockedHash?.startsWith("sha256:"))).toBe(true);
  });

  it("is a human command: agents can neither approve nor mark sources final", async () => {
    const { project, source, code } = await specified();
    await expect(sourcesService.markFinal(project.id, agent, source.code)).rejects.toThrow("needs a person");
    await expect(lifecycleService.approve(project.id, agent, code)).rejects.toThrow("needs a person");
  });
});

describe("locks", () => {
  it("refuses linking tests to locked criteria until a person unlocks, which needs a new approval", async () => {
    const { project, actor, source, code } = await specified();
    await sourcesService.markFinal(project.id, actor, source.code);
    await lifecycleService.approve(project.id, actor, code);
    await lifecycleService.start(project.id, agent, code, "feat/discount");
    await expect(criteriaService.linkTest(project.id, agent, code, "AC-1", "unit/discount.test.ts::60 seats")).rejects.toThrow("locked");
    await expect(criteriaService.unlock(project.id, agent, code)).rejects.toThrow("needs a person");
    await criteriaService.unlock(project.id, actor, code);
    await criteriaService.linkTest(project.id, agent, code, "AC-1", "unit/discount.test.ts::60 seats");
    const view = await requirementsService.get(project.id, code);
    expect(view.status).toBe("specified");
    expect(view.criteria[0]?.tests.map((t) => t.testRef)).toContain("unit/discount.test.ts::60 seats");
  });

  it("sends an approved requirement back to specified when its spec changes", async () => {
    const { project, actor, code } = await specified(false);
    await lifecycleService.approve(project.id, actor, code);
    const view = await requirementsService.update(project.id, agent, code, { statement: "Now it also shows on the e-mail." });
    expect(view.status).toBe("specified");
    expect(view.criteria.every((c) => c.lockedHash === null)).toBe(true);
  });
});

describe("transitions", () => {
  it("lets the agent start building but never skip to verified", async () => {
    const { project, actor, code } = await specified(false);
    await expect(lifecycleService.start(project.id, agent, code, null)).rejects.toThrow("not allowed");
    await lifecycleService.approve(project.id, actor, code);
    await lifecycleService.start(project.id, agent, code, "main");
    expect((await requirementsService.get(project.id, code)).status).toBe("building");
  });

  it("needs a reason to drop", async () => {
    const { project, actor, code } = await specified(false);
    await expect(lifecycleService.drop(project.id, actor, code, " ")).rejects.toThrow("needs a reason");
    await lifecycleService.drop(project.id, actor, code, "client removed it");
    expect((await requirementsService.get(project.id, code)).status).toBe("dropped");
  });
});
