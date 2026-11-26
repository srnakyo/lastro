import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { levelLabel, orderedLevels } from "@/lib/type-label";
import { cn } from "@/lib/utils";
import type { Action, Draft } from "./draft";

/** The tests a type asks for: levels to cover, and the coverage of the files its requirements touch. */
export function TypeTests({ draft, index, dispatch }: { draft: Draft; index: number; dispatch: (a: Action) => void }) {
  const { t } = useI18n();
  const type = draft.types[index];
  if (!type) return null;
  return (
    <div className="grid gap-3">
      <div>
        <p className="mb-1.5 text-[12px] font-medium text-muted-foreground">{t("qrules.type.levels")}</p>
        <div className="flex flex-wrap gap-1.5">
          {orderedLevels(Object.keys(draft.base.tests.levels)).map((level) => {
            const on = type.tests.levels.includes(level);
            return (
              <button key={level} type="button" aria-pressed={on} onClick={() => dispatch({ type: "type.level", index, level, on: !on })} className={cn("rounded-full border px-2.5 py-0.5 text-[12px]", on ? "border-primary/40 bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent")}>
                {levelLabel(t, level)}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-[12px] font-medium text-muted-foreground">{t("qrules.type.coverage")}</p>
        <div className="flex flex-wrap items-center gap-3 text-[12.5px]">
          <label className="flex items-center gap-1.5">
            <Input inputMode="numeric" value={type.tests.functions} onChange={(e) => dispatch({ type: "type.coverage", index, value: { functions: e.target.value.replace(/[^\d]/g, "").slice(0, 3) } })} className="h-8 w-16 text-right" aria-label={t("qrules.type.functions")} />
            {t("qrules.type.functions")}
          </label>
          <label className="flex items-center gap-1.5">
            <Input inputMode="numeric" value={type.tests.lines} onChange={(e) => dispatch({ type: "type.coverage", index, value: { lines: e.target.value.replace(/[^\d]/g, "").slice(0, 3) } })} className="h-8 w-16 text-right" aria-label={t("qrules.type.lines")} />
            {t("qrules.type.lines")}
          </label>
        </div>
        <p className="mt-1 text-[12px] text-muted-foreground">{t("qrules.type.coverage.help")}</p>
      </div>
    </div>
  );
}
