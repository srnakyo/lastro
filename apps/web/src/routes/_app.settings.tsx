import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { MembersCard } from "@/components/settings/members-card";
import { TokensCard } from "@/components/settings/tokens-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n";

const TABS = ["tokens", "members"] as const;

/** What belongs to the workspace, not to one project: the tokens that work in every project, and the people. */
export const Route = createFileRoute("/_app/settings")({
  validateSearch: (s) => z.object({ tab: z.enum(TABS).optional() }).parse(s),
  component: WorkspaceSettings,
});

function WorkspaceSettings() {
  const { t } = useI18n();
  const { tab } = Route.useSearch();
  const { viewer } = Route.useRouteContext();
  return (
    <>
      <PageHeader title={t("nav.workspaceSettings")} description={t("workspace.settings.lead", { workspace: viewer.workspace?.name ?? "" })} />
      <Tabs defaultValue={tab ?? "tokens"}>
        <TabsList className="mb-5">
          <TabsTrigger value="tokens">{t("tokens.title")}</TabsTrigger>
          <TabsTrigger value="members">{t("members.title")}</TabsTrigger>
        </TabsList>
        <TabsContent value="tokens"><TokensCard /></TabsContent>
        <TabsContent value="members"><MembersCard /></TabsContent>
      </Tabs>
    </>
  );
}
