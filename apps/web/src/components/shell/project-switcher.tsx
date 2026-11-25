import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronsUpDown, FolderKanban } from "lucide-react";
import { useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/lib/i18n";

/** Searchable switch between the projects of the workspace; keeps the page the person is on. */
export function ProjectSwitcher({ current, projects, section }: { current: { key: string; name: string }; projects: { key: string; name: string }[]; section: string }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-8 max-w-[260px] cursor-pointer items-center gap-2 rounded-md px-2 text-[13.5px] font-semibold hover:bg-accent"
          aria-label={t("switcher.placeholder")}
        >
          <span className="truncate">{current.name}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0">
        <Command>
          <CommandInput placeholder={t("switcher.placeholder")} />
          <CommandList>
            <CommandEmpty>{t("switcher.empty")}</CommandEmpty>
            <CommandGroup>
              {projects.map((p) => (
                <CommandItem
                  key={p.key}
                  value={`${p.name} ${p.key}`}
                  onSelect={() => {
                    setOpen(false);
                    void navigate({ to: `/projects/${p.key}${section}` as never });
                  }}
                >
                  <FolderKanban className="text-muted-foreground" />
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{p.key}</span>
                  {p.key === current.key && <Check className="text-primary" />}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup>
              <CommandItem onSelect={() => void navigate({ to: "/" })}>{t("switcher.all")}</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
