import { spawn } from "node:child_process";

export interface CommandResult {
  exitCode: number;
  durationMs: number;
  output: string;
}

const MAX_OUTPUT = 64 * 1024;

/** Runs a project command through the shell (it is the project's own command line) and keeps the tail of its output. */
export function runCommand(command: string, cwd: string, env: Record<string, string>): Promise<CommandResult> {
  const started = Date.now();
  return new Promise((resolve) => {
    const child = spawn(command, { cwd, shell: true, env: { ...process.env, ...env } });
    let output = "";
    const keep = (chunk: Buffer) => {
      output = (output + chunk.toString()).slice(-MAX_OUTPUT);
    };
    child.stdout.on("data", keep);
    child.stderr.on("data", keep);
    child.on("close", (code) => resolve({ exitCode: code ?? 1, durationMs: Date.now() - started, output }));
    child.on("error", (error) => resolve({ exitCode: 127, durationMs: Date.now() - started, output: error.message }));
  });
}
