import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { FolderKanban, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { projectsQuery } from "@/hooks/queries";
import { useI18n } from "@/lib/i18n";
import { PROJECT_NAV } from "./nav";

/** ⌘K: jump to any project, or to any page of the current project. */
export function CommandMenu({ projectKey }: { projectKey: string | null }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const projects = useQuery({ ...projectsQuery, enabled: open });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (to: string) => {
    setOpen(false);
    void navigate({ to: to as never });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-8 w-48 cursor-pointer items-center gap-2 rounded-md border bg-card px-2.5 text-[13px] text-muted-foreground hover:bg-accent lg:flex"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">{t("command.button")}</span>
        <kbd className="rounded border bg-muted px-1.5 font-mono text-[10.5px]">⌘K</kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl overflow-hidden p-0">
          <DialogTitle className="sr-only">{t("command.placeholder")}</DialogTitle>
          <Command>
            <CommandInput placeholder={t("command.placeholder")} />
            <CommandList>
              <CommandEmpty>{t("switcher.empty")}</CommandEmpty>
              {projectKey && (
                <CommandGroup heading={t("command.pages")}>
                  {PROJECT_NAV.flatMap((g) => g.items).map((item) => (
                    <CommandItem key={item.to} onSelect={() => go(`/projects/${projectKey}${item.to}`)}>
                      <item.icon className="text-muted-foreground" /> {t(item.label)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandGroup heading={t("command.projects")}>
                {(projects.data ?? []).map((p) => (
                  <CommandItem key={p.key} value={`${p.name} ${p.key}`} onSelect={() => go(`/projects/${p.key}`)}>
                    <FolderKanban className="text-muted-foreground" /> {p.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
