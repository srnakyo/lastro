/**
 * The source files that implement each of Lastro's own requirements: their coverage is checked against the
 * type's thresholds, and their change makes the requirement's evidence stale. Lastro's requirements were built
 * before the hooks recorded touched files, so they are listed here; new work is recorded by the hooks.
 */
export const TOUCHES: Record<string, string[]> = {
  "REQ-0C4N1": ["packages/cli/src/commands/account.ts", "packages/cli/src/config/project.ts", "packages/core/src/projects/service.ts", "packages/core/src/snapshot/export.ts", "packages/snapshot/src/write.ts"],
  "REQ-1F7QA": ["packages/cli/src/commands/doctor.ts", "packages/shared/scripts/schemas.ts", "packages/shared/src/config.ts", "packages/shared/src/export/files.ts", "packages/snapshot/src/read.ts", "packages/snapshot/src/validate.ts"],
  "REQ-2K9DM": ["packages/core/src/codes/generate.ts", "packages/shared/src/codes.ts"],
  "REQ-3M5TX": ["packages/cli/src/commands/spec.ts", "packages/core/src/lifecycle/blockers.ts", "packages/core/src/overview/pending.ts", "packages/core/src/requirements/evaluate.ts", "packages/core/src/requirements/graph.ts", "packages/shared/src/config.ts"],
  "REQ-4P8WB": ["packages/core/src/lifecycle/blockers.ts", "packages/core/src/requirements/citations.ts", "packages/core/src/sources/recheck.ts", "packages/core/src/text/markdown.ts", "packages/core/src/text/normalize.ts", "packages/core/src/text/passages.ts", "packages/core/src/text/quote.ts"],
  "REQ-5R2HC": ["packages/cli/src/commands/human.ts", "packages/cli/src/commands/spec.ts", "packages/core/src/decisions/service.ts", "packages/core/src/lifecycle/blockers.ts", "packages/core/src/lifecycle/service.ts", "packages/core/src/questions/service.ts", "packages/core/src/requirements/graph.ts"],
  "REQ-6T3JD": ["packages/cli/src/commands/human.ts", "packages/cli/src/commands/spec.ts", "packages/core/src/decisions/service.ts", "packages/core/src/lifecycle/blockers.ts", "packages/core/src/scope/actor.ts"],
  "REQ-7V6KE": ["packages/cli/src/commands/spec.ts", "packages/core/src/lifecycle/transitions.ts", "packages/core/src/overview/pending.ts"],
  "REQ-8X1MF": ["packages/core/src/runs/record.ts", "packages/runner/src/exec.ts", "packages/runner/src/plan.ts", "packages/runner/src/verify.ts", "packages/shared/src/run.ts"],
  "REQ-9Z4NG": ["packages/core/src/runs/record.ts", "packages/runner/src/junit.ts", "packages/runner/src/sarif.ts", "packages/runner/src/verify.ts"],
  "REQ-A2C7H": ["packages/cli/src/commands/gate-ci.ts", "packages/cli/src/commands/verify-run.ts", "packages/cli/src/commands/verify.ts", "packages/core/src/runs/gate-items.ts", "packages/core/src/runs/gate.ts", "packages/core/src/runs/red-first.ts", "packages/core/src/runs/service.ts", "packages/runner/src/lcov.ts", "packages/runner/src/quality/coverage.ts", "packages/runner/src/quality/examples.ts"],
  "REQ-B5D8J": ["packages/cli/src/commands/verify-run.ts", "packages/core/src/runs/service.ts", "packages/runner/src/git.ts", "packages/runner/src/verify.ts"],
  "REQ-C8E1K": ["packages/cli/src/commands/gate-ci.ts", "packages/cli/src/commands/human.ts", "packages/core/src/criteria/service.ts", "packages/core/src/lifecycle/approve.ts", "packages/core/src/runs/gate-items.ts", "packages/core/src/runs/gate.ts", "packages/shared/src/lock.ts"],
  "REQ-D1F4M": ["apps/web/src/server/docs.ts", "packages/cli/src/commands/docs.ts", "packages/core/src/docs/data.ts", "packages/docs/src/documents/package-report.ts", "packages/docs/src/i18n.ts"],
  "REQ-E4G7N": ["apps/web/src/api-lib/mcp/catalog.ts", "packages/cli/src/commands/human.ts", "packages/cli/src/config/project.ts", "packages/cli/src/confirm.ts", "packages/cli/src/hooks/guard.ts", "packages/core/src/lifecycle/service.ts", "packages/core/src/scope/actor.ts", "packages/core/src/sources/service.ts"],
  "REQ-F7H2Q": ["packages/database/prisma.config.ts", "packages/database/prisma/schema.prisma", "packages/database/src/client.ts"],
  "REQ-G2J5R": ["apps/web/src/api-lib/http.ts", "packages/cli/src/commands/doctor.ts", "packages/cli/src/config/credentials.ts", "packages/core/src/tokens/service.ts", "packages/database/src/client.ts", "packages/shared/src/redact.ts", "packages/snapshot/src/validate.ts"],
  "REQ-H5K8S": ["packages/cli/src/commands/snapshot.ts", "packages/core/src/snapshot/apply-human.ts", "packages/core/src/snapshot/apply-spec.ts", "packages/core/src/snapshot/export.ts", "packages/core/src/snapshot/plan.ts", "packages/core/src/snapshot/service.ts", "packages/snapshot/src/read.ts", "packages/snapshot/src/write.ts"],
  "REQ-P0V3Y": ["apps/web/src/server/docs.ts", "packages/cli/src/commands/docs.ts", "packages/core/src/docs/data.ts", "packages/core/src/docs/service.ts", "packages/docs/src/documents/header.ts", "packages/docs/src/documents/index.ts", "packages/docs/src/documents/requirements.ts", "packages/docs/src/i18n.ts"],
  "REQ-M4R7W": ["packages/core/src/runs/qa.ts", "packages/docs/src/diagrams/mermaid.ts", "packages/docs/src/diagrams/traceability.ts", "packages/docs/src/values.ts"],
  "REQ-N7T0X": ["packages/core/src/lifecycle/blockers.ts", "packages/core/src/lifecycle/transitions.ts", "packages/core/src/runs/qa.ts", "packages/docs/src/diagrams/lifecycle.ts", "packages/docs/src/values.ts"],
  "REQ-R6Y9A": ["packages/core/src/runs/qa.ts", "packages/docs/src/diagrams/qa-flow.ts", "packages/docs/src/values.ts"],
};
