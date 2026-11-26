import { en, type MessageKey, type Translate } from "./i18n/messages";

/** A requirement type in plain words when Lastro knows it; a project's own type keeps its name. */
export function typeLabel(t: Translate, type: string): string {
  const key = `type.${type}`;
  return key in en ? t(key as MessageKey) : type;
}

/** A test level in plain words when Lastro knows it; a project's own level keeps its name. */
export function levelLabel(t: Translate, level: string): string {
  const key = `level.${level}`;
  return key in en ? t(key as MessageKey) : level;
}

const LEVEL_ORDER = ["unit", "integration", "e2e"];

/** Test levels from the fastest to the widest; a project's own levels come after, by name. */
export function orderedLevels(levels: Iterable<string>): string[] {
  const rank = (l: string) => (LEVEL_ORDER.includes(l) ? LEVEL_ORDER.indexOf(l) : LEVEL_ORDER.length);
  return [...levels].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}
