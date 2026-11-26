/**
 * What holds a requirement at the gate, as data: screens put each item in words in their own language, and
 * the CLI and the agents read the English line that `gateText` writes.
 */
export type GateItem =
  | { kind: "stage"; stage: string; status: string }
  | { kind: "finding"; stage: string; text: string }
  | { kind: "manual"; stage: string }
  | { kind: "no_test"; criterion: string }
  | { kind: "test"; criterion: string; test: string; status: string }
  | { kind: "regression"; incident: string; test: string; status: string }
  | { kind: "invariant"; invariant: string; test: string; status: string }
  | { kind: "locked_changed"; file: string; criterion: string }
  | { kind: "no_examples" }
  | { kind: "examples_short"; examples: number; passing: number }
  | { kind: "unknown_check"; check: string }
  | { kind: "blocker"; blocker: string; detail: string }
  | { kind: "never_red"; test: string };

/** "not run" for a test or stage with no result. */
export const NOT_RUN = "not run";

/** The English line for the CLI, the hooks and the agents. */
export function gateText(item: GateItem): string {
  switch (item.kind) {
    case "stage":
      return `${item.stage} ${item.status}`;
    case "finding":
      return `${item.stage}: ${item.text}`;
    case "manual":
      return `manual stage ${item.stage} not signed`;
    case "no_test":
      return `${item.criterion} has no test`;
    case "test":
      return `${item.criterion} ${item.test} ${item.status}`;
    case "regression":
      return `regression test of ${item.incident}: ${item.test} ${item.status}`;
    case "invariant":
      return `invariant ${item.invariant}: ${item.test} ${item.status}`;
    case "locked_changed":
      return `locked test changed: ${item.file} (${item.criterion}); revert it, or a person unlocks the criteria`;
    case "no_examples":
      return "examples: the requirement has no example of the requester";
    case "examples_short":
      return `examples: ${item.examples} examples, ${item.passing} linked tests passing`;
    case "unknown_check":
      return `check ${item.check} has no automatic implementation: make it manual (signed) or a command`;
    case "blocker":
      return `${item.blocker}${item.detail ? ` ${item.detail}` : ""}`;
    case "never_red":
      return `${item.test} never failed on a Lastro run: write the test before the code, see it fail, then make it pass`;
  }
}
