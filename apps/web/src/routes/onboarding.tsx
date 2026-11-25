import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AuthLayout, Field } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createWorkspace } from "@/fns/workspaces";
import { useRefreshViewer } from "@/hooks/use-refresh-viewer";
import { errorText } from "@/lib/error-text";
import { useI18n } from "@/lib/i18n";

const slugify = (v: string) => v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

export const Route = createFileRoute("/onboarding")({
  beforeLoad: ({ context }) => {
    if (!context.viewer.user) throw redirect({ to: "/sign-in" });
    if (context.viewer.workspace) throw redirect({ to: "/" });
  },
  component: Onboarding,
});

function Onboarding() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const refresh = useRefreshViewer();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      await createWorkspace({ data: { name, slug: slug || slugify(name) } });
      await refresh();
      await router.navigate({ to: "/" });
    } catch (e) {
      setError(errorText(lang, (e as Error).message));
    }
  }

  return (
    <AuthLayout title={t("onboarding.title")} lead={t("onboarding.lead")}>
      <form className="grid gap-4" onSubmit={submit}>
        <Field id="ws-name" label={t("onboarding.name")}>
          <Input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field id="ws-slug" label={t("onboarding.slug")} error={error}>
          <Input id="ws-slug" value={slug || slugify(name)} onChange={(e) => setSlug(slugify(e.target.value))} className="font-mono" required />
        </Field>
        <Button type="submit" className="w-full" disabled={!name}>
          {t("onboarding.submit")}
        </Button>
      </form>
    </AuthLayout>
  );
}
