import { database } from "@lastro/database";
import { markdownPassages, projectsService, sourcesService, workspacesService } from "@lastro/core";
import { projectConfigSchema, type Actor } from "@lastro/shared";

export const person = (id: string): Actor => ({ type: "user", id });
export const agent: Actor = { type: "agent", id: "claude-code" };

export async function createUser(id = "user-1") {
  return database().user.create({ data: { id, name: "Dev", email: `${id}@example.test` } });
}

export const BRIEF = `# Invoices

## Volume discount

The volume discount has to show on the invoice, including the **annual plan**.

Above 50 seats the discount is 8%.
`;

/** A workspace with one project whose calculation type requires data_source and examples. */
export async function createProject(options: { requireFinal?: boolean } = {}) {
  const user = await createUser();
  const actor = person(user.id);
  const workspace = await workspacesService.create(user.id, { name: "Acme", slug: "acme" });
  const config = projectConfigSchema.parse({
    project: "billing",
    approval: { spec: ["dev"], require_final_source: options.requireFinal ?? false },
    types: { calculation: { required: ["data_source", "examples"] }, behavior: { required: [] } },
  });
  const project = await projectsService.create(workspace.id, actor, { key: "billing", name: "Billing", config });
  return { user, actor, workspace, project };
}

export async function createBriefSource(projectId: string, actor: Actor, final = false, content = BRIEF) {
  return sourcesService.create(projectId, actor, {
    kind: "text",
    title: "brief.md",
    from: "client",
    hash: `sha256:${content.length}-${final}`,
    final,
    machineTranscript: false,
    passages: markdownPassages([{ name: "brief.md", content }]).map((p) => ({ anchor: p.anchor, text: p.text, heading: p.heading ?? undefined })),
  });
}

export const discountRequirement = (source: string) => ({
  title: "Volume discount on the annual invoice",
  type: "calculation",
  statement: "The invoice shows the volume discount line on monthly and annual plans.",
  dataSource: "discount table at issue date",
  examples: [{ given: "annual plan, 60 seats", expect: "8% discount line" }],
  citations: [{ source, anchor: "@brief.md#volume-discount", quote: "The volume discount has to show on the invoice, including the annual plan." }],
  criteria: [{ code: "AC-1", text: "Given 60 seats, then the invoice shows an 8% discount line.", tests: [] }],
});
