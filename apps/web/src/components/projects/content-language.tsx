import { Languages } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { useI18n, type MessageKey } from "@/lib/i18n";

/** Says content is in another language than the screen, and why it stays that way. */
export function ContentLanguage({ language, label = "content.lang", help = "content.lang.help" }: { language: string; label?: MessageKey; help?: MessageKey }) {
  const { t, lang } = useI18n();
  if (language === lang || (language !== "en" && language !== "pt-BR")) return null;
  return (
    <Tooltip content={t(help)}>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] font-medium text-muted-foreground">
        <Languages className="size-3.5" /> {t(label, { lang: t(`lang.${language}` as MessageKey) })}
      </span>
    </Tooltip>
  );
}
