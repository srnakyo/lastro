/** What an LCOV report says about one source file. */
export interface FileCoverage {
  file: string;
  /** Functions by name, when the tool writes FN/FNDA records (Vitest, Jest, c8, nyc). Bun writes only the totals. */
  functions: { name: string; hits: number }[];
  functionsFound: number;
  functionsHit: number;
  linesFound: number;
  linesHit: number;
  /** Lines the report lists with no hit (DA records), in order. */
  uncoveredLines: number[];
}

const blank = (file: string): FileCoverage => ({ file, functions: [], functionsFound: 0, functionsHit: 0, linesFound: 0, linesHit: 0, uncoveredLines: [] });

/** One parsed record, before its totals are settled: the summary lines win over what the detail lines count. */
class RecordReader {
  readonly entry: FileCoverage;
  private readonly hits = new Map<string, number>();
  private summary = { fnf: -1, fnh: -1, lf: -1, lh: -1 };
  private lines = { found: 0, hit: 0 };

  constructor(file: string) {
    this.entry = blank(file.replace(/\\/g, "/"));
  }

  read(line: string) {
    const value = line.slice(line.indexOf(":") + 1);
    if (line.startsWith("FN:")) this.entry.functions.push({ name: value.slice(value.indexOf(",") + 1), hits: 0 });
    else if (line.startsWith("FNDA:")) this.functionHit(value);
    else if (line.startsWith("FNF:")) this.summary.fnf = Number(value) || 0;
    else if (line.startsWith("FNH:")) this.summary.fnh = Number(value) || 0;
    else if (line.startsWith("DA:")) this.lineHit(value);
    else if (line.startsWith("LF:")) this.summary.lf = Number(value) || 0;
    else if (line.startsWith("LH:")) this.summary.lh = Number(value) || 0;
  }

  finish(): FileCoverage {
    const e = this.entry;
    e.functions = e.functions.map((f) => ({ ...f, hits: this.hits.get(f.name) ?? 0 }));
    e.functionsFound = this.summary.fnf >= 0 ? this.summary.fnf : e.functions.length;
    e.functionsHit = this.summary.fnh >= 0 ? this.summary.fnh : e.functions.filter((f) => f.hits > 0).length;
    e.linesFound = this.summary.lf >= 0 ? this.summary.lf : this.lines.found;
    e.linesHit = this.summary.lh >= 0 ? this.summary.lh : this.lines.hit;
    return e;
  }

  private functionHit(value: string) {
    const [count, ...name] = value.split(",");
    this.hits.set(name.join(","), Number(count) || 0);
  }

  private lineHit(value: string) {
    const [line, count] = value.split(",");
    this.lines.found += 1;
    if (Number(count) > 0) this.lines.hit += 1;
    else this.entry.uncoveredLines.push(Number(line));
  }
}

/** Parses an LCOV report (Bun, Vitest, Jest, c8, nyc, coverage.py with lcov output). */
export function parseLcov(text: string): FileCoverage[] {
  const out: FileCoverage[] = [];
  let current: RecordReader | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("SF:")) current = new RecordReader(line.slice(3));
    else if (!current) continue;
    else if (line === "end_of_record") {
      out.push(current.finish());
      current = null;
    } else current.read(line);
  }
  return out;
}

/** Line numbers as short ranges: 3, 8-9, 14-28. */
export function lineRanges(lines: number[], max = 8): string {
  const ranges: string[] = [];
  let start = lines[0];
  let prev = lines[0];
  for (const n of [...lines.slice(1), Number.NaN]) {
    if (prev !== undefined && n === prev + 1) {
      prev = n;
      continue;
    }
    if (start !== undefined) ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = n;
    prev = n;
  }
  return ranges.length > max ? `${ranges.slice(0, max).join(", ")}…` : ranges.join(", ");
}

/** The report entry of a repository file: LCOV paths are often absolute, so match the end of the path. */
export function coverageOf(report: FileCoverage[], file: string): FileCoverage | undefined {
  const wanted = file.replace(/\\/g, "/").replace(/^\.\//, "");
  return report.find((r) => r.file === wanted || r.file.endsWith(`/${wanted}`));
}
