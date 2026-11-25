import { CircleHelp } from "lucide-react";
import type { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** A small "?" that explains a term in plain words. A popover, so it opens on click and on touch, not only on hover. */
export function HelpHint({ children, className }: { children: ReactNode; className?: string }) {
  const { t } = useI18n();
  return (
    <Popover>
      <PopoverTrigger
        className={cn("inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full align-middle text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground", className)}
        aria-label={t("help.what")}
      >
        <CircleHelp className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent side="bottom" className="w-80 px-3.5 py-3 text-[12.5px] font-normal normal-case leading-relaxed tracking-normal text-foreground">
        {children}
      </PopoverContent>
    </Popover>
  );
}

/** A card or column title followed by its explanation. */
export function TitleWithHelp({ title, help }: { title: ReactNode; help: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      {title}
      <HelpHint>{help}</HelpHint>
    </span>
  );
}
