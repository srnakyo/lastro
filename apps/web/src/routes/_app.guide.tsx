import { createFileRoute } from "@tanstack/react-router";
import { GuidePage } from "@/components/guide/guide-page";

export const Route = createFileRoute("/_app/guide")({
  component: GuidePage,
});
