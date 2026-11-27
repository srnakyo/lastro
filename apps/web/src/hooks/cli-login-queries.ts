import { queryOptions } from "@tanstack/react-query";
import { getCliLogin } from "@/fns/cli-login";

export const cliLoginQuery = (id: string) => queryOptions({ queryKey: ["workspace", "cli-login", id], queryFn: () => getCliLogin({ data: { id } }) });
