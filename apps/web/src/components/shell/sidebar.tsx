import { Link, useRouterState } from "@tanstack/react-router";
import { FolderKanban } from "lucide-react";
import { Logo } from "@/components/logo";
import { Tooltip } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { PROJECT_NAV, type NavItem } from "./nav";

function Item({ href, item, active, collapsed }: { href: string; item: Pick<NavItem, "label" | "icon">; active: boolean; collapsed: boolean }) {
  const { t } = useI18n();
  const Icon = item.icon;
  const link = (
    <Link
      to={href as never}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] font-medium transition-colors",
        active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon className="size-[18px] shrink-0" />
      {!collapsed && <span className="truncate">{t(item.label)}</span>}
    </Link>
  );
  return collapsed ? <Tooltip content={t(item.label)} side="right">{link}</Tooltip> : link;
}

export function Sidebar({ projectKey, collapsed }: { projectKey: string | null; collapsed: boolean }) {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const base = projectKey ? `/projects/${projectKey}` : "";
  return (
    <aside className={cn("sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-sidebar transition-[width] duration-200 md:flex", collapsed ? "w-[60px]" : "w-64")}>
      <div className={cn("flex h-14 items-center border-b px-4", collapsed && "justify-center px-0")}>
        <Link to="/" aria-label="Lastro">
          <Logo collapsed={collapsed} />
        </Link>
      </div>
      <nav className="scrollbar-thin flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3" aria-label="Main">
        <Item href="/" item={{ label: "nav.home", icon: FolderKanban }} active={pathname === "/"} collapsed={collapsed} />
        {projectKey &&
          PROJECT_NAV.map((group) => (
            <div key={group.label} className="mt-5">
              {!collapsed && <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t(group.label)}</p>}
              <div className="grid gap-0.5">
                {group.items.map((item) => {
                  const href = `${base}${item.to}`;
                  const active = item.exact ? pathname === href : pathname.startsWith(href);
                  return <Item key={item.to} href={href} item={item} active={active} collapsed={collapsed} />;
                })}
              </div>
            </div>
          ))}
      </nav>
    </aside>
  );
}
