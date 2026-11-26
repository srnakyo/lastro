import { Check, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useI18n, type MessageKey } from "@/lib/i18n";
import type { Mover } from "@/lib/lifecycle";
import { cn } from "@/lib/utils";
import { GuideSection } from "./guide-section";
import { MOVER } from "./mover-chip";

const ROLES: { who: Mover; title: MessageKey; items: MessageKey[] }[] = [
  { who: "you", title: "guide.roles.you", items: ["guide.roles.you.1", "guide.roles.you.2", "guide.roles.you.3", "guide.roles.you.4", "guide.roles.you.5"] },
  { who: "agent", title: "guide.roles.agent", items: ["guide.roles.agent.1", "guide.roles.agent.2", "guide.roles.agent.3"] },
  { who: "lastro", title: "guide.roles.lastro", items: ["guide.roles.lastro.1", "guide.roles.lastro.2", "guide.roles.lastro.3"] },
];

/** You, the agent and Lastro side by side, each in its colour. */
export function GuideRoles() {
  const { t } = useI18n();
  return (
    <GuideSection id="roles">
      <div className="grid gap-4 lg:grid-cols-3">
        {ROLES.map((role) => {
          const m = MOVER[role.who];
          return (
            <Card key={role.who} className="overflow-hidden">
              <div className={cn("h-1", m.bar)} />
              <div className="p-5">
                <div className="flex items-center gap-2.5">
                  <span className={cn("flex size-9 items-center justify-center rounded-xl", m.chip)}>
                    <m.icon className="size-[18px]" />
                  </span>
                  <h3 className="text-[15px] font-semibold">{t(role.title)}</h3>
                </div>
                <ul className="mt-4 grid gap-2.5">
                  {role.items.map((item) => (
                    <li key={item} className="flex gap-2 text-[13px] leading-snug">
                      <Check className={cn("mt-0.5 size-4 shrink-0", m.text)} />
                      {t(item)}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          );
        })}
      </div>
      <p className="mt-3 flex items-start gap-2 text-[12.5px] text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" /> {t("guide.roles.note")}
      </p>
    </GuideSection>
  );
}
