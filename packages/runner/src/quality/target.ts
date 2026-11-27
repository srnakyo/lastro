import type { Finding } from "../sarif";

/** A requirement as the test-quality checks see it. */
export interface QualityTarget {
  code: string;
  type: string;
  touches: string[];
  testFiles?: string[];
  examples?: { given: string; expect: string }[];
}

export const finding = (ruleId: string, message: string, file: string | null = null): Finding => ({ tool: "lastro", ruleId, level: "error", file, line: null, message });
