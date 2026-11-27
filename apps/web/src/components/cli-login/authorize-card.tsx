import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CircleCheck, CircleX, Clock, TerminalSquare } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { answerCliLogin } from "@/fns/cli-login";
import { cliLoginQuery } from "@/hooks/cli-login-queries";
import { useAction } from "@/hooks/use-action";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { RichText } from "@/lib/rich-text";

const ANSWERED: Record<"approved" | "used" | "denied" | "expired", { icon: typeof CircleCheck; tone: string; title: MessageKey; body: MessageKey }> = {
  approved: { icon: CircleCheck, tone: "text-success", title: "cliLogin.done.title", body: "cliLogin.done.body" },
  used: { icon: CircleCheck, tone: "text-success", title: "cliLogin.done.title", body: "cliLogin.done.body" },
  denied: { icon: CircleX, tone: "text-destructive", title: "cliLogin.denied.title", body: "cliLogin.denied.body" },
  expired: { icon: Clock, tone: "text-muted-foreground", title: "cliLogin.expired.title", body: "cliLogin.expired.body" },
};

function Frame({ children }: { children: ReactNode }) {
  return <Card className="mx-auto mt-6 grid max-w-xl gap-5 p-6">{children}</Card>;
}

/** After the answer: what happens in the terminal now. */
function Answered({ state }: { state: keyof typeof ANSWERED }) {
  const { t } = useI18n();
  const a = ANSWERED[state];
  return (
    <Frame>
      <div className="flex gap-3.5" role="status">
        <a.icon className={`mt-0.5 size-6 shrink-0 ${a.tone}`} />
        <div>
          <h1 className="text-[18px] font-bold tracking-tight">{t(a.title)}</h1>
          <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
            <RichText text={t(a.body)} />
          </p>
        </div>
      </div>
      {state !== "expired" && (
        <Link to="/settings" search={{ tab: "tokens" }} className="text-[13px] font-medium text-primary hover:underline">
          {t("cliLogin.manage")}
        </Link>
      )}
    </Frame>
  );
}

/**
 * The page `lastro login` opens: which computer asks, the code to compare with the terminal, what the token
 * may do, and the two answers.
 */
export function AuthorizeCard({ id }: { id: string }) {
  const { t } = useI18n();
  const { run, pending } = useAction();
  const { data: login, refetch } = useSuspenseQuery(cliLoginQuery(id));
  if (login.state !== "pending") return <Answered state={login.state} />;
  const answer = (allow: boolean) => run(() => answerCliLogin({ data: { id, allow } })).then(() => refetch());
  return (
    <Frame>
      <div className="flex gap-3.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <TerminalSquare className="size-5" />
        </span>
        <div>
          <h1 className="text-[18px] font-bold tracking-tight">{t("cliLogin.title")}</h1>
          <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
            <RichText text={t("cliLogin.lead", { host: login.host, workspace: login.workspace.name })} />
          </p>
        </div>
      </div>
      <div className="rounded-lg border bg-muted/40 px-4 py-3">
        <p className="text-[12.5px] text-muted-foreground">{t("cliLogin.code")}</p>
        <p className="mt-1 font-mono text-[22px] font-semibold tracking-[0.18em]" aria-label={t("cliLogin.code")}>{login.code}</p>
      </div>
      <ul className="grid gap-2 text-[13px] leading-relaxed">
        <li><RichText text={t("cliLogin.gets")} /></li>
        <li><RichText text={t("cliLogin.cannot")} /></li>
        <li><RichText text={t("cliLogin.revoke")} /></li>
      </ul>
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button variant="outline" disabled={pending} onClick={() => void answer(false)}>{t("cliLogin.deny")}</Button>
        <Button disabled={pending} onClick={() => void answer(true)}>{t("cliLogin.allow")}</Button>
      </div>
    </Frame>
  );
}
