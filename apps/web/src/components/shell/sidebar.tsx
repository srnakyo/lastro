import { Link, useRouterState } from "@tanstack/react-router";
import { CircleHelp, FolderKanban } from "lucide-react";
import { Logo } from "@/components/logo";
import { Tooltip } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { PROJECT_NAV, type NavItem } from "./nav";
import { useNavBadges, type BadgeCount } from "./nav-badges";

const TONE = { warning: "bg-warning/15 text-warning", danger: "bg-destructive/12 text-destructive" };
const DOT = { warning: "bg-warning", danger: "bg-destructive" };

function Item({ href, item, active, collapsed, badge }: { href: string; item: Pick<NavItem, "label" | "icon">; active: boolean; collapsed: boolean; badge?: BadgeCount }) {
  const { t } = useI18n();
  const Icon = item.icon;
  const count = badge && badge.n > 0 ? badge : undefined;
  const hint = count ? t(count.tone === "danger" ? "nav.failing" : "nav.waiting", { n: count.n }) : undefined;
  const link = (
    <Link
      to={href as never}
      aria-current={active ? "page" : undefined}
      aria-label={hint ? `${t(item.label)}, ${hint}` : undefined}
      className={cn(
        "relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] font-medium transition-colors",
        active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon className="size-[18px] shrink-0" />
      {!collapsed && <span className="flex-1 truncate">{t(item.label)}</span>}
      {count && !collapsed && <span className={cn("tabular rounded-full px-1.5 py-px text-[11px] font-semibold", TONE[count.tone])}>{count.n}</span>}
      {count && collapsed && <span className={cn("absolute right-3 top-1.5 size-2 rounded-full ring-2 ring-sidebar", DOT[count.tone])} />}
    </Link>
  );
  if (collapsed) return <Tooltip content={hint ? `${t(item.label)} · ${hint}` : t(item.label)} side="right">{link}</Tooltip>;
  return hint ? <Tooltip content={hint} side="right">{link}</Tooltip> : link;
}

export function Sidebar({ projectKey, collapsed }: { projectKey: string | null; collapsed: boolean }) {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const badges = useNavBadges(projectKey);
  const base = projectKey ? `/projects/${projectKey}` : "";
  return (
    <aside className={cn("sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-sidebar transition-[width] duration-200 md:flex", collapsed ? "w-[60px]" : "w-64")}>
      {/* The signatures are fitted to the pixel grid and drawn 1:1 at whole-pixel offsets: the 32 px lockup at 12, the 28 px mark at 13. */}
      <div className={cn("flex h-14 items-start border-b", collapsed ? "pl-[15px] pt-[13px]" : "px-4 pt-3")}>
        <Link to="/" aria-label="Lastro" className="flex">
          <Logo collapsed={collapsed} />
        </Link>
      </div>
      <nav className="scrollbar-thin flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-3" aria-label="Main">
        <Item href="/" item={{ label: "nav.home", icon: FolderKanban }} active={pathname === "/"} collapsed={collapsed} />
        {projectKey &&
          PROJECT_NAV.map((group, i) => (
            <div key={group.label ?? i} className={group.label ? "mt-5" : "mt-0.5"}>
              {group.label && !collapsed && <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t(group.label)}</p>}
              {group.label && collapsed && <div className="mx-2.5 mb-2 border-t" />}
              <div className="grid gap-0.5">
                {group.items.map((item) => {
                  const href = `${base}${item.to}`;
                  const active = item.exact ? pathname === href : pathname.startsWith(href);
                  return <Item key={item.to} href={href} item={item} active={active} collapsed={collapsed} badge={item.badge ? badges[item.badge] : undefined} />;
                })}
              </div>
            </div>
          ))}
      </nav>
      <div className="border-t px-2.5 py-2.5">
        <Item href={`${base}/guide`} item={{ label: "nav.guide", icon: CircleHelp }} active={pathname.endsWith("/guide")} collapsed={collapsed} />
      </div>
    </aside>
  );
}
