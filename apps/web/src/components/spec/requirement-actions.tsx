import type { RequirementStatus } from "@lastro/shared";
import { useQuery } from "@tanstack/react-query";
import { Ban, Check, LockOpen, Play, Stamp } from "lucide-react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { requirementAction } from "@/fns/requirements";
import { useAction } from "@/hooks/use-action";
import { requirementQaQuery } from "@/hooks/run-queries";
import { useI18n } from "@/lib/i18n";

type Action = "approve" | "unlock" | "start" | "drop" | "accept";

/** The human actions the lifecycle allows from the current status. In automatic mode Lastro approves, so there is no approve button. */
export function RequirementActions({ projectKey, code, status, locked, approveBlockedBy }: { projectKey: string; code: string; status: RequirementStatus; locked: boolean; approveBlockedBy: string[] }) {
  const { t } = useI18n();
  const { run } = useAction(projectKey);
  const review = useQuery(requirementQaQuery(projectKey, code)).data?.config.autonomy === "review";
  const act = (action: Action) => (reason: string) => run(() => requirementAction({ data: { key: projectKey, code, action, reason } }), t("action.done"));
  return (
    <div className="flex flex-wrap gap-2">
      {review && status === "specified" && approveBlockedBy.length > 0 && (
        <Tooltip content={approveBlockedBy.join(" · ")}>
          <span tabIndex={0}>
            <Button disabled><Check /> {t("action.approve")}</Button>
          </span>
        </Tooltip>
      )}
      {review && status === "specified" && approveBlockedBy.length === 0 && (
        <ConfirmDialog trigger={<Button><Check /> {t("action.approve")}</Button>} title={t("action.approve.title")} description={t("action.approve.body")} confirmLabel={t("action.approve")} onConfirm={act("approve")} />
      )}
      {(status === "approved" || status === "reopened") && (
        <ConfirmDialog trigger={<Button variant="outline"><Play /> {t("action.start")}</Button>} title={t("action.start.title")} description={t("action.start.body")} confirmLabel={t("action.start")} reasonLabel={t("action.start.branch")} onConfirm={act("start")} />
      )}
      {status === "delivered" && (
        <ConfirmDialog trigger={<Button><Stamp /> {t("action.accept")}</Button>} title={t("action.accept.title")} description={t("action.accept.body")} confirmLabel={t("action.accept")} reasonLabel={t("action.accept.reference")} onConfirm={act("accept")} />
      )}
      {locked && (status === "approved" || status === "building") && (
        <ConfirmDialog trigger={<Button variant="outline"><LockOpen /> {t("action.unlock")}</Button>} title={t("action.unlock.title")} description={t("action.unlock.body")} confirmLabel={t("action.unlock")} onConfirm={act("unlock")} />
      )}
      {(status === "captured" || status === "specified" || status === "approved") && (
        <ConfirmDialog trigger={<Button variant="ghost"><Ban /> {t("action.drop")}</Button>} title={t("action.drop.title")} description={t("action.drop.body")} confirmLabel={t("action.drop")} reasonLabel={t("action.drop.reason")} destructive onConfirm={act("drop")} />
      )}
    </div>
  );
}
