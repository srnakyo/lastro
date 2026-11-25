import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  passed: "bg-success",
  failed: "bg-destructive",
  error: "bg-destructive",
  skipped: "bg-muted-foreground/40",
};

/** One result as a small square; the history strip lines them up oldest to newest. */
export function ResultDot({ status, title }: { status: string; title?: string }) {
  return <span title={title ?? status} className={cn("inline-block size-2.5 rounded-[3px]", TONE[status] ?? "bg-muted")} />;
}

export function HistoryStrip({ statuses }: { statuses: { status: string; title: string }[] }) {
  return (
    <span className="inline-flex items-center gap-[3px]" aria-label={statuses.map((s) => s.status).join(", ")}>
      {statuses.map((s, i) => (
        <ResultDot key={i} status={s.status} title={s.title} />
      ))}
    </span>
  );
}
