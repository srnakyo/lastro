/** Prints rows as aligned columns. */
export function table(rows: string[][]) {
  if (rows.length === 0) return;
  const widths = rows[0]?.map((_, i) => Math.max(...rows.map((r) => (r[i] ?? "").length))) ?? [];
  for (const row of rows) console.log(row.map((cell, i) => cell.padEnd(widths[i] ?? 0)).join("  ").trimEnd());
}

export const json = (value: unknown) => console.log(JSON.stringify(value, null, 2));
