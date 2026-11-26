import { Link } from "@tanstack/react-router";
import { PROJECT_NAV } from "@/components/shell/nav";
import { Card } from "@/components/ui/card";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { GuideSection } from "./guide-section";

const BODY: Record<string, MessageKey> = {
  "nav.group.request": "guide.map.request",
  "nav.group.proof": "guide.map.proof",
  "nav.group.delivery": "guide.map.delivery",
  "nav.group.project": "guide.map.project",
};

/** Each group of the menu with its real items; inside a project every item opens its page. */
export function GuideMap({ projectKey }: { projectKey?: string }) {
  const { t } = useI18n();
  const groups = PROJECT_NAV.filter((g) => g.label && BODY[g.label]);
  return (
    <GuideSection id="map" lead="guide.map.lead">
      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
        {groups.map((g) => (
          <Card key={g.label} className="flex flex-col p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t(g.label as MessageKey)}</p>
            <p className="mt-1.5 text-[13px] leading-snug">{t(BODY[g.label as string] as MessageKey)}</p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {g.items.map((item) => {
                const body = (
                  <>
                    <item.icon className="size-3.5 text-muted-foreground" /> {t(item.label)}
                  </>
                );
                return (
                  <li key={item.to}>
                    {projectKey ? (
                      <Link to={`/projects/${projectKey}${item.to}` as never} className="inline-flex items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-[12.5px] font-medium transition-colors hover:border-primary/40 hover:bg-accent">
                        {body}
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[12.5px] font-medium">{body}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>
    </GuideSection>
  );
}
