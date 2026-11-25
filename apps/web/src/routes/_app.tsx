import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/app-shell";

/** Every screen behind sign-in and a workspace. */
export const Route = createFileRoute("/_app")({
  beforeLoad: ({ context, location }) => {
    if (!context.viewer.user) throw redirect({ to: "/sign-in", search: { redirect: location.href } });
    if (!context.viewer.workspace) throw redirect({ to: "/onboarding" });
  },
  component: AppLayout,
});

function AppLayout() {
  const { viewer } = Route.useRouteContext();
  return (
    <AppShell viewer={viewer}>
      <Outlet />
    </AppShell>
  );
}
