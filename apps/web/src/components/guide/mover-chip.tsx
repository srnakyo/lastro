import { Bot, ShieldCheck, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { Mover } from "@/lib/lifecycle";
import { cn } from "@/lib/utils";

/** One colour per actor, used by the chip and by the steps of the path. */
export const MOVER: Record<Mover, { icon: typeof User; chip: string; node: string; bar: string; text: string; label: "guide.who.you" | "guide.who.agent" | "guide.who.lastro" }> = {
  you: { icon: User, chip: "bg-primary/10 text-primary", node: "border-primary bg-primary/10 text-primary", bar: "bg-primary", text: "text-primary", label: "guide.who.you" },
  agent: { icon: Bot, chip: "bg-violet-500/10 text-violet-600 dark:text-violet-400", node: "border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400", bar: "bg-violet-500", text: "text-violet-600 dark:text-violet-400", label: "guide.who.agent" },
  lastro: { icon: ShieldCheck, chip: "bg-success/12 text-success", node: "border-success bg-success/12 text-success", bar: "bg-success", text: "text-success", label: "guide.who.lastro" },
};

/** Who moves a requirement forward: you, the agent or Lastro itself. */
export function MoverChip({ who, className }: { who: Mover; className?: string }) {
  const { t } = useI18n();
  const s = MOVER[who];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold", s.chip, className)}>
      <s.icon className="size-3.5" /> {t(s.label)}
    </span>
  );
}
