import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useRouterState } from "@tanstack/react-router";
import { ChevronRight, ChevronsLeft } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { projectQuery } from "@/hooks/queries";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Viewer } from "@/fns/session";
import { CommandMenu } from "./command-menu";
import { MobileNav } from "./mobile-nav";
import { ProjectSwitcher } from "./project-switcher";
import { Sidebar } from "./sidebar";
import { UserMenu } from "./user-menu";

const COLLAPSE_KEY = "lastro.sidebar.collapsed";

function useCollapsed() {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1"), []);
  const toggle = () =>
    setCollapsed((c) => {
      localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      return !c;
    });
  return { collapsed, toggle };
}

/** Sidebar, top bar with workspace and project breadcrumbs, and the page. */
export function AppShell({ viewer, children }: { viewer: Viewer; children: ReactNode }) {
  const params = useParams({ strict: false }) as { key?: string };
  const projectKey = params.key ?? null;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const project = useQuery({ ...projectQuery(projectKey ?? ""), enabled: !!projectKey });
  const section = projectKey ? pathname.replace(`/projects/${projectKey}`, "") : "";
  const { collapsed, toggle } = useCollapsed();
  const { t } = useI18n();
  const dark = viewer.preferences.theme !== "light";

  return (
    <div className="flex min-h-screen">
      <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        Skip to content
      </a>
      <Sidebar projectKey={projectKey} collapsed={collapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-card/90 px-4 backdrop-blur md:px-6">
          <MobileNav projectKey={projectKey} />
          <button
            type="button"
            onClick={toggle}
            className="group -ml-2 hidden size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-transform hover:bg-accent hover:text-foreground active:scale-90 md:inline-flex"
            aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
          >
            <ChevronsLeft className={cn("size-4 transition-transform duration-300 ease-out group-hover:-translate-x-0.5", collapsed && "rotate-180 group-hover:translate-x-0.5")} />
          </button>
          <nav className="flex min-w-0 items-center gap-1 text-[13.5px]" aria-label="Breadcrumb">
            <Link to="/" className="truncate rounded-md px-1.5 py-1 text-muted-foreground hover:text-foreground">
              {viewer.workspace?.name}
            </Link>
            {project.data && (
              <>
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                <ProjectSwitcher current={project.data} projects={project.data.siblings} section={section} />
              </>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <CommandMenu projectKey={projectKey} />
            {viewer.user && <UserMenu user={viewer.user} dark={dark} />}
          </div>
        </header>
        <main id="content" className="flex-1 px-4 py-6 md:px-8 md:py-7">
          {/* Fluid, like the Loqivo dashboard: a wide monitor uses its width instead of a centred column. */}
          <div className="w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
