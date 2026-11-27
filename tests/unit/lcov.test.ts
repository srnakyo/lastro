import { describe, expect, it } from "bun:test";
import { coverageOf, lineRanges, parseLcov } from "../../packages/runner/src/lcov";

describe("parsing an LCOV report", () => {
  it("takes the totals from the summary lines and lists the lines with no hit", () => {
    const [file] = parseLcov("SF:src/a.ts\nFNF:3\nFNH:2\nDA:1,1\nDA:2,0\nDA:3,0\nDA:4,5\nLF:4\nLH:2\nend_of_record\n");
    expect(file).toMatchObject({ file: "src/a.ts", functionsFound: 3, functionsHit: 2, linesFound: 4, linesHit: 2, uncoveredLines: [2, 3] });
  });

  it("counts functions and lines from the detail records when there is no summary (Vitest, c8)", () => {
    const [file] = parseLcov("SF:src/b.ts\nFN:1,first\nFN:5,second\nFNDA:4,first\nFNDA:0,second\nDA:1,4\nDA:5,0\nend_of_record\n");
    expect(file).toMatchObject({ functionsFound: 2, functionsHit: 1, linesFound: 2, linesHit: 1, functions: [{ name: "first", hits: 4 }, { name: "second", hits: 0 }] });
  });

  it("keeps a function name that has a comma in it", () => {
    const [file] = parseLcov("SF:src/c.ts\nFN:1,a,b\nFNDA:2,a,b\nend_of_record\n");
    expect(file?.functions).toEqual([{ name: "a,b", hits: 2 }]);
  });

  it("reads several records, Windows line ends and backslash paths, and ignores lines outside a record", () => {
    const report = parseLcov("TN:\r\nDA:1,1\r\nSF:src\\a.ts\r\nDA:1,1\r\nend_of_record\r\nSF:src/b.ts\r\nend_of_record\r\n");
    expect(report.map((f) => f.file)).toEqual(["src/a.ts", "src/b.ts"]);
  });

  it("treats a summary that is not a number as zero", () => {
    const [file] = parseLcov("SF:src/d.ts\nFNF:x\nFNH:y\nLF:z\nLH:w\nend_of_record\n");
    expect([file?.functionsFound, file?.functionsHit, file?.linesFound, file?.linesHit]).toEqual([0, 0, 0, 0]);
  });
});

describe("line ranges", () => {
  it("joins consecutive lines into ranges", () => {
    expect(lineRanges([3, 8, 9, 14, 15, 16])).toBe("3, 8-9, 14-16");
  });

  it("cuts a long list and marks it", () => {
    expect(lineRanges([1, 3, 5, 7, 9], 3)).toBe("1, 3, 5…");
  });

  it("is empty for no lines", () => {
    expect(lineRanges([])).toBe("");
  });
});

describe("finding a file in the report", () => {
  const report = parseLcov("SF:/home/dev/app/src/a.ts\nend_of_record\nSF:src/b.ts\nend_of_record\n");

  it("matches an absolute LCOV path by the end of the repository path", () => {
    expect(coverageOf(report, "src/a.ts")?.file).toBe("/home/dev/app/src/a.ts");
  });

  it("accepts a ./ prefix and backslashes", () => {
    expect(coverageOf(report, ".\\src\\b.ts")?.file).toBe("src/b.ts");
    expect(coverageOf(report, "./src/b.ts")?.file).toBe("src/b.ts");
  });

  it("matches only whole path segments", () => {
    expect(coverageOf(report, "a.ts")?.file).toBe("/home/dev/app/src/a.ts");
    expect(coverageOf(report, "rc/a.ts")).toBeUndefined();
  });
});
