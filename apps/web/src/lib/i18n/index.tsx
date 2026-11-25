import { createContext, useContext, type ReactNode } from "react";
import { en, type MessageKey } from "./en";
import { ptBR } from "./pt-BR";

export type Lang = "en" | "pt-BR";
const DICTIONARIES: Record<Lang, Record<MessageKey, string>> = { en, "pt-BR": ptBR };

export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

const I18nContext = createContext<{ lang: Lang; t: Translate }>({ lang: "en", t: (k) => en[k] });

export function toLang(value: string | null | undefined): Lang {
  return value === "pt-BR" ? "pt-BR" : "en";
}

export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const t: Translate = (key, vars) => {
    let text = DICTIONARIES[lang][key];
    for (const [name, value] of Object.entries(vars ?? {})) text = text.replaceAll(`{${name}}`, String(value));
    return text;
  };
  return <I18nContext.Provider value={{ lang, t }}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
export type { MessageKey };
