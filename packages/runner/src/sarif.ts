export interface Finding {
  tool: string;
  ruleId: string | null;
  level: "error" | "warning" | "note";
  file: string | null;
  line: number | null;
  message: string;
}

interface SarifLog {
  runs?: {
    tool?: { driver?: { name?: string } };
    results?: { ruleId?: string; level?: string; suppressions?: { status?: string }[]; message?: { text?: string }; locations?: { physicalLocation?: { artifactLocation?: { uri?: string }; region?: { startLine?: number } } }[] }[];
  }[];
}

/** Reads a SARIF 2.1.0 log (ESLint, Semgrep, Ruff, PHPStan, CodeQL) into findings. */
export function parseSarif(text: string): Finding[] {
  const log = JSON.parse(text) as SarifLog;
  // A result with an accepted suppression (eslint-disable, a baseline) is not a finding: the tool itself reports it as silenced.
  const suppressed = (r: { suppressions?: { status?: string }[] }) => (r.suppressions ?? []).some((s) => s.status !== "rejected" && s.status !== "underReview");
  return (log.runs ?? []).flatMap((run) =>
    (run.results ?? []).filter((r) => !suppressed(r)).map((r) => {
      const location = r.locations?.[0]?.physicalLocation;
      const level = r.level === "error" || r.level === "note" ? r.level : "warning";
      return {
        tool: run.tool?.driver?.name ?? "sarif",
        ruleId: r.ruleId ?? null,
        level,
        file: location?.artifactLocation?.uri?.replace(/^file:\/\//, "") ?? null,
        line: location?.region?.startLine ?? null,
        message: r.message?.text ?? "",
      };
    }),
  );
}
