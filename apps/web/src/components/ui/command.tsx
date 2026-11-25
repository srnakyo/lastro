import { Command as Cmdk } from "cmdk";
import { Search } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Command({ className, ...props }: ComponentProps<typeof Cmdk>) {
  return <Cmdk className={cn("flex h-full w-full flex-col overflow-hidden rounded-lg bg-popover", className)} {...props} />;
}

export function CommandInput({ className, ...props }: ComponentProps<typeof Cmdk.Input>) {
  return (
    <div className="flex items-center gap-2 border-b px-3">
      <Search className="size-4 text-muted-foreground" />
      <Cmdk.Input className={cn("h-10 w-full bg-transparent text-[13.5px] outline-none placeholder:text-muted-foreground", className)} {...props} />
    </div>
  );
}

export function CommandList({ className, ...props }: ComponentProps<typeof Cmdk.List>) {
  return <Cmdk.List className={cn("max-h-80 overflow-y-auto p-1", className)} {...props} />;
}

export function CommandEmpty(props: ComponentProps<typeof Cmdk.Empty>) {
  return <Cmdk.Empty className="py-6 text-center text-[13px] text-muted-foreground" {...props} />;
}

export function CommandGroup({ className, ...props }: ComponentProps<typeof Cmdk.Group>) {
  return <Cmdk.Group className={cn("px-1 py-1.5 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[11.5px] [&_[cmdk-group-heading]]:text-muted-foreground", className)} {...props} />;
}

export function CommandItem({ className, ...props }: ComponentProps<typeof Cmdk.Item>) {
  return <Cmdk.Item className={cn("flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] data-[selected=true]:bg-accent [&_svg]:size-4", className)} {...props} />;
}
