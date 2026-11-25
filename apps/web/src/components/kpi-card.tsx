import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "primary" | "success" | "warning" | "danger";

const TILE: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
};

export function KpiCard({ label, value, hint, icon, tone = "neutral" }: { label: string; value: ReactNode; hint?: ReactNode; icon: ReactNode; tone?: Tone }) {
  return (
    <Card className="flex items-start gap-4 p-5">
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-lg [&>svg]:size-5", TILE[tone])}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-muted-foreground">{label}</p>
        <p className={cn("tabular mt-1 text-[26px] font-bold leading-none tracking-tight", tone === "danger" && "text-destructive")}>{value}</p>
        {hint && <p className="mt-2 text-[12px] text-muted-foreground">{hint}</p>}
      </div>
    </Card>
  );
}
