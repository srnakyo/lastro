import type { Hallmark, LinkState } from "@lastro/shared";
import { Tooltip } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LINKS = ["origin", "spec", "acceptance", "evidence"] as const;
const DOT: Record<LinkState, string> = { ok: "bg-success", partial: "bg-warning", missing: "bg-muted-foreground/25 ring-1 ring-inset ring-muted-foreground/30" };

/** Four dots: origin, spec, acceptance, evidence. */
export function HallmarkDots({ hallmark }: { hallmark: Hallmark }) {
  const { t } = useI18n();
  const label = LINKS.map((l) => `${t(`link.${l}`)}: ${t(`link.state.${hallmark[l]}`)}`).join(" · ");
  return (
    <Tooltip content={label}>
      <span className="inline-flex gap-1" role="img" aria-label={label}>
        {LINKS.map((l) => (
          <span key={l} className={cn("size-2.5 rounded-full", DOT[hallmark[l]])} />
        ))}
      </span>
    </Tooltip>
  );
}

/** The four links side by side with what each one means. */
export function HallmarkPanel({ hallmark }: { hallmark: Hallmark }) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border lg:grid-cols-4">
      {LINKS.map((l) => (
        <div key={l} className="flex gap-3 bg-card p-4">
          <span className={cn("mt-1 size-3 shrink-0 rounded-full", DOT[hallmark[l]])} />
          <div>
            <p className="text-[13px] font-semibold">
              {t(`link.${l}`)} <span className="ml-1 font-normal text-muted-foreground">· {t(`link.state.${hallmark[l]}`)}</span>
            </p>
            <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{t(`link.help.${l}`)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
