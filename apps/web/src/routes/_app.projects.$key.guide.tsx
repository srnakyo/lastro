import { createFileRoute } from "@tanstack/react-router";
import { GuidePage } from "@/components/guide/guide-page";

/** The same guide inside a project, so its navigation stays on screen. */
export const Route = createFileRoute("/_app/projects/$key/guide")({
  component: GuidePage,
});
