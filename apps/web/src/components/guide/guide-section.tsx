import type { ReactNode } from "react";
import { useI18n, type MessageKey } from "@/lib/i18n";

/** The sections of the guide, in order: their anchors feed the table of contents. */
export const GUIDE_SECTIONS: { id: string; title: MessageKey }[] = [
  { id: "path", title: "guide.path.title" },
  { id: "proofs", title: "guide.proofs.title" },
  { id: "roles", title: "guide.roles.title" },
  { id: "terms", title: "guide.terms.title" },
  { id: "map", title: "guide.map.title" },
];

/** A numbered section of the guide with its anchor. */
export function GuideSection({ id, lead, aside, children }: { id: string; lead?: MessageKey; aside?: ReactNode; children: ReactNode }) {
  const { t } = useI18n();
  const index = GUIDE_SECTIONS.findIndex((s) => s.id === id);
  const section = GUIDE_SECTIONS[index];
  return (
    <section id={id} className="scroll-mt-20 border-t pt-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="tabular flex size-7 shrink-0 items-center justify-center rounded-lg bg-foreground text-[13px] font-bold text-background">{index + 1}</span>
          <div>
            <h2 className="text-[18px] font-bold leading-7 tracking-tight">{section ? t(section.title) : null}</h2>
            {lead && <p className="mt-0.5 max-w-[78ch] text-[13.5px] leading-relaxed text-muted-foreground">{t(lead)}</p>}
          </div>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}
