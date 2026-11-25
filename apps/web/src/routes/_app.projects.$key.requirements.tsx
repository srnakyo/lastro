import { Outlet, createFileRoute } from "@tanstack/react-router";
import { SpecTabs } from "@/components/spec/spec-tabs";

export const Route = createFileRoute("/_app/projects/$key/requirements")({
  component: function SpecLayout() {
    const { key } = Route.useParams();
    return (
      <>
        <SpecTabs projectKey={key} />
        <Outlet />
      </>
    );
  },
});
