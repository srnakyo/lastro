import { values } from "@lastro/docs";
import { en } from "@/lib/i18n/messages";
import { useI18n, type MessageKey, type Translate } from "@/lib/i18n";

const has = (key: string): key is MessageKey => key in en;

/** A stored value in words where the field says what kind of code it is; anything else as stored. */
function valueText(t: Translate, words: ReturnType<typeof values>, field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.map((v) => valueText(t, words, field, v)).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  const v = String(value);
  if (field === "to" || field === "from") return words.of("status", v);
  if (field === "status") return words.of("result", v);
  if (field === "reason") return words.reason(v);
  if (field === "kind") return words.of("kind", v);
  for (const group of ["triage", "cause", "billing", "role"]) if (field === group && has(`${group}.${v}`)) return t(`${group}.${v}` as MessageKey);
  return v;
}

/** The data of an audit event as "field: value" pairs, in the screen's language. */
export function AuditData({ data }: { data: unknown }) {
  const { t, lang } = useI18n();
  if (!data || typeof data !== "object" || Object.keys(data).length === 0) return null;
  const words = values(lang);
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-0.5">
      {Object.entries(data as Record<string, unknown>).map(([field, value]) => (
        <span key={field} className="min-w-0 break-words">
          <span className="text-muted-foreground">{has(`audit.field.${field}`) ? t(`audit.field.${field}` as MessageKey) : field}:</span> <span className="text-foreground">{valueText(t, words, field, value)}</span>
        </span>
      ))}
    </span>
  );
}

/** An audit action in words, or its code when Lastro has no words for it. */
export function auditActionText(t: Translate, action: string): string {
  const key = `audit.action.${action}`;
  return has(key) ? t(key as MessageKey) : action;
}

/** What an audit event is about, in words. */
export function auditEntityText(t: Translate, entity: string): string {
  const key = `audit.entity.${entity}`;
  return has(key) ? t(key as MessageKey) : entity;
}

/** Every action Lastro records, for the audit filter. */
export const AUDIT_ACTIONS = Object.keys(en)
  .filter((k) => k.startsWith("audit.action."))
  .map((k) => k.slice("audit.action.".length));
