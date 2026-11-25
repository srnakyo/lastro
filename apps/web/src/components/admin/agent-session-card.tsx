import { Bot, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AgentSession } from "@/hooks/admin-queries";
import { formatDateTime } from "@/lib/format";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const KNOWN = new Set(["session.start", "session.stop", "file.edit", "tool.denied", "stop.blocked"]);
const TONE: Record<string, string> = { "tool.denied": "text-destructive", "stop.blocked": "text-warning", "file.edit": "text-primary" };

function detail(payload: unknown): string {
  const p = (payload ?? {}) as Record<string, unknown>;
  if (typeof p.file === "string") return p.file;
  if (typeof p.reason === "string") return p.reason.split("\n").slice(0, 2).join(" ");
  if (typeof p.source === "string") return p.source;
  if (p.arguments && typeof p.arguments === "object") return JSON.stringify(p.arguments).slice(0, 160);
  return "";
}

export function AgentSessionCard({ session }: { session: AgentSession }) {
  const { t, lang } = useI18n();
  const count = (kind: string) => session.events.filter((e) => e.kind === kind).length;
  const tools = session.events.filter((e) => !KNOWN.has(e.kind)).length;
  return (
    <Card>
      <details className="group">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 hover:bg-accent/40">
          <ChevronRight className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
          <span className="flex size-8 items-center justify-center rounded-lg bg-info/10 text-info"><Bot className="size-4" /></span>
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold">{session.agent}</p>
            <p className="truncate font-mono text-[11.5px] text-muted-foreground">{session.externalId.slice(0, 18)} · {formatDateTime(session.startedAt, lang)}</p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2 text-[12px]">
            <Badge>{t("agents.tools")}: {tools}</Badge>
            <Badge tone="primary">{t("agents.edits")}: {count("file.edit")}</Badge>
            <Badge tone={count("tool.denied") ? "danger" : "neutral"}>{t("agents.denied")}: {count("tool.denied")}</Badge>
            <Badge tone={count("stop.blocked") ? "warning" : "neutral"}>{t("agents.blocked")}: {count("stop.blocked")}</Badge>
          </div>
        </summary>
        <ol className="relative mx-5 mb-4 ml-[52px] border-l pl-5">
          {session.events.map((e) => (
            <li key={e.id} className="relative py-1.5">
              <span className="absolute -left-[25px] top-3 size-2 rounded-full bg-border" />
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="font-mono text-[11.5px] text-muted-foreground">{new Date(e.createdAt).toLocaleTimeString(lang)}</span>
                <span className={cn("text-[13px] font-medium", TONE[e.kind])}>{KNOWN.has(e.kind) ? t(`event.${e.kind}` as MessageKey) : e.kind}</span>
                <span className="min-w-0 break-words font-mono text-[12px] text-muted-foreground">{detail(e.payload)}</span>
              </div>
            </li>
          ))}
        </ol>
      </details>
    </Card>
  );
}
