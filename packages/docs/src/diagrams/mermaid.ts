/** Text safe inside a Mermaid node label in double quotes. */
export function label(text: string): string {
  return text.replace(/"/g, "#quot;").replace(/[<>]/g, (c) => (c === "<" ? "#lt;" : "#gt;")).replace(/\n/g, " ");
}

/** A stable Mermaid id from any string. */
export function nodeId(prefix: string, raw: string): string {
  return `${prefix}_${raw.replace(/[^A-Za-z0-9]/g, "_")}`;
}

export const STATUS_CLASSES = [
  "classDef passed fill:#16a34a22,stroke:#16a34a,color:#16a34a",
  "classDef failed fill:#e11d4822,stroke:#e11d48,color:#e11d48",
  "classDef pending fill:#64748b1a,stroke:#64748b,color:#64748b,stroke-dasharray:4 3",
  "classDef manual fill:#d9770622,stroke:#d97706,color:#d97706",
  "classDef item fill:#2563eb1a,stroke:#2563eb,color:#2563eb",
];
