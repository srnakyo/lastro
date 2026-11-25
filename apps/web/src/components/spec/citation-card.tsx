import { Link } from "@tanstack/react-router";
import { CircleAlert, CircleCheck } from "lucide-react";
import { useEffect, useRef } from "react";
import { RichText } from "@/lib/rich-text";
import { Markdown } from "@/components/common/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface CitationData {
  position: number;
  anchor: string;
  label: string | null;
  quote: string;
  found: boolean;
  passageAnchor: string | null;
  confirmed: boolean;
  source: { code: string; kind: string; machineTranscript: boolean };
  passages: { anchor: string; heading: string | null; text: string }[];
  sourceFinal: boolean;
  sourceVersion: number | null;
}

/** The quote next to the source passages its anchor covers, with the matching passage marked. */
export function CitationCard({ projectKey, citation, onConfirm }: { projectKey: string; citation: CitationData; onConfirm?: () => void }) {
  const { t } = useI18n();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current?.querySelector<HTMLElement>("[data-match]");
    if (box.current && el) box.current.scrollTop = Math.max(0, el.offsetTop - box.current.offsetTop - 16);
  }, [citation.passageAnchor]);
  return (
    <Card className="grid overflow-hidden lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="border-b p-5 lg:border-b-0 lg:border-r">
        <p className="text-[12px] text-muted-foreground">{t("req.detail.quote")}</p>
        <blockquote className="mt-2 border-l-[3px] border-primary pl-3 text-[15px] leading-relaxed"><RichText text={citation.quote} /></blockquote>
        <p className="mt-3 font-mono text-[11.5px] text-muted-foreground">
          <Link to="/projects/$key/sources/$code" params={{ key: projectKey, code: citation.source.code }} className="hover:text-primary">
            {citation.source.code}
          </Link>{" "}
          {citation.anchor} {citation.label && <span className="font-sans">({citation.label})</span>}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone={citation.found ? "success" : "danger"}>
            {citation.found ? <CircleCheck className="size-3.5" /> : <CircleAlert className="size-3.5" />}
            {citation.found ? t("req.detail.found") : t("req.detail.notFound")}
          </Badge>
          <Badge tone={citation.sourceFinal ? "success" : "warning"}>
            v{citation.sourceVersion ?? "?"} · {citation.sourceFinal ? t("src.final") : t("src.draft")}
          </Badge>
        </div>
        {citation.source.machineTranscript && !citation.confirmed && (
          <div className="mt-3 rounded-md border border-warning/30 bg-warning/10 p-3 text-[12.5px]">
            {t("req.detail.transcript")}
            {onConfirm && (
              <Button size="sm" variant="outline" className="mt-2" onClick={onConfirm}>
                {t("req.detail.confirmQuote")}
              </Button>
            )}
          </div>
        )}
      </div>
      <div ref={box} className="relative max-h-[420px] overflow-y-auto bg-muted/30 p-5">
        <p className="text-[12px] text-muted-foreground">{t("req.detail.inSource")}</p>
        <div className="mt-2 grid gap-2">
          {citation.passages.map((p) => (
            <div key={p.anchor} data-match={p.anchor === citation.passageAnchor ? "" : undefined} className={cn("rounded-md px-3 py-2", p.anchor === citation.passageAnchor ? "bg-warning/15 ring-1 ring-warning/40" : "text-muted-foreground")}>
              <Markdown text={p.text} projectKey={projectKey} />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
