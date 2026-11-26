import type { GateItem } from "@lastro/core";
import type { MessageKey, Translate } from "./i18n";

const STATUS: Record<string, MessageKey> = { failed: "gate.status.failed", error: "gate.status.error", skipped: "gate.status.skipped", "not run": "gate.status.notRun" };

/** One thing that holds a requirement at the gate, in the screen's language. */
export function gateItemText(t: Translate, item: GateItem): string {
  const status = (s: string) => (STATUS[s] ? t(STATUS[s]) : s);
  switch (item.kind) {
    case "stage":
      return t("gate.item.stage", { stage: item.stage, status: status(item.status) });
    case "finding":
      return t("gate.item.finding", { stage: item.stage, text: item.text });
    case "manual":
      return t("gate.item.manual", { stage: item.stage });
    case "no_test":
      return t("gate.item.no_test", { criterion: item.criterion });
    case "test":
      return t("gate.item.test", { criterion: item.criterion, test: item.test, status: status(item.status) });
    case "regression":
      return t("gate.item.regression", { incident: item.incident, test: item.test, status: status(item.status) });
    case "invariant":
      return t("gate.item.invariant", { invariant: item.invariant, test: item.test, status: status(item.status) });
    case "locked_changed":
      return t("gate.item.locked_changed", { file: item.file, criterion: item.criterion });
    case "no_examples":
      return t("gate.item.no_examples");
    case "examples_short":
      return t("gate.item.examples_short", { examples: item.examples, passing: item.passing });
    case "unknown_check":
      return t("gate.item.unknown_check", { check: item.check });
    case "blocker":
      return t("gate.item.blocker", { blocker: t(`blocker.${item.blocker}` as MessageKey), detail: item.detail }).trim();
    case "never_red":
      return t("gate.item.never_red", { test: item.test });
  }
}
