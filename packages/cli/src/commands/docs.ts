import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { commitInfo } from "@lastro/runner";
import type { Command } from "commander";
import { LastroClient } from "../api/client";
import { findRoot, linkedProject } from "../config/project";

const DOCUMENTS = ["overview", "requirements", "rules", "architecture", "decisions", "test-plan", "test-cases", "quality-report", "delivery-history", "client-report", "diagrams"];

export function docsCommand(program: Command) {
  const docs = program.command("docs").description("project documentation generated from the server data");
  docs
    .command("build")
    .description("generate the documents on the server, from this commit, and write them here")
    .option("--out <dir>", "where to write them, relative to the repository", "docs/lastro")
    .option("--lang <lang>", "en or pt-BR (default: the project's language)")
    .option("--format <formats>", "comma separated: md, html, pdf", "md")
    .action(async (o: { out: string; lang?: string; format: string }) => {
      const root = findRoot();
      const project = linkedProject(root);
      const client = new LastroClient();
      const formats = o.format.split(",").map((f) => f.trim()).filter((f) => ["md", "html", "pdf"].includes(f));
      await client.post(`/projects/${project}/docs`, { lang: o.lang, pdf: formats.includes("pdf"), commit: commitInfo(root).commit });
      const out = resolve(root, o.out);
      mkdirSync(out, { recursive: true });
      for (const id of DOCUMENTS) for (const format of formats) writeFileSync(join(out, `${id}.${format}`), await client.download(`/projects/${project}/docs/${id}.${format}`));
      console.log(`wrote ${DOCUMENTS.length * formats.length} files to ${o.out}`);
    });

  program
    .command("report")
    .description("the item-by-item report of a package for the requester, in Markdown")
    .argument("<package>", "like PKG-2R8XW")
    .option("--out <file>", "write it to a file instead of printing it")
    .option("--lang <lang>", "en or pt-BR")
    .action(async (pkg: string, o: { out?: string; lang?: string }) => {
      const root = findRoot();
      const query = new URLSearchParams({ ...(o.lang ? { lang: o.lang } : {}), ...(commitInfo(root).commit ? { commit: commitInfo(root).commit ?? "" } : {}) });
      const markdown = new TextDecoder().decode(await new LastroClient().download(`/projects/${linkedProject(root)}/report/${pkg}?${query}`));
      if (o.out) {
        writeFileSync(resolve(root, o.out), markdown);
        console.log(`wrote ${o.out}`);
      } else process.stdout.write(markdown);
    });
}
