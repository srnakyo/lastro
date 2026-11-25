import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Bot } from "lucide-react";
import { AgentSessionCard } from "@/components/admin/agent-session-card";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/states";
import { agentsQuery } from "@/hooks/admin-queries";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/projects/$key/agents")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(agentsQuery(params.key)),
  component: Agents,
});

function Agents() {
  const { t } = useI18n();
  const { key } = Route.useParams();
  const { data: sessions } = useSuspenseQuery(agentsQuery(key));
  return (
    <>
      <PageHeader title={t("nav.agents")} description={t("agents.lead")} />
      {sessions.length === 0 ? (
        <EmptyState icon={<Bot />} title={t("agents.empty")} body={t("agents.empty.body")} />
      ) : (
        <div className="grid gap-3">{sessions.map((s) => <AgentSessionCard key={s.id} session={s} />)}</div>
      )}
    </>
  );
}
