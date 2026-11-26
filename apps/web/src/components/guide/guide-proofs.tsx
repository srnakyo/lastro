import { SearchCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { GuideSection } from "./guide-section";

const LINKS = ["origin", "spec", "acceptance", "evidence"] as const;

/** Four dots as the requirements list shows them: the first three backed, evidence missing. */
function ExampleRow() {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-muted/30 px-4 py-3">
      <span className="font-mono text-[12px] text-muted-foreground">REQ-K7Q2M</span>
      <span className="flex-1 text-[14px] font-medium">{t("guide.proofs.example")}</span>
      <span className="flex items-center gap-1.5" aria-hidden="true">
        {LINKS.map((l, i) => (
          <span key={l} className={cn("size-3.5 rounded-full", i < 3 ? "bg-success" : "bg-muted-foreground/20 ring-1 ring-inset ring-muted-foreground/35")} />
        ))}
      </span>
      <p className="w-full text-[12.5px] text-muted-foreground">{t("guide.proofs.exampleNote")}</p>
    </div>
  );
}

/** What each of the four dots means and how Lastro checks it. */
export function GuideProofs() {
  const { t } = useI18n();
  return (
    <GuideSection id="proofs" lead="guide.proofs.lead">
      <Card className="p-5 lg:p-6">
        <ExampleRow />
        <ol className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {LINKS.map((l, i) => (
            <li key={l} className="flex flex-col rounded-xl border p-4">
              <span className="flex items-center gap-1.5" aria-hidden="true">
                {LINKS.map((x, j) => (
                  <span key={x} className={cn("rounded-full transition-all", j === i ? "size-3.5 bg-success" : "size-2.5 bg-muted-foreground/20")} />
                ))}
                <span className="tabular ml-1.5 text-[11.5px] font-semibold text-muted-foreground">{i + 1}/4</span>
              </span>
              <p className="mt-3 text-[15px] font-semibold">{t(`link.${l}`)}</p>
              <p className="mt-1 text-[13px] leading-snug">{t(`link.help.${l}`)}</p>
              <p className="mt-auto flex gap-1.5 border-t pt-3 text-[12.5px] leading-snug text-muted-foreground">
                <SearchCheck className="mt-0.5 size-3.5 shrink-0" />
                <span>{t(`guide.proofs.how.${l}` as MessageKey)}</span>
              </p>
            </li>
          ))}
        </ol>
      </Card>
    </GuideSection>
  );
}
