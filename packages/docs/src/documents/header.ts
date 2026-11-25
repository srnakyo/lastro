import type { DocsInput } from "../model";
import { formatDate, type DocT } from "../i18n";

export function header(input: DocsInput, t: DocT, title: string): string {
  const commit = input.commit ? t("atCommit", { commit: input.commit }) : "";
  return `# ${title}: ${input.project.name}\n\n_${t("generated", { date: formatDate(input.generatedAt, input.lang), commit })}_`;
}

export const isVerified = (status: string) => ["verified", "previewed", "delivered", "accepted"].includes(status);
export const covered = (r: { criteria: { tests: string[] }[] }) => r.criteria.length > 0 && r.criteria.every((c) => c.tests.length > 0);
