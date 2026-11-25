import { Outlet, createFileRoute } from "@tanstack/react-router";
import { projectQuery } from "@/hooks/queries";

export const Route = createFileRoute("/_app/projects/$key")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(projectQuery(params.key)),
  component: () => <Outlet />,
});
