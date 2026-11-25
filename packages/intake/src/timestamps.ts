const two = (n: number) => String(n).padStart(2, "0");

/** "mm<sep>ss", or "hh<sep>mm<sep>ss" from one hour on. */
export function formatTimestamp(seconds: number, separator: string): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? [two(h), two(m), two(s)].join(separator) : [two(m), two(s)].join(separator);
}

/**
 * Anchor "@t<mm>:<ss>" for a segment start. Two segments starting in the same second get
 * "@t00:05", then "@t00:05/2", so every anchor stays unique and the first one covers both.
 */
export class TimestampAnchors {
  private readonly seen = new Map<string, number>();

  next(seconds: number): { anchor: string; frameName: string } {
    const stamp = formatTimestamp(seconds, ":");
    const count = (this.seen.get(stamp) ?? 0) + 1;
    this.seen.set(stamp, count);
    const suffix = count > 1 ? `/${count}` : "";
    const frameSuffix = count > 1 ? `-${count}` : "";
    return { anchor: `@t${stamp}${suffix}`, frameName: `t${formatTimestamp(seconds, "-")}${frameSuffix}.jpg` };
  }
}
