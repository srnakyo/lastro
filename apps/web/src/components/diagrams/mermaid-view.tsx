import { Copy } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const isDark = () => document.documentElement.classList.contains("dark");

/** Mermaid keeps global state: renders run one at a time. */
let queue: Promise<unknown> = Promise.resolve();

/** Renders at the diagram's natural width (Mermaid scales it to the container), so wide diagrams scroll instead of shrinking. */
function naturalSize(svg: string): string {
  const width = /max-width:\s*([\d.]+)px/.exec(svg)?.[1];
  return width ? svg.replace(/width="100%"/, `width="${Math.ceil(Number(width))}"`).replace(/max-width:\s*[\d.]+px;?/, "") : svg;
}

async function render(id: string, source: string): Promise<string> {
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: isDark() ? "dark" : "default",
    fontFamily: "Inter Variable, ui-sans-serif, system-ui",
    flowchart: { curve: "basis", padding: 12 },
    themeVariables: { fontSize: "13px" },
  });
  return naturalSize((await mermaid.render(id, source)).svg);
}

/** Mermaid gives each flowchart node an element id like "…flowchart-<node id>-<n>": the node id is what the page maps to a link. */
function clickNode(target: EventTarget, onNodeClick: (nodeId: string) => boolean) {
  const node = (target as Element).closest?.("g.node");
  const match = node?.id ? /flowchart-(.+)-\d+$/.exec(node.id) : null;
  if (match?.[1]) onNodeClick(match[1]);
}

function enqueue(id: string, source: string): Promise<string> {
  const next = queue.then(() => render(id, source));
  queue = next.catch(() => undefined);
  return next;
}

/** Renders Mermaid source in the browser (Mermaid is loaded on demand), following the light or dark theme. `fit` shrinks a wide diagram to the container instead of scrolling. */
export function MermaidView({ source, className, minHeight = 160, fit = false, onNodeClick }: { source: string; className?: string; minHeight?: number; fit?: boolean; onNodeClick?: (nodeId: string) => boolean }) {
  const { t } = useI18n();
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    enqueue(`m${id}`, source).then(
      (out) => alive && setSvg(out),
      (e: Error) => alive && setError(e.message),
    );
    return () => {
      alive = false;
    };
  }, [source, id]);
  return (
    <div className={cn("group relative", className)}>
      <Button size="sm" variant="ghost" className="absolute right-0 top-0 z-10 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100" onClick={() => void navigator.clipboard.writeText(source).then(() => toast.success(t("diagrams.copied")))}>
        <Copy /> {t("diagrams.copy")}
      </Button>
      {error ? (
        <pre className="overflow-auto rounded-md bg-muted p-3 font-mono text-[11.5px] text-destructive">{error}</pre>
      ) : svg ? (
        <div
          className={cn("overflow-x-auto [&_svg]:mx-auto [&_svg]:block [&_svg]:h-auto", fit && "[&_svg]:max-w-full", onNodeClick && "[&_g.node]:cursor-pointer")}
          onClick={onNodeClick ? (e) => clickNode(e.target, onNodeClick) : undefined}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div style={{ height: minHeight }}><Skeleton className="size-full" /></div>
      )}
    </div>
  );
}
