import { Link } from "@tanstack/react-router";
import { CircleHelp, Menu } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { PROJECT_NAV } from "./nav";

/** Full-screen menu on phones. */
export function MobileNav({ projectKey }: { projectKey: string | null }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex size-9 cursor-pointer items-center justify-center rounded-md hover:bg-accent md:hidden" aria-label="Menu" aria-expanded={open}>
        <Menu className="size-5" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-0 h-full max-w-none translate-y-0 rounded-none border-0">
          <DialogTitle className="sr-only">Menu</DialogTitle>
          <Logo />
          <nav className="grid gap-1" onClick={() => setOpen(false)}>
            <Link to="/" className="flex h-11 items-center rounded-md px-3 text-[15px] hover:bg-accent">
              {t("nav.home")}
            </Link>
            {projectKey &&
              PROJECT_NAV.map((group, i) => (
                <div key={group.label ?? i} className="grid gap-1">
                  {group.label && <p className="mt-3 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t(group.label)}</p>}
                  {group.items.map((item) => (
                    <Link key={item.to} to={`/projects/${projectKey}${item.to}` as never} className="flex h-11 items-center gap-3 rounded-md px-3 text-[15px] hover:bg-accent">
                      <item.icon className="size-[18px] text-muted-foreground" /> {t(item.label)}
                    </Link>
                  ))}
                </div>
              ))}
            <Link to={(projectKey ? `/projects/${projectKey}/guide` : "/guide") as never} className="mt-3 flex h-11 items-center gap-3 rounded-md border-t px-3 pt-px text-[15px] hover:bg-accent">
              <CircleHelp className="size-[18px] text-muted-foreground" /> {t("nav.guide")}
            </Link>
          </nav>
        </DialogContent>
      </Dialog>
    </>
  );
}
