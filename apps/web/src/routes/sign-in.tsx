import { Link, createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AuthLayout, Field } from "@/components/auth/auth-layout";
import { GithubButton } from "@/components/auth/github-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn } from "@/lib/auth-client";
import { useRefreshViewer } from "@/hooks/use-refresh-viewer";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/sign-in")({
  beforeLoad: ({ context }) => {
    if (context.viewer.user) throw redirect({ to: "/" });
  },
  component: SignIn,
});

function SignIn() {
  const { t } = useI18n();
  const router = useRouter();
  const refresh = useRefreshViewer();
  const { viewer } = Route.useRouteContext();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    const result = await signIn.email({ email: String(form.get("email")), password: String(form.get("password")) });
    setBusy(false);
    if (result.error) return setError(t("auth.failed"));
    await refresh();
    await router.navigate({ to: "/" });
  }

  return (
    <AuthLayout
      title={t("auth.signIn.title")}
      lead={t("auth.signIn.lead")}
      footer={
        <>
          {t("auth.signIn.noAccount")}{" "}
          <Link to="/sign-up" className="font-medium text-primary hover:underline">
            {t("auth.signIn.create")}
          </Link>
        </>
      }
    >
      {viewer.githubEnabled && <GithubButton />}
      <form className="grid gap-4" onSubmit={submit} noValidate>
        <Field id="email" label={t("auth.email")}>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field id="password" label={t("auth.password")} error={error}>
          <Input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={!!error} />
        </Field>
        <Button type="submit" className="mt-1 w-full" disabled={busy}>
          {t("auth.signIn.submit")}
        </Button>
      </form>
    </AuthLayout>
  );
}
