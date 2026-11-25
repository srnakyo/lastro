import { useQuery } from "@tanstack/react-query";
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

function NewToken({ projectKey, onCreated }: { projectKey: string; onCreated: (token: string) => void }) {
  const { t } = useI18n();
  const { run } = useAction(projectKey);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"person" | "agent">("agent");
  const [projectOnly, setProjectOnly] = useState(true);
  return (
    <FormDialog
      trigger={<Button size="sm"><Plus /> {t("tokens.new")}</Button>}
      title={t("tokens.new")}
      description={t("tokens.lead")}
      submitLabel={t("common.save")}
      disabled={!name}
      onSubmit={async () => {
        const created = await run(() => createToken({ data: { key: projectKey, name, kind, projectOnly } }));
        if (created) onCreated(created.token);
        return created;
      }}
    >
      <label className="grid gap-1.5 text-[13px] font-medium">{t("tokens.name")}<Input value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label className="grid gap-1.5 text-[13px] font-medium">{t("tokens.kind")}
        <Select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="agent">{t("tokens.kind.agent")}</option>
          <option value="person">{t("tokens.kind.person")}</option>
        </Select>
      </label>
      <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={projectOnly} onChange={(e) => setProjectOnly(e.target.checked)} className="size-4" />{t("tokens.projectOnly")}</label>
    </FormDialog>
  );
}

export function TokensCard({ projectKey }: { projectKey: string }) {
  const { t, lang } = useI18n();
  const { run } = useAction(projectKey);
  const tokens = useQuery({ queryKey: ["project", projectKey, "tokens"], queryFn: () => listTokens({ data: { key: projectKey } }) });
  const [fresh, setFresh] = useState<string | null>(null);
  const mcpUrl = typeof window === "undefined" ? "/api/mcp" : `${window.location.origin}/api/mcp?project=${projectKey}`;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("tokens.title")}</CardTitle>
        <NewToken projectKey={projectKey} onCreated={setFresh} />
      </CardHeader>
      <div className="grid gap-3 border-b px-5 py-4">
        <p className="text-[13px] text-muted-foreground">{t("tokens.lead")}</p>
        <p className="text-[12.5px]">{t("tokens.mcp")}: <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{mcpUrl}</code></p>
        {fresh && (
          <div className="rounded-md border border-warning/30 bg-warning/10 p-3" role="status">
            <p className="text-[12.5px] font-medium">{t("tokens.created")}</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-card px-2 py-1 font-mono text-[12px]">{fresh}</code>
              <Button size="sm" variant="outline" onClick={() => void navigator.clipboard.writeText(fresh).then(() => toast.success(t("tokens.copied")))}>
                <Copy /> {t("tokens.copy")}
              </Button>
            </div>
          </div>
        )}
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
                <p className="font-mono text-[11.5px] text-muted-foreground">{tk.prefix}… · {tk.project?.key ?? "workspace"}</p>
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
