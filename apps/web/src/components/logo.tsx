import { BRAND, type BrandShape } from "@lastro/shared/brand";
import { cn } from "@/lib/utils";

/** Draws one brand shape in the current text colour, at its drawn pixel size unless a class resizes it. */
function Shape({ shape, className }: { shape: BrandShape; className?: string }) {
  return (
    <svg viewBox={`0 0 ${shape.width} ${shape.height}`} width={shape.width} height={shape.height} className={cn("block shrink-0", className)} fill="currentColor" aria-hidden="true">
      {shape.paths.map((d) => (
        <path key={d.slice(0, 24)} d={d} />
      ))}
    </svg>
  );
}

/** The symbol alone, fitted to the pixel grid at 28 px: the collapsed sidebar. Keep it 1:1 on a whole pixel. */
export function LogoMark({ className }: { className?: string }) {
  return <Shape shape={BRAND.mark28} className={className} />;
}

/** The signature. `sidebar` is the 127 x 30 pixel-fitted version, drawn 1:1 on whole pixels; `large` is the master for sign-in. */
export function Logo({ className, collapsed = false, size = "sidebar" }: { className?: string; collapsed?: boolean; size?: "sidebar" | "large" }) {
  return (
    <span className={cn("inline-flex text-foreground", className)}>
      <span className="sr-only">Lastro</span>
      {collapsed ? <LogoMark /> : size === "large" ? <Shape shape={BRAND.lockup} className="h-9 w-auto" /> : <Shape shape={BRAND.lockupSidebar} />}
    </span>
  );
}
