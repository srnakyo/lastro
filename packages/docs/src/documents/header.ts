import type { DocsInput } from "../model";
import { formatDate, type DocT } from "../i18n";

/** Every document starts with the commit and the date it was generated from (REQ-P0V3Y), then its title. */
export function header(input: DocsInput, t: DocT, title: string): string {
  const commit = input.commit ? t("atCommit", { commit: input.commit }) : "";
  return `_${t("generated", { date: formatDate(input.generatedAt, input.lang), commit })}_\n\n# ${title}: ${input.project.name}`;
}

export const isVerified = (status: string) => ["verified", "previewed", "delivered", "accepted"].includes(status);
export const covered = (r: { criteria: { tests: string[] }[] }) => r.criteria.length > 0 && r.criteria.every((c) => c.tests.length > 0);
