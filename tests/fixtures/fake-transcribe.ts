// Stands in for Whisper in tests: `fake-transcribe <input> <output_dir>` writes Whisper-style JSON.
import { existsSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";

const args = process.argv.slice(2);
const [input, outputDir] = args;
if (args.length !== 2 || !input || !outputDir) {
  console.error(`expected exactly <input> <output_dir>, got: ${args.join(" ")}`);
  process.exit(2);
}
if (!existsSync(input)) {
  console.error(`input not found: ${input}`);
  process.exit(3);
}

const segments = [
  { start: 0, end: 4.2, text: " The invoice needs the discount line." },
  { start: 65.4, end: 68, text: " Also on the annual plan." },
  { start: 65.9, end: 66.5, text: " Right." },
  { start: 70, end: 71, text: "   " },
  { start: 3725, end: 3730, text: " Past one hour." },
];
writeFileSync(join(outputDir, `${basename(input, extname(input))}.json`), JSON.stringify({ text: "", segments, language: "en" }));
