import { Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { RichText } from "@/lib/rich-text";
import { GuideSection } from "./guide-section";

interface Step {
  title: MessageKey;
  body: MessageKey;
  command?: (origin: string, key: string) => string;
}

const STEPS: Step[] = [
  { title: "guide.connect.project", body: "guide.connect.project.body", command: (origin) => `lastro login --url ${origin}` },
  { title: "guide.connect.login", body: "guide.connect.login.body", command: (_origin, key) => `lastro init ${key}` },
  { title: "guide.connect.init", body: "guide.connect.init.body" },
];

/** From a machine to a project the AI works in: the login, "let's use Lastro", and following it here. */
export function GuideConnect({ projectKey }: { projectKey?: string }) {
  const { t } = useI18n();
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return (
    <GuideSection id="connect" lead="guide.connect.lead">
      <ol className="grid gap-4 lg:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title}>
            <Card className="h-full p-5">
              <p className="text-[12px] font-semibold text-muted-foreground">{i + 1}</p>
              <h3 className="mt-1 text-[15px] font-semibold">{t(step.title)}</h3>
              {step.command && <pre className="mt-3 overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-[12px]">{step.command(origin, projectKey ?? "<key>")}</pre>}
              <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground"><RichText text={t(step.body)} /></p>
            </Card>
          </li>
        ))}
      </ol>
      <p className="mt-3 flex items-start gap-2 text-[12.5px] leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" /> <span><RichText text={t("guide.connect.why")} /></span>
      </p>
    </GuideSection>
  );
}
