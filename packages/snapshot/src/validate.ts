import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { EXPORT_FILES, type ExportFileKind } from "@lastro/shared";
import { parse } from "yaml";
import type { ZodType } from "zod";

export interface ExportProblem {
  file: string;
  path: string;
  message: string;
}

const FOLDERS: Partial<Record<ExportFileKind, string>> = { source: "sources", package: "packages", requirement: "requirements", decision: "decisions", question: "questions", incident: "incidents" };

/** lastro.yml names environment variables; a value with credentials written in it is a leak waiting in git. */
function secretsIn(config: unknown): ExportProblem[] {
  const text = JSON.stringify(config ?? {});
  const problems: ExportProblem[] = [];
  if (/[a-z][a-z0-9+.-]*:\/\/[^/\s"@:]+:[^/\s"@]+@/i.test(text)) problems.push({ file: ".lastro/lastro.yml", path: "", message: "a URL with a user and password is written here: put it in an environment variable and name it in server.url_env" });
  if (/lst_[a-z0-9]{8}_[a-z0-9]{16,}/i.test(text)) problems.push({ file: ".lastro/lastro.yml", path: "", message: "a Lastro token is written here: put it in an environment variable and name it in server.token_env" });
  const server = (config as { server?: Record<string, unknown> } | null)?.server ?? {};
  for (const key of ["url", "token"]) if (key in server) problems.push({ file: ".lastro/lastro.yml", path: `server.${key}`, message: `use server.${key}_env with the name of an environment variable, never the value` });
  return problems;
}

function check(file: string, rel: string, schema: ZodType): ExportProblem[] {
  let data: unknown;
  try {
    data = parse(readFileSync(file, "utf8"));
  } catch (error) {
    return [{ file: rel, path: "", message: `not valid YAML: ${(error as Error).message.split("\n")[0]}` }];
  }
  const result = schema.safeParse(data ?? {});
  const problems: ExportProblem[] = result.success ? [] : result.error.issues.map((i) => ({ file: rel, path: i.path.join("."), message: i.message }));
  return rel.endsWith("lastro.yml") ? [...problems, ...secretsIn(data)] : problems;
}

/** Validates every file of a .lastro/ export against its published contract (REQ-1F7QA, REQ-G2J5R). */
export function validateExport(root: string): ExportProblem[] {
  const dir = join(root, ".lastro");
  const problems: ExportProblem[] = [];
  for (const [kind, def] of Object.entries(EXPORT_FILES) as [ExportFileKind, (typeof EXPORT_FILES)[ExportFileKind]][]) {
    const folder = FOLDERS[kind];
    if (!folder) {
      const file = join(dir, def.pattern);
      if (existsSync(file)) problems.push(...check(file, `.lastro/${def.pattern}`, def.schema as ZodType));
      else if (kind === "config") problems.push({ file: ".lastro/lastro.yml", path: "", message: "missing: run lastro init" });
      continue;
    }
    const path = join(dir, folder);
    if (!existsSync(path)) continue;
    for (const name of readdirSync(path).filter((n) => n.endsWith(".yml")).sort()) problems.push(...check(join(path, name), `.lastro/${folder}/${name}`, def.schema as ZodType));
  }
  return problems;
}
