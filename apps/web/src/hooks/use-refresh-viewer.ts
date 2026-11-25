import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { keys } from "./queries";

/** After sign-in, sign-out or a preference change: drop the cached viewer and reload the route context. */
export function useRefreshViewer() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return async () => {
    queryClient.removeQueries({ queryKey: keys.viewer });
    await router.invalidate();
  };
}
