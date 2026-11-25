import type { RequirementStatus } from "@lastro/shared";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";

const TONE: Record<RequirementStatus, BadgeTone> = {
  captured: "neutral",
  specified: "info",
  approved: "primary",
  building: "primary",
  verified: "success",
  previewed: "success",
  delivered: "success",
  accepted: "success",
  reopened: "danger",
  dropped: "neutral",
};

export function StatusBadge({ status }: { status: RequirementStatus }) {
  const { t } = useI18n();
  return <Badge tone={TONE[status]}>{t(`status.${status}`)}</Badge>;
}

const RUN_TONE: Record<string, BadgeTone> = { running: "info", passed: "success", failed: "danger", error: "danger" };

export function RunBadge({ status }: { status: string }) {
  const { t } = useI18n();
  return <Badge tone={RUN_TONE[status] ?? "neutral"}>{t(`run.status.${status}` as never)}</Badge>;
}
