import { values } from "../values";
import { label, nodeId } from "./mermaid";

export interface ModuleItem {
  code: string;
  title: string;
  status: string;
  module: string;
}

const CLASS: Record<string, string> = {
  captured: "todo", specified: "todo", approved: "ready", building: "doing", reopened: "bad",
  verified: "done", previewed: "done", delivered: "done", accepted: "done", dropped: "off",
};

/** Requirements grouped by module, one box per module, each requirement colored by its state. */
export function moduleMapDiagram(items: ModuleItem[], lang: "en" | "pt-BR" = "en"): string {
  const v = values(lang);
  const modules = new Map<string, ModuleItem[]>();
  for (const i of items) modules.set(i.module, [...(modules.get(i.module) ?? []), i]);
  const lines = ["flowchart LR"];
  for (const [name, reqs] of [...modules.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`  subgraph ${nodeId("m", name)}["${label(name)}"]`, "    direction TB");
    for (const r of reqs) lines.push(`    ${nodeId("r", r.code)}["${label(`${r.code} · ${v.of("status", r.status)}`)}"]:::${CLASS[r.status] ?? "todo"}`);
    lines.push("  end");
  }
  lines.push(
    "  classDef todo fill:#64748b1a,stroke:#64748b,color:#64748b",
    "  classDef ready fill:#2563eb1a,stroke:#2563eb,color:#2563eb",
    "  classDef doing fill:#d9770622,stroke:#d97706,color:#d97706",
    "  classDef bad fill:#e11d4822,stroke:#e11d48,color:#e11d48",
    "  classDef done fill:#16a34a22,stroke:#16a34a,color:#16a34a",
    "  classDef off fill:#94a3b81a,stroke:#94a3b8,color:#94a3b8,stroke-dasharray:4 3",
  );
  return lines.join("\n");
}
