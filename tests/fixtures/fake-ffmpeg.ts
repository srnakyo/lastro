// Stands in for ffmpeg in tests: writes "frame@<seconds>" into the last argument (the output file).
import { writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const seek = args[args.indexOf("-ss") + 1] ?? "?";
const output = args[args.length - 1];
if (!output || !args.includes("-i") || !args.includes("-frames:v")) {
  console.error(`unexpected arguments: ${args.join(" ")}`);
  process.exit(2);
}
writeFileSync(output, `frame@${seek}`);
