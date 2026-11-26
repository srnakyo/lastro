/** What an LCOV report says about one source file. */
export interface FileCoverage {
  file: string;
  functions: { name: string; hits: number }[];
  linesFound: number;
  linesHit: number;
}

/** Parses an LCOV report (bun, Vitest, Jest, c8, nyc, coverage.py with lcov output). */
export function parseLcov(text: string): FileCoverage[] {
  const out: FileCoverage[] = [];
  let current: FileCoverage | null = null;
  const hits = new Map<string, number>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("SF:")) {
      current = { file: line.slice(3).replace(/\\/g, "/"), functions: [], linesFound: 0, linesHit: 0 };
      hits.clear();
    } else if (!current) continue;
    else if (line.startsWith("FN:")) current.functions.push({ name: line.slice(line.indexOf(",") + 1), hits: 0 });
    else if (line.startsWith("FNDA:")) {
      const [count, ...name] = line.slice(5).split(",");
      hits.set(name.join(","), Number(count) || 0);
    } else if (line.startsWith("LF:")) current.linesFound = Number(line.slice(3)) || 0;
    else if (line.startsWith("LH:")) current.linesHit = Number(line.slice(3)) || 0;
    else if (line === "end_of_record") {
      current.functions = current.functions.map((f) => ({ ...f, hits: hits.get(f.name) ?? 0 }));
      out.push(current);
      current = null;
    }
  }
  return out;
}

/** The report entry of a repository file: LCOV paths are often absolute, so match the end of the path. */
export function coverageOf(report: FileCoverage[], file: string): FileCoverage | undefined {
  const wanted = file.replace(/\\/g, "/").replace(/^\.\//, "");
  return report.find((r) => r.file === wanted || r.file.endsWith(`/${wanted}`));
}
