import type { Command } from "commander";
import { LastroClient } from "../api/client";
import { findRoot, linkedProject } from "../config/project";
import { HookState } from "../hooks/state";
import { json, table } from "../output";

interface Pending {
  code: string;
  title: string;
  status: string;
  reason: (typeof REASONS)[number];
  details: string[];
}

const REASONS = ["missing_fields", "open_question", "awaiting_approval", "building", "gate_red"] as const;
const LABELS: Record<(typeof REASONS)[number], string> = {
  missing_fields: "missing fields",
  open_question: "open question",
  awaiting_approval: "awaiting approval",
  building: "building",
  gate_red: "gate red",
};

const project = () => linkedProject(findRoot());

export function specCommands(program: Command) {
  program
    .command("pending")
    .description("what has not reached verified, grouped by what it waits on")
    .argument("[package]", "only this package, like PKG-2R8XW")
    .action(async (pkg?: string) => {
      const items = await new LastroClient().get<Pending[]>(`/projects/${project()}/pending${pkg ? `?package=${pkg}` : ""}`);
      if (items.length === 0) return console.log("nothing pending");
      for (const reason of REASONS) {
        const list = items.filter((i) => i.reason === reason);
        if (list.length === 0) continue;
        console.log(`\n${LABELS[reason]} (${list.length})`);
        table(list.map((i) => [`  ${i.code}`, i.status, i.title, i.details.length ? `${reason === "missing_fields" ? "missing" : reason === "open_question" ? "questions" : "holding"}: ${i.details.join(", ")}` : ""]));
      }
    });

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

  program
    .command("ask")
    .description("open a question")
    .argument("<text>")
    .option("--about <codes>", "requirement codes, comma separated", "")
    .option("--to <role>", "client, dev or team", "client")
    .option("--blocks", "hold the requirements back until answered")
    .action(async (text: string, o: { about: string; to: string; blocks?: boolean }) => {
      const q = await new LastroClient().post<{ code: string }>(`/projects/${project()}/questions`, { text, askedTo: o.to, blocks: !!o.blocks, requirements: o.about.split(",").filter(Boolean) });
      console.log(`asked ${q.code}`);
    });

  program
    .command("decide")
    .description("record a decision or assumption")
    .argument("<text>")
    .option("--reason <reason>")
    .option("--about <codes>", "requirement codes, comma separated", "")
    .option("--kind <kind>", "assumption, decision or client_answer", "decision")
    .option("--said-by-person <where>", "the person already decided this; where they said it (message, call, document)")
    .action(async (text: string, o: { reason?: string; about: string; kind: string; saidByPerson?: string }) => {
      const byPerson = o.saidByPerson ? { madeBy: "person", sourceRef: o.saidByPerson } : {};
      const d = await new LastroClient().post<{ code: string }>(`/projects/${project()}/decisions`, { text, reason: o.reason, kind: o.kind, decidedBy: "dev", requirements: o.about.split(",").filter(Boolean), ...byPerson });
      console.log(`recorded ${d.code}`);
    });
}
