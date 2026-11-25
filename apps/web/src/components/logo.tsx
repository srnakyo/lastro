import { BRAND, type BrandShape } from "@lastro/shared/brand";
import { cn } from "@/lib/utils";

/** Draws one brand shape in the current text colour; the class sets its size. */
function Shape({ shape, className }: { shape: BrandShape; className?: string }) {
  return (
    <svg viewBox={`0 0 ${shape.width} ${shape.height}`} className={cn("block shrink-0", className)} fill="currentColor" aria-hidden="true">
      {shape.paths.map((d) => (
        <path key={d.slice(0, 24)} d={d} />
      ))}
    </svg>
  );
}

/** The symbol alone, 28 px by default: the collapsed sidebar and other small slots. */
export function LogoMark({ className }: { className?: string }) {
  return <Shape shape={BRAND.mark} className={cn("size-7", className)} />;
}

/** The signature, symbol and word. `sidebar` fits the 56 px dashboard header; `large` is for roomier places like sign-in. */
export function Logo({ className, collapsed = false, size = "sidebar" }: { className?: string; collapsed?: boolean; size?: "sidebar" | "large" }) {
  return (
    <span className={cn("inline-flex text-foreground", className)}>
      <span className="sr-only">Lastro</span>
      {collapsed ? <LogoMark /> : <Shape shape={BRAND.lockup} className={cn("w-auto", size === "large" ? "h-9" : "h-[23px]")} />}
    </span>
  );
}
