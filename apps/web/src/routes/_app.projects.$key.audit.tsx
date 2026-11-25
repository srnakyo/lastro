import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { auditQuery } from "@/hooks/admin-queries";
import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/projects/$key/audit")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(auditQuery(params.key, {})),
  component: Audit,
});

const TONE = { user: "primary", agent: "info", system: "neutral" } as const;

function Audit() {
  const { t, lang } = useI18n();
  const { key } = Route.useParams();
  const [action, setAction] = useState("");
  const [actorType, setActorType] = useState<"" | "user" | "agent" | "system">("");
  const { data: events = [] } = useQuery(auditQuery(key, { action: action || undefined, actorType: actorType || undefined }));
  return (
    <>
      <PageHeader title={t("nav.audit")} description={t("audit.lead")} />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3">
          <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder={t("audit.filter.action")} className="h-8 w-full max-w-[220px]" aria-label={t("audit.filter.action")} />
          <Select value={actorType} onChange={(e) => setActorType(e.target.value as typeof actorType)} className="h-8 w-auto" aria-label={t("audit.filter.actor")}>
            <option value="">{t("common.all")}</option>
            <option value="user">{t("actor.user")}</option>
            <option value="agent">{t("actor.agent")}</option>
            <option value="system">{t("actor.system")}</option>
          </Select>
        </div>
        {events.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-muted-foreground">{t("audit.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[13px]">
              <thead>
                <tr className="border-b text-left text-[11.5px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-2.5 font-medium">{t("audit.col.when")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("audit.col.actor")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("audit.col.action")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("audit.col.entity")}</th>
                  <th className="px-5 py-2.5 font-medium">{t("audit.col.data")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {events.map((e) => (
                  <tr key={e.id} className="align-top">
                    <td className="whitespace-nowrap px-5 py-2.5 text-muted-foreground">{formatDateTime(e.createdAt, lang)}</td>
                    <td className="px-3 py-2.5"><Badge tone={TONE[e.actorType]}>{t(`actor.${e.actorType}`)}</Badge><span className="ml-2 font-mono text-[11px] text-muted-foreground">{e.actorId?.slice(0, 14) ?? ""}</span></td>
                    <td className="px-3 py-2.5 font-mono text-[12.5px]">{e.action}</td>
                    <td className="px-3 py-2.5 font-mono text-[12px] text-muted-foreground">{e.entity} {e.entityId.length > 20 ? `${e.entityId.slice(0, 8)}…` : e.entityId}</td>
                    <td className="max-w-[420px] px-5 py-2.5 font-mono text-[11.5px] text-muted-foreground"><span className="line-clamp-2 break-all">{JSON.stringify(e.data) === "{}" ? "" : JSON.stringify(e.data)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
