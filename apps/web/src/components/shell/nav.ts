import { Activity, BookOpen, Bot, Bug, FileText, FlaskConical, GitBranch, LayoutDashboard, ListChecks, Quote, ScrollText, Settings } from "lucide-react";
import type { MessageKey } from "@/lib/i18n";

/** What a nav item counts for the person: items waiting for them, or failing tests. */
export type NavBadge = "spec" | "bugs" | "tests";

export interface NavItem {
  to: string;
  label: MessageKey;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  badge?: NavBadge;
}

export interface NavGroup {
  label?: MessageKey;
  items: NavItem[];
}

/** Project navigation, in the order the work happens. Paths are relative to /projects/$key. */
export const PROJECT_NAV: NavGroup[] = [
  { items: [{ to: "", label: "nav.overview", icon: LayoutDashboard, exact: true }] },
  {
    label: "nav.group.request",
    items: [
      { to: "/sources", label: "nav.sources", icon: Quote },
      { to: "/requirements", label: "nav.requirements", icon: ListChecks, badge: "spec" },
      { to: "/glossary", label: "nav.glossary", icon: BookOpen },
    ],
  },
  {
    label: "nav.group.proof",
    items: [
      { to: "/tests", label: "nav.tests", icon: FlaskConical, badge: "tests" },
      { to: "/runs", label: "nav.runs", icon: Activity },
      { to: "/diagrams", label: "nav.diagrams", icon: GitBranch },
    ],
  },
  {
    label: "nav.group.delivery",
    items: [
      { to: "/docs", label: "nav.docs", icon: FileText },
      { to: "/bugs", label: "nav.bugs", icon: Bug, badge: "bugs" },
    ],
  },
  {
    label: "nav.group.project",
    items: [
      { to: "/agents", label: "nav.agents", icon: Bot },
      { to: "/audit", label: "nav.audit", icon: ScrollText },
      { to: "/settings", label: "nav.settings", icon: Settings },
    ],
  },
];
