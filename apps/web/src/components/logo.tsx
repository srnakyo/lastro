import { cn } from "@/lib/utils";

/** The mark: an L that closes with a check, the item that only counts once it is backed. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7 shrink-0", className)} aria-hidden="true">
      <rect width="32" height="32" rx="7" className="fill-primary" />
      <path d="M9 7v18h14" stroke="white" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 18l3 3 6-7" stroke="#5be39a" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className, collapsed = false }: { className?: string; collapsed?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!collapsed && <span className="text-[17px] font-semibold tracking-tight">lastro</span>}
    </span>
  );
}
