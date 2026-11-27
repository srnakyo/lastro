import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Copy, KeyRound, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { FormDialog } from "@/components/common/form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createToken, listTokens, revokeToken } from "@/fns/tokens";
import { useAction } from "@/hooks/use-action";
import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

/** A project's tokens work only there; without a project, the workspace's tokens work in every project. */
interface Scope {
  projectKey?: string;
}

function NewToken({ projectKey, onCreated }: Scope & { onCreated: (token: string) => void }) {
  const { t } = useI18n();
  const { run } = useAction(projectKey);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"person" | "agent">("agent");
  return (
    <FormDialog
      trigger={<Button size="sm"><Plus /> {t("tokens.new")}</Button>}
      title={t("tokens.new")}
      description={t(projectKey ? "tokens.lead.project" : "tokens.lead.workspace")}
      submitLabel={t("common.save")}
      disabled={!name}
      onSubmit={async () => {
        const created = await run(() => createToken({ data: { key: projectKey, name, kind } }));
        if (created) onCreated(created.token);
        return created;
      }}
    >
      <label className="grid gap-1.5 text-[13px] font-medium">{t("tokens.name")}<Input value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label className="grid gap-1.5 text-[13px] font-medium">{t("tokens.kind")}
        <Select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="agent">{t("tokens.option.agent")}</option>
          <option value="person">{t("tokens.option.person")}</option>
        </Select>
      </label>
      <p className="text-[12.5px] leading-relaxed text-muted-foreground">{t("tokens.kinds")}</p>
    </FormDialog>
  );
}

/** What to run with a token just created: the login, then the link of the repository to this project. */
function FreshToken({ token, projectKey }: Scope & { token: string }) {
  const { t } = useI18n();
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const commands = [`lastro login --url ${origin} --token ${token}`, ...(projectKey ? [`lastro init ${projectKey}`] : [])].join("\n");
  const copy = (text: string) => void navigator.clipboard.writeText(text).then(() => toast.success(t("tokens.copied")));
  return (
    <div className="rounded-md border border-warning/30 bg-warning/10 p-3" role="status">
      <p className="text-[12.5px] font-medium">{t("tokens.created")}</p>
      <div className="mt-2 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded bg-card px-2 py-1 font-mono text-[12px]">{token}</code>
        <Button size="sm" variant="outline" onClick={() => copy(token)}>
          <Copy /> {t("tokens.copy")}
        </Button>
      </div>
      <p className="mt-3 text-[12.5px]">{t("tokens.next")}</p>
      <div className="mt-2 flex items-start gap-2">
        <pre aria-label={t("tokens.next")} className="min-w-0 flex-1 overflow-x-auto rounded bg-card px-2 py-1.5 font-mono text-[12px] leading-relaxed">{commands}</pre>
        <Button size="sm" variant="outline" onClick={() => copy(commands)}>
          <Copy /> {t("tokens.copy")}
        </Button>
      </div>
    </div>
  );
}

export function TokensCard({ projectKey }: Scope) {
  const { t, lang } = useI18n();
  const { run } = useAction(projectKey);
  const tokens = useQuery({ queryKey: projectKey ? ["project", projectKey, "tokens"] : ["workspace", "tokens"], queryFn: () => listTokens({ data: { key: projectKey } }) });
  const [fresh, setFresh] = useState<string | null>(null);
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const mcpUrl = `${origin}/api/mcp${projectKey ? `?project=${projectKey}` : ""}`;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("tokens.title")}</CardTitle>
        <NewToken projectKey={projectKey} onCreated={setFresh} />
      </CardHeader>
      <div className="grid gap-3 border-b px-5 py-4">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {t(projectKey ? "tokens.lead.project" : "tokens.lead.workspace")}
          {projectKey && (
            <>
              {" "}
              <Link to="/settings" className="font-medium text-primary hover:underline">{t("nav.workspaceSettings")}</Link>.
            </>
          )}
        </p>
        {!projectKey && (
          <p className="text-[12.5px]">
            {t("tokens.login")}: <code className="rounded bg-muted px-1.5 py-0.5 font-mono">lastro login --url {origin}</code>
          </p>
        )}
        <p className="text-[12.5px]">{t("tokens.mcp")}: <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{mcpUrl}</code></p>
        {fresh && <FreshToken token={fresh} projectKey={projectKey} />}
      </div>
      {(tokens.data ?? []).length === 0 ? (
        <p className="px-5 py-4 text-[13px] text-muted-foreground">{t("tokens.empty")}</p>
      ) : (
        <ul className="divide-y">
          {(tokens.data ?? []).map((tk) => (
            <li key={tk.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <KeyRound className="size-4 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium">{tk.name}</p>
                <p className="font-mono text-[11.5px] text-muted-foreground">{tk.prefix}… · {tk.project?.key ?? t("tokens.everyProject")}</p>
              </div>
              <Badge tone={tk.scopes.includes("person") ? "primary" : "info"}>{tk.scopes.includes("person") ? t("tokens.kind.person") : t("tokens.kind.agent")}</Badge>
              <span className="text-[12px] text-muted-foreground">{t("tokens.lastUsed")}: {tk.lastUsedAt ? formatDateTime(tk.lastUsedAt, lang) : t("tokens.never")}</span>
              {tk.revokedAt ? (
                <Badge tone="danger">{t("tokens.revoked")}</Badge>
              ) : (
                <ConfirmDialog trigger={<Button size="sm" variant="ghost">{t("tokens.revoke")}</Button>} title={t("tokens.revoke.title")} description={t("tokens.revoke.body")} confirmLabel={t("tokens.revoke")} destructive onConfirm={() => run(() => revokeToken({ data: { key: projectKey, id: tk.id } }))} />
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
