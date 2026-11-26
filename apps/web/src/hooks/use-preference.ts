import { setPreference } from "@/fns/workspaces";
import { useRefreshViewer } from "./use-refresh-viewer";

/** Saves a screen preference (language or theme) and redraws the app with it. */
export function usePreference() {
  const refresh = useRefreshViewer();
  return async (name: "lastro_lang" | "lastro_theme", value: string) => {
    await setPreference({ data: { name, value } });
    await refresh();
  };
}
