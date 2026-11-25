import { Activity, BookOpen, Bot, Bug, FileText, FlaskConical, GitBranch, LayoutDashboard, ListChecks, Quote, ScrollText, Settings } from "lucide-react";
import type { MessageKey } from "@/lib/i18n";

export interface NavItem {
  to: string;
  label: MessageKey;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}

export interface NavGroup {
  label: MessageKey;
  items: NavItem[];
}

/** Project navigation. Paths are relative to /projects/$key. */
export const PROJECT_NAV: NavGroup[] = [
  {
    label: "nav.group.project",
    items: [
      { to: "", label: "nav.overview", icon: LayoutDashboard, exact: true },
      { to: "/requirements", label: "nav.requirements", icon: ListChecks },
      { to: "/sources", label: "nav.sources", icon: Quote },
    ],
  },
  {
    label: "nav.group.quality",
    items: [
      { to: "/tests", label: "nav.tests", icon: FlaskConical },
      { to: "/runs", label: "nav.runs", icon: Activity },
      { to: "/bugs", label: "nav.bugs", icon: Bug },
      { to: "/diagrams", label: "nav.diagrams", icon: GitBranch },
    ],
  },
  {
    label: "nav.group.knowledge",
    items: [
      { to: "/docs", label: "nav.docs", icon: FileText },
      { to: "/glossary", label: "nav.glossary", icon: BookOpen },
      { to: "/agents", label: "nav.agents", icon: Bot },
    ],
  },
  {
    label: "nav.group.admin",
    items: [
      { to: "/audit", label: "nav.audit", icon: ScrollText },
      { to: "/settings", label: "nav.settings", icon: Settings },
    ],
  },
];
