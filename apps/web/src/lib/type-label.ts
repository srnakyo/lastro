import { en, type MessageKey } from "./i18n/messages";
import type { Translate } from "./i18n";

/** A requirement type in plain words when Lastro knows it; a project's own type keeps its name. */
export function typeLabel(t: Translate, type: string): string {
  const key = `type.${type}`;
  return key in en ? t(key as MessageKey) : type;
}
