import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { TokensCard } from "@/components/settings/tokens-card";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/projects/$key/settings")({
  component: Settings,
});

function Settings() {
  const { t } = useI18n();
  const { key } = Route.useParams();
  return (
    <>
      <PageHeader title={t("nav.settings")} description={t("settings.lead")} />
      <div className="grid gap-5">
        <TokensCard projectKey={key} />
      </div>
    </>
  );
}
