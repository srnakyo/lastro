import type { Command } from "commander";
import { LastroClient } from "../api/client";
import { findRoot, linkedProject } from "../config/project";
import { table } from "../output";

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
