import { createServerFn } from "@tanstack/react-start";
import { getCookie, getRequest } from "@tanstack/react-start/server";
import { auth, githubEnabled } from "@/lib/auth.server";
import { activeWorkspace } from "./context.server";

/** The browser's language when it is one Lastro speaks: the default until the person picks one. */
function browserLang(header: string | null): "en" | "pt-BR" | null {
  for (const part of (header ?? "").split(",")) {
    const tag = part.split(";")[0]?.trim().toLowerCase() ?? "";
    if (tag.startsWith("pt")) return "pt-BR";
    if (tag.startsWith("en")) return "en";
  }
  return null;
}

/** Who is signed in, their workspaces and saved preferences. Null user when signed out. */
export const getViewer = createServerFn({ method: "GET" }).handler(async () => {
  const session = await auth.api.getSession({ headers: getRequest().headers });
  const preferences = { lang: getCookie("lastro_lang") ?? browserLang(getRequest().headers.get("accept-language")), theme: getCookie("lastro_theme") ?? null };
  if (!session) return { user: null, workspaces: [], workspace: null, preferences, githubEnabled };
  const { workspaces, workspace } = await activeWorkspace(session.user.id);
  return {
    user: { id: session.user.id, name: session.user.name, email: session.user.email, image: session.user.image ?? null },
    workspaces: workspaces.map((w) => ({ id: w.id, name: w.name, slug: w.slug, role: w.role })),
    workspace: workspace ? { id: workspace.id, name: workspace.name, slug: workspace.slug } : null,
    preferences,
    githubEnabled,
  };
});

export type Viewer = Awaited<ReturnType<typeof getViewer>>;
