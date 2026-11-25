import { cn } from "@/lib/utils";

/** A thin bar for a percentage; the colour follows the value unless a tone is given. */
export function Progress({ value, className, tone }: { value: number; className?: string; tone?: "success" | "warning" | "danger" | "primary" }) {
  const auto = value >= 90 ? "success" : value >= 60 ? "warning" : "danger";
  const colour = { success: "bg-success", warning: "bg-warning", danger: "bg-destructive", primary: "bg-primary" }[tone ?? auto];
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full transition-[width] duration-500", colour)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
