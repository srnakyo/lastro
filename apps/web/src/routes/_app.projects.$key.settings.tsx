import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { FlowEditor } from "@/components/settings/flow/flow-editor";
import { MembersCard } from "@/components/settings/members-card";
import { TokensCard } from "@/components/settings/tokens-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { configQuery } from "@/hooks/admin-queries";
import { useI18n } from "@/lib/i18n";

const TABS = ["flows", "tokens", "members"] as const;

export const Route = createFileRoute("/_app/projects/$key/settings")({
  validateSearch: (s) => z.object({ tab: z.enum(TABS).optional() }).parse(s),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(configQuery(params.key)),
  component: Settings,
});

function Settings() {
  const { t } = useI18n();
  const { key } = Route.useParams();
  const { tab } = Route.useSearch();
  const { data: config } = useSuspenseQuery(configQuery(key));
  return (
    <>
      <PageHeader title={t("nav.settings")} description={t("settings.lead")} />
      <Tabs defaultValue={tab ?? "flows"}>
        <TabsList className="mb-5">
          <TabsTrigger value="flows">{t("flow.title")}</TabsTrigger>
          <TabsTrigger value="tokens">{t("tokens.title")}</TabsTrigger>
          <TabsTrigger value="members">{t("members.title")}</TabsTrigger>
        </TabsList>
        <TabsContent value="flows"><FlowEditor projectKey={key} config={config} /></TabsContent>
        <TabsContent value="tokens"><TokensCard projectKey={key} /></TabsContent>
        <TabsContent value="members"><MembersCard projectKey={key} /></TabsContent>
      </Tabs>
    </>
  );
}
