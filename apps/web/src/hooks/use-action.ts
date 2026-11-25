import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { errorText } from "@/lib/error-text";
import { useI18n } from "@/lib/i18n";

/** Runs a server action, shows its error as a toast, then refreshes the queries of the project. */
export function useAction(projectKey: string) {
  const { lang } = useI18n();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function run<T>(work: () => Promise<T>, success?: string): Promise<T | null> {
    setPending(true);
    try {
      const result = await work();
      await queryClient.invalidateQueries({ queryKey: ["project", projectKey] });
      await router.invalidate();
      if (success) toast.success(success);
      return result;
    } catch (error) {
      toast.error(errorText(lang, (error as Error).message));
      return null;
    } finally {
      setPending(false);
    }
  }
  return { run, pending };
}
