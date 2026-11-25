import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth-client";
import { useI18n } from "@/lib/i18n";

function GithubMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true" fill="currentColor">
      <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17 4.7 18 5 18 5c.7 1.7.3 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z" />
    </svg>
  );
}

export function GithubButton() {
  const { t } = useI18n();
  return (
    <>
      <Button type="button" variant="outline" className="w-full" onClick={() => void signIn.social({ provider: "github", callbackURL: "/" })}>
        <GithubMark /> {t("auth.github")}
      </Button>
      <div className="my-4 flex items-center gap-3 text-[12px] text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> {t("auth.or")} <span className="h-px flex-1 bg-border" />
      </div>
    </>
  );
}
