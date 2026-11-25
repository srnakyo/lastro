import { Link, createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AuthLayout, Field } from "@/components/auth/auth-layout";
import { GithubButton } from "@/components/auth/github-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signUp } from "@/lib/auth-client";
import { useRefreshViewer } from "@/hooks/use-refresh-viewer";
import { authErrorText } from "@/lib/error-text";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/sign-up")({
  beforeLoad: ({ context }) => {
    if (context.viewer.user) throw redirect({ to: "/" });
  },
  component: SignUp,
});

function SignUp() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const refresh = useRefreshViewer();
  const { viewer } = Route.useRouteContext();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    const result = await signUp.email({ name: String(form.get("name")), email: String(form.get("email")), password: String(form.get("password")) });
    setBusy(false);
    if (result.error) return setError(authErrorText(lang, result.error, t("auth.signUpFailed")));
    await refresh();
    await router.navigate({ to: "/onboarding" });
  }

  return (
    <AuthLayout
      title={t("auth.signUp.title")}
      lead={t("auth.signIn.lead")}
      footer={
        <>
          {t("auth.signUp.hasAccount")}{" "}
          <Link to="/sign-in" className="font-medium text-primary hover:underline">
            {t("auth.signIn.submit")}
          </Link>
        </>
      }
    >
      {viewer.githubEnabled && <GithubButton />}
      <form className="grid gap-4" onSubmit={submit} noValidate>
        <Field id="name" label={t("auth.name")}>
          <Input id="name" name="name" autoComplete="name" required />
        </Field>
        <Field id="email" label={t("auth.email")}>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field id="password" label={t("auth.password")} hint={t("auth.passwordHint")} error={error}>
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required aria-invalid={!!error} />
        </Field>
        <Button type="submit" className="mt-1 w-full" disabled={busy}>
          {t("auth.signUp.submit")}
        </Button>
      </form>
    </AuthLayout>
  );
}
