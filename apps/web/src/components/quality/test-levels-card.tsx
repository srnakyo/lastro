import { testLevel } from "@lastro/shared";
import { useQuery } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirementQaQuery } from "@/hooks/run-queries";
import { useI18n } from "@/lib/i18n";
import { levelLabel, orderedLevels } from "@/lib/type-label";
import { cn } from "@/lib/utils";

/** The requirement's tests by level, against the levels its type asks for. */
export function TestLevelsCard({ projectKey, code, tests }: { projectKey: string; code: string; tests: string[] }) {
  const { t } = useI18n();
  const { data: qa } = useQuery(requirementQaQuery(projectKey, code));
  if (!qa) return null;
  const levels = qa.config.tests.levels;
  const wanted = orderedLevels(qa.config.types[qa.type]?.tests.levels ?? []);
  const byLevel = new Map<string, string[]>();
  for (const ref of [...new Set(tests)]) {
    const level = testLevel(ref, levels) ?? "—";
    byLevel.set(level, [...(byLevel.get(level) ?? []), ref]);
  }
  const shown = orderedLevels(new Set([...wanted, ...byLevel.keys()]));
  return (
    <Card role="region" aria-label={t("tests.levels.title")}>
      <CardHeader>
        <CardTitle>{t("tests.levels.title")}</CardTitle>
        <span className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
          {wanted.length === 0 ? (
            t("tests.levels.none")
          ) : (
            <>
              {t("tests.levels.wanted")}:
              {wanted.map((level) => {
                const has = byLevel.has(level);
                return (
                  <span key={level} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium", has ? "bg-success/12 text-success" : "bg-destructive/10 text-destructive")}>
                    {has ? <Check className="size-3" /> : <X className="size-3" />} {levelLabel(t, level)}
                  </span>
                );
              })}
            </>
          )}
        </span>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((level) => (
          <div key={level} className="min-w-0 rounded-lg border p-3">
            <p className="text-[13px] font-semibold">{level === "—" ? "?" : levelLabel(t, level)}</p>
            {(byLevel.get(level) ?? []).length === 0 ? (
              <p className="mt-1 text-[12.5px] text-destructive">{t("tests.levels.missing")}</p>
            ) : (
              <ul className="mt-1 grid gap-1">
                {(byLevel.get(level) ?? []).map((ref) => (
                  <li key={ref} className="break-words font-mono text-[11.5px] text-muted-foreground">{ref}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
