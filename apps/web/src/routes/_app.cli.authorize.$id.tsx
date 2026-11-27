import { createFileRoute } from "@tanstack/react-router";
import { AuthorizeCard } from "@/components/cli-login/authorize-card";
import { cliLoginQuery } from "@/hooks/cli-login-queries";

/** Opened by `lastro login`: the person signed in here authorizes their terminal. */
export const Route = createFileRoute("/_app/cli/authorize/$id")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(cliLoginQuery(params.id)),
  component: Authorize,
});

function Authorize() {
  const { id } = Route.useParams();
  return <AuthorizeCard id={id} />;
}
