import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Command } from "commander";
import { LastroClient } from "../api/client";
import { findRoot, linkedProject } from "../config/project";

const FILES: Record<string, string> = {
  project: "PROJECT", requirements: "REQUIREMENTS", architecture: "ARCHITECTURE", "test-plan": "TEST-PLAN", "test-cases": "TEST-CASES",
  "quality-report": "QUALITY-REPORT", changelog: "CHANGELOG", decisions: "DECISIONS", diagrams: "DIAGRAMS", "client-report": "CLIENT-REPORT",
};

export function docsCommand(program: Command) {
  program
    .command("docs")
    .description("generate the project documents on the server and write them here")
    .option("--out <dir>", "where to write them, relative to the repository", "docs/lastro")
    .option("--lang <lang>", "en or pt-BR (default: the project's language)")
    .option("--format <formats>", "comma separated: md, html, pdf", "md")
    .action(async (o: { out: string; lang?: string; format: string }) => {
      const root = findRoot();
      const project = linkedProject(root);
      const client = new LastroClient();
      const formats = o.format.split(",").map((f) => f.trim()).filter((f) => ["md", "html", "pdf"].includes(f));
      await client.post(`/projects/${project}/docs`, { lang: o.lang, pdf: formats.includes("pdf") });
      const out = resolve(root, o.out);
      mkdirSync(out, { recursive: true });
      for (const [id, name] of Object.entries(FILES)) {
        for (const format of formats) writeFileSync(join(out, `${name}.${format}`), await client.download(`/projects/${project}/docs/${id}.${format}`));
      }
      console.log(`wrote ${Object.keys(FILES).length * formats.length} files to ${o.out}`);
    });
}
