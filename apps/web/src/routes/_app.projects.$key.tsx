import { Outlet, createFileRoute, notFound } from "@tanstack/react-router";
import { projectQuery } from "@/hooks/queries";

export const Route = createFileRoute("/_app/projects/$key")({
  // A project outside the person's workspaces answers as not found, never as an error that names it.
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(projectQuery(params.key)).catch((error: unknown) => {
      if (error instanceof Error && /not found|NOT_FOUND|FORBIDDEN|not a member/i.test(error.message)) throw notFound();
      throw error;
    }),
  component: () => <Outlet />,
});
