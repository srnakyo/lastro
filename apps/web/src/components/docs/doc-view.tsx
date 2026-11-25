import { Markdown } from "@/components/common/markdown";
import { MermaidView } from "@/components/diagrams/mermaid-view";

/** A generated document: Markdown with its ```mermaid blocks drawn as diagrams. */
export function DocView({ markdown, projectKey }: { markdown: string; projectKey: string }) {
  const parts = markdown.split(/```mermaid\n([\s\S]*?)```/g);
  return (
    <div className="grid gap-4">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <div key={i} className="rounded-lg border bg-muted/30 p-4"><MermaidView source={part.trim()} minHeight={160} /></div>
        ) : part.trim() ? (
          <Markdown key={i} text={part} projectKey={projectKey} className="prose-doc" />
        ) : null,
      )}
    </div>
  );
}
