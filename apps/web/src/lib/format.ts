import type { Lang } from "./i18n";

export function formatDateTime(value: string | Date, lang: Lang): string {
  return new Intl.DateTimeFormat(lang, { dateStyle: "short", timeStyle: "short", timeZone: "UTC" }).format(new Date(value));
}

export function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms} ms`;
  const s = Math.round(ms / 100) / 10;
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`;
}
