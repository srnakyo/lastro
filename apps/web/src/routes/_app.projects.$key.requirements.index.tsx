import { REQUIREMENT_STATUSES } from "@lastro/shared";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ListChecks } from "lucide-react";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { RequirementsTable } from "@/components/spec/requirements-table";
import { EmptyState } from "@/components/states";
import { Select } from "@/components/ui/select";
import { packagesQuery, requirementsQuery } from "@/hooks/spec-queries";
import { useI18n } from "@/lib/i18n";

const search = z.object({ status: z.enum(REQUIREMENT_STATUSES).optional(), type: z.string().optional(), pkg: z.string().optional() });

export const Route = createFileRoute("/_app/projects/$key/requirements/")({
  validateSearch: (s) => search.parse(s),
  loaderDeps: ({ search: s }) => s,
  loader: ({ context, params, deps }) => context.queryClient.ensureQueryData(requirementsQuery(params.key, deps)),
  component: Requirements,
});

function Requirements() {
  const { t } = useI18n();
  const { key } = Route.useParams();
  const filter = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: rows } = useSuspenseQuery(requirementsQuery(key, filter));
  const all = useQuery(requirementsQuery(key, {}));
  const packages = useQuery(packagesQuery(key));
  const types = [...new Set((all.data ?? rows).map((r) => r.type))].sort();
  const set = (patch: Partial<typeof filter>) => void navigate({ search: (prev) => ({ ...prev, ...patch }) });
  return (
    <>
      <PageHeader title={t("nav.requirements")} description={t("req.lead")} />
      <div className="mb-4 flex flex-wrap gap-2">
        <Select aria-label={t("req.filter.status")} className="w-44" value={filter.status ?? ""} onChange={(e) => set({ status: (e.target.value || undefined) as never })}>
          <option value="">{t("req.filter.status")}: {t("common.all")}</option>
          {REQUIREMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`status.${s}`)}
            </option>
          ))}
        </Select>
        <Select aria-label={t("req.filter.type")} className="w-40" value={filter.type ?? ""} onChange={(e) => set({ type: e.target.value || undefined })}>
          <option value="">{t("req.filter.type")}: {t("common.all")}</option>
          {types.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
        <Select aria-label={t("req.filter.package")} className="w-72" value={filter.pkg ?? ""} onChange={(e) => set({ pkg: e.target.value || undefined })}>
          <option value="">{t("req.filter.package")}: {t("common.all")}</option>
          {(packages.data ?? []).map((p) => (
            <option key={p.code} value={p.code}>
              {p.title}
            </option>
          ))}
        </Select>
      </div>
      {rows.length === 0 ? <EmptyState icon={<ListChecks />} title={t("req.empty.title")} body={t("req.empty.body")} /> : <RequirementsTable projectKey={key} rows={rows} />}
    </>
  );
}
