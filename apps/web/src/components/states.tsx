import { redactSecrets } from "@lastro/shared";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { RichText } from "@/lib/rich-text";

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground" role="status">
      <Loader2 className="size-5 animate-spin" />
    </div>
  );
}

export function ErrorState({ error, reset }: { error: Error; reset?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <AlertTriangle className="size-6 text-destructive" />
      <p className="text-[14px] font-medium">{t("common.error", { message: redactSecrets(error.message) })}</p>
      {reset && (
        <Button variant="outline" onClick={reset}>
          {t("common.retry")}
        </Button>
      )}
    </div>
  );
}

export function NotFound() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <p className="font-mono text-[12px] text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">{t("notFound.title")}</h1>
      <Button asChild variant="outline">
        <Link to="/">{t("notFound.back")}</Link>
      </Button>
    </div>
  );
}

/** An empty area that tells the person what to do next. */
export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card/50 px-6 py-10 text-center">
      {icon && <div className="mb-1 text-muted-foreground [&_svg]:size-6">{icon}</div>}
      <p className="text-[14px] font-semibold">{title}</p>
      <p className="max-w-md text-[13px] leading-relaxed text-muted-foreground">
        <RichText text={body} />
      </p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
