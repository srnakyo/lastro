import { Activity, ArrowRight, Bot, FileText, ListChecks, Settings, ShieldCheck, User } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { PATH } from "@/lib/lifecycle";
import { MoverChip } from "./mover-chip";

function Section({ title, lead, children }: { title: MessageKey; lead?: MessageKey; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <section className="mt-8">
      <h2 className="text-[16px] font-bold tracking-tight">{t(title)}</h2>
      {lead && <p className="mt-1 max-w-[80ch] text-[13px] text-muted-foreground">{t(lead)}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** The seven steps of the main path, each with who moves it there, and the reopened detour. */
export function PathSection() {
  const { t } = useI18n();
  return (
    <Section title="guide.path.title" lead="guide.path.lead">
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {PATH.map((step, i) => (
          <li key={step.status} className="relative flex flex-col gap-2 rounded-xl border bg-card p-3.5">
            <span className="tabular text-[11px] font-semibold text-muted-foreground">{i + 1}</span>
            <p className="text-[13.5px] font-semibold leading-tight">{t(`status.${step.status}`)}</p>
            <p className="flex-1 text-[12px] leading-snug text-muted-foreground">{t(`guide.path.${step.status}` as MessageKey)}</p>
            <MoverChip who={step.who} className="self-start" />
          </li>
        ))}
      </ol>
      <p className="mt-2.5 flex items-center gap-2 text-[12.5px] text-muted-foreground">
        <span className="font-semibold text-destructive">{t("status.reopened")}</span>
        <ArrowRight className="size-3.5" /> {t("guide.path.reopened")}
      </p>
    </Section>
  );
}

const LINKS = ["origin", "spec", "acceptance", "evidence"] as const;

export function ProofsSection() {
  const { t } = useI18n();
  return (
    <Section title="guide.proofs.title" lead="guide.proofs.lead">
      <div className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {LINKS.map((l, i) => (
          <div key={l} className="flex gap-3 bg-card p-4">
            <span className="flex gap-1 pt-1.5">
              {LINKS.map((x, j) => (
                <span key={x} className={j === i ? "size-2.5 rounded-full bg-success" : "size-2.5 rounded-full bg-muted-foreground/20"} />
              ))}
            </span>
            <div>
              <p className="text-[13.5px] font-semibold">{t(`link.${l}`)}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">{t(`link.help.${l}`)}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

const ROLES = [
  { title: "guide.roles.you", icon: User, items: ["guide.roles.you.1", "guide.roles.you.2", "guide.roles.you.3", "guide.roles.you.4", "guide.roles.you.5"] },
  { title: "guide.roles.agent", icon: Bot, items: ["guide.roles.agent.1", "guide.roles.agent.2", "guide.roles.agent.3"] },
  { title: "guide.roles.lastro", icon: ShieldCheck, items: ["guide.roles.lastro.1", "guide.roles.lastro.2", "guide.roles.lastro.3"] },
] as const;

export function RolesSection() {
  const { t } = useI18n();
  return (
    <Section title="guide.roles.title">
      <div className="grid gap-4 lg:grid-cols-3">
        {ROLES.map((role) => (
          <Card key={role.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <role.icon className="size-4 text-muted-foreground" /> {t(role.title)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid list-disc gap-1.5 pl-4 text-[13px] leading-snug marker:text-muted-foreground">
                {role.items.map((item) => (
                  <li key={item}>{t(item)}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  );
}

const TERMS = ["gate", "evidence", "locked", "package", "source", "run", "flaky", "orphan"] as const;

export function TermsSection() {
  const { t } = useI18n();
  return (
    <Section title="guide.terms.title">
      <Card>
        <dl className="grid divide-y md:grid-cols-2 md:divide-y-0">
          {TERMS.map((term) => (
            <div key={term} className="border-b px-5 py-3.5 md:[&:nth-last-child(-n+2)]:border-b-0 md:odd:border-r">
              <dt className="text-[13.5px] font-semibold">{t(`guide.terms.${term}` as MessageKey)}</dt>
              <dd className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">{t(`guide.terms.${term}.body` as MessageKey)}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </Section>
  );
}

const MAP = [
  { group: "nav.group.request", body: "guide.map.request", icon: ListChecks },
  { group: "nav.group.proof", body: "guide.map.proof", icon: Activity },
  { group: "nav.group.delivery", body: "guide.map.delivery", icon: FileText },
  { group: "nav.group.project", body: "guide.map.project", icon: Settings },
] as const;

export function MapSection() {
  const { t } = useI18n();
  return (
    <Section title="guide.map.title">
      <div className="grid gap-3 sm:grid-cols-2">
        {MAP.map((m) => (
          <div key={m.group} className="flex gap-3 rounded-xl border bg-card p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <m.icon className="size-[18px]" />
            </span>
            <div>
              <p className="text-[13.5px] font-semibold">{t(m.group)}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">{t(m.body)}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
