import type { LinkState } from "@lastro/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

const LINKS = ["origin", "spec", "acceptance", "evidence"] as const;

/** For each of the four backing links: how many requirements have it, partly have it, or miss it. */
export function BackingCard({ links, total }: { links: Record<(typeof LINKS)[number], Record<LinkState, number>>; total: number }) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("overview.backing")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3.5">
        {LINKS.map((l) => {
          const v = links[l];
          return (
            <div key={l} className="grid grid-cols-[92px_1fr] items-center gap-3">
              <span className="text-[12.5px] font-medium">{t(`link.${l}`)}</span>
              <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${v.ok} ok, ${v.partial} partial, ${v.missing} missing of ${total}`}>
                <div className="bg-success" style={{ flexGrow: v.ok }} />
                <div className="bg-warning" style={{ flexGrow: v.partial }} />
                <div className="bg-destructive/70" style={{ flexGrow: v.missing }} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
