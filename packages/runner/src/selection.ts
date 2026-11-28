import { posix } from "node:path";
import { testFile, testLevel, type ProjectConfig } from "@lastro/shared";

type Command = ProjectConfig["commands"][string];

const PLACEHOLDER = /\{(files|dirs|names)\}/;

/** Whether a command names the tests to run, so a verify runs only the requirement's. */
export const selects = (command: Command) => PLACEHOLDER.test(command.run);

const quote = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;
const regex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/'/g, ".");

/**
 * The linked tests a command runs: those at its level (when it names one) and under its folder (when it runs
 * in one), with paths relative to that folder.
 */
export function selectionFor(command: Command, levels: Record<string, string[]>, tests: string[]) {
  const dir = command.dir ? `${command.dir.replace(/\/+$/, "")}/` : "";
  const picked = [...new Set(tests)].filter((ref) => (!command.level || testLevel(ref, levels) === command.level) && testFile(ref).startsWith(dir));
  const files = [...new Set(picked.map((ref) => testFile(ref).slice(dir.length)))].sort();
  const dirs = [...new Set(files.map((f) => `./${posix.dirname(f)}`.replace(/\/\.$/, "")))].sort();
  const names = [...new Set(picked.map((ref) => ref.split("::").slice(1).join("::")).filter(Boolean))].sort();
  return { files, dirs, names };
}

/** The command with {files}, {dirs} and {names} filled in. */
export function fillCommand(run: string, selection: { files: string[]; dirs: string[]; names: string[] }) {
  return run
    .replaceAll("{files}", selection.files.map(quote).join(" "))
    .replaceAll("{dirs}", selection.dirs.map(quote).join(" "))
    .replaceAll("{names}", selection.names.map(regex).join("|"));
}
