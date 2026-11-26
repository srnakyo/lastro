import { createFileRoute } from "@tanstack/react-router";
import { GuidePage } from "@/components/guide/guide-page";

/** The same guide inside a project, so its navigation stays on screen and the menu map opens its pages. */
export const Route = createFileRoute("/_app/projects/$key/guide")({
  component: ProjectGuide,
});

function ProjectGuide() {
  const { key } = Route.useParams();
  return <GuidePage projectKey={key} />;
}
