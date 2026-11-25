import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FolderKanban } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ProjectCard } from "@/components/projects/project-card";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { EmptyState } from "@/components/states";
import { projectsQuery } from "@/hooks/queries";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(projectsQuery),
  component: Home,
});

function Home() {
  const { t } = useI18n();
  const { viewer } = Route.useRouteContext();
  const { data: projects } = useSuspenseQuery(projectsQuery);
  return (
    <>
      <PageHeader title={t("home.title")} description={t("home.lead", { workspace: viewer.workspace?.name ?? "" })} actions={<NewProjectDialog />} />
      {projects.length === 0 ? (
        <EmptyState icon={<FolderKanban />} title={t("home.empty.title")} body={t("home.empty.body")} action={<NewProjectDialog />} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.key} project={p} />
          ))}
        </div>
      )}
    </>
  );
}
