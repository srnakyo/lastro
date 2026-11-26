import { REQUIREMENT_STATUSES } from "@lastro/shared";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ListChecks, Search } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { unblockSummary } from "@/components/spec/requirement-holds";
import { RequirementsBulkBar } from "@/components/spec/requirements-bulk-bar";
import { RequirementsTable } from "@/components/spec/requirements-table";
import { UnblockCard } from "@/components/spec/unblock-card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/states";
import { Select } from "@/components/ui/select";
import { packagesQuery, requirementsQuery } from "@/hooks/spec-queries";
import { useSelection } from "@/hooks/use-selection";
import { useI18n } from "@/lib/i18n";
import { typeLabel } from "@/lib/type-label";

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
  const [query, setQuery] = useState("");
  const { selected, toggle, setMany, clear } = useSelection();
  const q = query.trim().toLowerCase();
  const shown = q ? rows.filter((r) => r.code.toLowerCase().includes(q) || r.title.toLowerCase().includes(q)) : rows;
  const chosen = [...selected].filter((code) => shown.some((r) => r.code === code && r.status === "specified"));
  return (
    <>
      <PageHeader title={t("nav.requirements")} description={t("req.lead")} />
      <UnblockCard projectKey={key} summary={unblockSummary(rows)} />
      <div className="mb-4 flex flex-wrap gap-2">
        <label className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("req.search")} aria-label={t("req.search")} className="pl-8" />
        </label>
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
              {typeLabel(t, type)}
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
      {rows.length === 0 ? (
        <EmptyState icon={<ListChecks />} title={t("req.empty.title")} body={t("req.empty.body")} />
      ) : shown.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">{t("req.noneMatch")}</p>
      ) : (
        <>
          <RequirementsTable projectKey={key} rows={shown} selected={selected} onSelect={toggle} onSelectMany={setMany} />
          <RequirementsBulkBar projectKey={key} codes={chosen} onDone={clear} />
        </>
      )}
    </>
  );
}
