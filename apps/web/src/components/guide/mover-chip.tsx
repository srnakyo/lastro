import { Bot, ShieldCheck, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { Mover } from "@/lib/lifecycle";
import { cn } from "@/lib/utils";

const STYLE: Record<Mover, { icon: typeof User; className: string; label: "guide.who.you" | "guide.who.agent" | "guide.who.lastro" }> = {
  you: { icon: User, className: "bg-primary/10 text-primary", label: "guide.who.you" },
  agent: { icon: Bot, className: "bg-muted text-muted-foreground", label: "guide.who.agent" },
  lastro: { icon: ShieldCheck, className: "bg-success/12 text-success", label: "guide.who.lastro" },
};

/** Who moves a requirement forward: you, the agent or Lastro itself. */
export function MoverChip({ who, className }: { who: Mover; className?: string }) {
  const { t } = useI18n();
  const s = STYLE[who];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold", s.className, className)}>
      <s.icon className="size-3.5" /> {t(s.label)}
    </span>
  );
}
