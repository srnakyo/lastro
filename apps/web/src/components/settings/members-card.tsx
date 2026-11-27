import { useQuery } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { FormDialog } from "@/components/common/form-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { addMember, changeMember } from "@/fns/admin";
import { membersQuery } from "@/hooks/admin-queries";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n";

type Role = "owner" | "admin" | "member";
const ROLES: Role[] = ["owner", "admin", "member"];

function AddMember() {
  const { t } = useI18n();
  const { run } = useAction();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  return (
    <FormDialog
      trigger={<Button size="sm"><UserPlus /> {t("members.add")}</Button>}
      title={t("members.add")}
      description={t("members.lead")}
      submitLabel={t("members.add")}
      disabled={!email.includes("@")}
      onSubmit={() => run(() => addMember({ data: { email, role } }), t("action.done"))}
    >
      <label className="grid gap-1.5 text-[13px] font-medium">{t("members.email")}<Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label className="grid gap-1.5 text-[13px] font-medium">{t("members.role")}
        <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>{ROLES.map((r) => <option key={r} value={r}>{t(`role.${r}`)}</option>)}</Select>
      </label>
    </FormDialog>
  );
}

/** The people of the workspace: they see every project in it. */
export function MembersCard() {
  const { t } = useI18n();
  const { run } = useAction();
  const { data: members = [] } = useQuery(membersQuery);
  return (
    <Card>
      <CardHeader><CardTitle>{t("members.title")}</CardTitle><AddMember /></CardHeader>
      <ul className="divide-y">
        {members.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-[12px] font-semibold text-primary">{(m.user.name || m.user.email).slice(0, 2).toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium">{m.user.name}</p>
              <p className="truncate text-[12px] text-muted-foreground">{m.user.email}</p>
            </div>
            <Select value={m.role} onChange={(e) => void run(() => changeMember({ data: { id: m.id, role: e.target.value as Role } }), t("action.done"))} className="h-8 w-auto" aria-label={`${t("members.role")} ${m.user.email}`}>
              {ROLES.map((r) => <option key={r} value={r}>{t(`role.${r}`)}</option>)}
            </Select>
            <ConfirmDialog trigger={<Button size="sm" variant="ghost">{t("members.remove")}</Button>} title={t("members.remove.title")} description={t("members.remove.body")} confirmLabel={t("members.remove")} destructive onConfirm={() => run(() => changeMember({ data: { id: m.id, role: null } }))} />
          </li>
        ))}
      </ul>
    </Card>
  );
}
