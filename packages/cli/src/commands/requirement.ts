import type { Command } from "commander";
import { LastroClient } from "../api/client";
import { findRoot, linkedProject } from "../config/project";
import { HookState } from "../hooks/state";
import { proveAtCommit } from "../prove/at-commit";
import { json, table } from "../output";

const project = () => linkedProject(findRoot());

/** `lastro req`: list and read requirements, start or pick one to work on, link tests, touched files, existing behavior. */
export function requirementCommands(program: Command) {
  const req = program.command("req").description("requirements");
  req.command("list").option("--status <status>").action(async (o: { status?: string }) => {
    const items = await new LastroClient().get<{ code: string; status: string; type: string; title: string }[]>(`/projects/${project()}/requirements${o.status ? `?status=${o.status}` : ""}`);
    table(items.map((r) => [r.code, r.status, r.type, r.title]));
  });
  req.command("show").argument("<code>").action(async (code: string) => json(await new LastroClient().get(`/projects/${project()}/requirements/${code}`)));
  req.command("start").argument("<code>").option("--branch <branch>").action(async (code: string, o: { branch?: string }) => {
    await new LastroClient().post(`/projects/${project()}/requirements/${code}/start`, { branch: o.branch ?? null });
    new HookState(findRoot()).setCurrent(code);
    console.log(`${code} is building; the files you change now count for it`);
  });
  req
    .command("work")
    .description("say which requirement you are working on: the files you change count for it")
    .argument("<code>")
    .action(async (code: string) => {
      const r = await new LastroClient().get<{ status: string }>(`/projects/${project()}/requirements/${code}`);
      if (!["building", "reopened"].includes(r.status)) throw new Error(`${code} is ${r.status}: start it with lastro req start ${code}`);
      new HookState(findRoot()).setCurrent(code);
      console.log(`working on ${code}: the files you change now count for it`);
    });
  req
    .command("touches")
    .description("list the files a requirement touches, or replace them with --set (its coverage is measured on these)")
    .argument("<code>")
    .option("--set <files...>", "the files that are really this requirement's")
    .action(async (code: string, o: { set?: string[] }) => {
      const client = new LastroClient();
      if (!o.set) return console.log(((await client.get<{ touches: string[] }>(`/projects/${project()}/requirements/${code}`)).touches ?? []).join("\n"));
      const res = await client.post<{ touches: string[]; removed: string[]; added: string[] }>(`/projects/${project()}/requirements/${code}/touches`, { files: o.set });
      console.log(`${code} touches ${res.touches.length} files (${res.removed.length} removed, ${res.added.length} added)`);
    });
  req
    .command("prove")
    .description("run a criterion's tests on an earlier commit, before the code existed: failing there is their red")
    .argument("<code>")
    .argument("<criterion>")
    .requiredOption("--at <commit>", "a commit from before the code those tests check")
    .action(async (code: string, criterion: string, o: { at: string }) => {
      const proof = await proveAtCommit(new LastroClient(), findRoot(), project(), code, criterion, o.at);
      if (proof.failed.length) console.log(`${code} ${criterion}: ${proof.failed.length} test(s) fail at ${proof.commit}, before the code: their red is recorded (run ${proof.runId})`);
      if (proof.passed.length) {
        console.log(`these pass at ${proof.commit} too, so they may not check that code; make them stronger:\n${proof.passed.map((t) => `  ${t}`).join("\n")}`);
        process.exitCode = 1;
      }
      if (proof.notRun.length) console.log(`not run at ${proof.commit}:\n${proof.notRun.map((t) => `  ${t}`).join("\n")}`);
    });
  req
    .command("existing")
    .description("say a criterion's tests check a behavior that already existed, so they cannot fail first")
    .argument("<code>")
    .argument("<criterion>")
    .requiredOption("--reason <text>", "why: where the behavior already was")
    .action(async (code: string, criterion: string, o: { reason: string }) => {
      const res = await new LastroClient().post<{ decision: string }>(`/projects/${project()}/requirements/${code}/criteria/${criterion}/preexisting`, { reason: o.reason });
      console.log(`${code} ${criterion}: recorded as an existing behavior in ${res.decision}; its tests are not asked to fail first`);
    });
  req.command("link-test").argument("<code>").argument("<criterion>").argument("<test>", "file::test name").action(async (code: string, criterion: string, test: string) => {
    await new LastroClient().post(`/projects/${project()}/requirements/${code}/tests`, { criterion, test });
    console.log(`${test} linked to ${code} ${criterion}`);
  });
}
