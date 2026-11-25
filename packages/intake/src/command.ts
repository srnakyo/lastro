import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

/**
 * Splits a command template into arguments like a POSIX shell would for plain words, single and
 * double quotes and backslash escapes. Nothing is expanded: no variables, globs or pipes.
 */
export function splitCommand(template: string): string[] {
  const args: string[] = [];
  let current: string | null = null;
  let quote: "'" | '"' | null = null;
  for (let i = 0; i < template.length; i++) {
    const char = template[i] ?? "";
    if (quote) {
      if (char === quote) quote = null;
      else if (char === "\\" && quote === '"' && i + 1 < template.length) current = (current ?? "") + template[++i];
      else current = (current ?? "") + char;
    } else if (char === "'" || char === '"') {
      quote = char;
      current ??= "";
    } else if (char === "\\" && i + 1 < template.length) {
      current = (current ?? "") + template[++i];
    } else if (/\s/.test(char)) {
      if (current !== null) args.push(current);
      current = null;
    } else {
      current = (current ?? "") + char;
    }
  }
  if (quote) throw new Error(`unclosed ${quote} in command "${template}"`);
  if (current !== null) args.push(current);
  return args;
}

/** Fills {name} placeholders inside each argument; values are passed as-is, never through a shell. */
export function fillTemplate(args: string[], values: Record<string, string>): string[] {
  return args.map((arg) => arg.replace(/\{([a-z_]+)\}/g, (whole, name: string) => values[name] ?? whole));
}

/** Runs a program with arguments (shell: false) and fails with its stderr when it exits with an error. */
export async function runCommand(args: string[], what: string): Promise<void> {
  const [program, ...rest] = args;
  if (!program) throw new Error(`${what}: empty command`);
  try {
    await run(program, rest, { shell: false, maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  } catch (error) {
    const failure = error as { stderr?: string; message?: string };
    const detail = (failure.stderr ?? "").trim().split("\n").slice(-5).join("\n") || failure.message || String(error);
    throw new Error(`${what} failed: ${detail}`, { cause: error });
  }
}
