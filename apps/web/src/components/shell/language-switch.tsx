import { usePreference } from "@/hooks/use-preference";
import { useI18n, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Lang; short: string; name: string }[] = [
  { value: "pt-BR", short: "PT", name: "Português (Brasil)" },
  { value: "en", short: "EN", name: "English" },
];

/** The language of the screens, always in sight: two buttons named in their own language. */
export function LanguageSwitch() {
  const { t, lang } = useI18n();
  const set = usePreference();
  return (
    <div role="radiogroup" aria-label={t("user.language")} className="flex h-8 items-center rounded-md border bg-muted/40 p-0.5">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === lang}
          aria-label={o.name}
          title={o.name}
          onClick={() => o.value !== lang && void set("lastro_lang", o.value)}
          className={cn(
            "h-full cursor-pointer rounded px-2 text-[12px] font-semibold transition-colors",
            o.value === lang ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.short}
        </button>
      ))}
    </div>
  );
}
