import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start", className)}>
      <div className="min-w-0">
        <h1 className="text-[22px] font-bold leading-tight tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-[72ch] text-[13.5px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 lg:justify-end">{actions}</div>}
    </div>
  );
}
