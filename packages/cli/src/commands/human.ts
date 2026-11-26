import type { Command } from "commander";
import { LastroClient } from "../api/client";
import { confirmHuman } from "../confirm";
import { findRoot, linkedProject } from "../config/project";

const project = () => linkedProject(findRoot());

/** Runs a human action after the terminal confirmation (or --yes by a listed person). */
async function human(question: string, yes: boolean | undefined, path: string, body: unknown = {}) {
  const client = new LastroClient();
  await confirmHuman(question, !!yes, client);
  return client.post(`/projects/${project()}${path}`, body);
}

interface Requirement {
  code: string;
  status: string;
  blockers: { kind: string; detail: string; blocks: string }[];
}

/** approve accepts a requirement or a package: in a package, what is blocked stays, and says why. */
async function approve(code: string, yes: boolean | undefined) {
  const client = new LastroClient();
  const key = project();
  const targets = code.startsWith("PKG-") ? (await client.get<Requirement[]>(`/projects/${key}/requirements?package=${code}`)).filter((r) => r.status === "specified" || r.status === "captured") : [{ code, status: "", blockers: [] }];
  await confirmHuman(`Approve ${code}${code.startsWith("PKG-") ? ` (${targets.length} requirements)` : ""}? Their criteria and tests get locked.`, !!yes, client);
  let refused = 0;
  for (const r of targets) {
    try {
      await client.post(`/projects/${key}/requirements/${r.code}/approve`);
      console.log(`${r.code} approved`);
    } catch (error) {
      refused += 1;
      const questions = r.blockers.filter((b) => b.kind === "open_question").map((b) => b.detail);
      console.log(`${r.code} not approved: ${(error as Error).message}${questions.length ? ` (questions: ${questions.join(", ")})` : ""}`);
    }
  }
  if (refused && !code.startsWith("PKG-")) process.exitCode = 1;
}

export function humanCommands(program: Command) {
  program.command("approve").description("approve a requirement, or every requirement of a package (a person only)").argument("<REQ-or-PKG>").option("--yes")
    .action((code: string, o: { yes?: boolean }) => approve(code, o.yes));

  program.command("accept").description("record the requester's acceptance of a delivered requirement").argument("<code>").requiredOption("--ref <reference>", "where it was accepted").option("--yes")
    .action(async (code: string, o: { ref: string; yes?: boolean }) => { await human(`Accept ${code}?`, o.yes, `/requirements/${code}/accept`, { reference: o.ref }); console.log(`${code} accepted`); });

  program.command("unlock").description("unlock the criteria of a requirement; it needs a new approval").argument("<code>").option("--yes")
    .action(async (code: string, o: { yes?: boolean }) => { await human(`Unlock the criteria of ${code}? It goes back to specified.`, o.yes, `/requirements/${code}/unlock`); console.log(`${code} unlocked`); });

  program.command("drop").description("drop a requirement, with the reason").argument("<code>").requiredOption("--reason <reason>").option("--yes")
    .action(async (code: string, o: { reason: string; yes?: boolean }) => { await human(`Drop ${code}?`, o.yes, `/requirements/${code}/drop`, { reason: o.reason }); console.log(`${code} dropped`); });

  program.command("answer").description("record the answer to a question and release what it blocks").argument("<question>").argument("<answer>")
    .option("--source <reference>", "where the answer came from: message, e-mail, call").option("--by <role>", "client, dev or team", "client").option("--yes")
    .action(async (code: string, answer: string, o: { source?: string; by: string; yes?: boolean }) => {
      await human(`Record this answer to ${code}?`, o.yes, `/questions/${code}/answer`, { answer, answerSource: o.source, decidedBy: o.by });
      console.log(`${code} answered`);
    });

  const decision = program.command("decision").description("confirm or overturn a decision");
  decision.command("confirm").argument("<code>").option("--mine", "you made this decision, not the agent").option("--yes")
    .action(async (code: string, o: { mine?: boolean; yes?: boolean }) => { await human(`Confirm ${code}${o.mine ? " as your own decision" : ""}?`, o.yes, `/decisions/${code}/confirm`, { mine: !!o.mine }); console.log(`${code} confirmed`); });
  decision.command("merge").argument("<code>").requiredOption("--into <code>", "the decision it repeats").option("--yes")
    .action(async (code: string, o: { into: string; yes?: boolean }) => { await human(`${code} repeats ${o.into}: move its links there and remove it?`, o.yes, `/decisions/${code}/merge`, { into: o.into }); console.log(`${code} merged into ${o.into}`); });
  decision.command("overturn").argument("<code>").requiredOption("--reason <reason>").option("--yes")
    .action(async (code: string, o: { reason: string; yes?: boolean }) => { await human(`Overturn ${code}? What was built on it goes back to building.`, o.yes, `/decisions/${code}/overturn`, { reason: o.reason }); console.log(`${code} overturned`); });

  const incident = program.command("incident").description("incidents after delivery");
  incident.command("report").argument("<text>").option("--about <code>").option("--source <reference>")
    .action(async (text: string, o: { about?: string; source?: string }) => {
      const created = await new LastroClient().post<{ code: string }>(`/projects/${project()}/incidents`, { reported: text, requirement: o.about, sourceRef: o.source });
      console.log(`reported ${created.code}`);
    });
  incident.command("triage").argument("<code>").requiredOption("--triage <triage>", "bug, config, missing_data, usage, improvement, not_a_defect")
    .requiredOption("--cause <cause>", "spec_gap, implementation, regression, client_change, environment").requiredOption("--billing <billing>", "fix, courtesy, quote")
    .option("--regression-test <ref>", "file::test name, required for a bug").option("--yes")
    .action(async (code: string, o: { triage: string; cause: string; billing: string; regressionTest?: string; yes?: boolean }) => {
      await human(`Triage ${code} as ${o.triage}?`, o.yes, `/incidents/${code}/triage`, { triage: o.triage, cause: o.cause, billing: o.billing, regressionTest: o.regressionTest });
      console.log(`${code} triaged`);
    });

  const source = program.command("source").description("sources of the requester's material");
  source.command("final").argument("<code>").option("--yes")
    .action(async (code: string, o: { yes?: boolean }) => { await human(`Mark ${code} final? Requirements quoting it can then be approved.`, o.yes, `/sources/${code}/final`); console.log(`${code} final`); });

  program.command("check").description("sign a manual stage (a preview, a reconciliation) with where it was approved").argument("<code>").argument("<stage>")
    .option("--pass").option("--fail").requiredOption("--ref <reference>").option("--condition <condition>").option("--by <who>").option("--yes")
    .action(async (code: string, stage: string, o: { pass?: boolean; fail?: boolean; ref: string; condition?: string; by?: string; yes?: boolean }) => {
      const status = o.fail ? "failed" : "passed";
      const reference = o.by ? `${o.by}: ${o.ref}` : o.ref;
      const gate = await human(`Sign ${stage} of ${code} as ${status}?`, o.yes, `/requirements/${code}/sign`, { stage, condition: o.condition ?? null, status, reference });
      console.log(JSON.stringify(gate));
    });
}
