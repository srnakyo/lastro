import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { DesignDialog, InvariantDialog, TermDialog } from "@/components/admin/glossary-forms";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { glossaryQuery } from "@/hooks/admin-queries";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/projects/$key/glossary")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(glossaryQuery(params.key)),
  component: Glossary,
});

const asMap = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, string>) : {});

function Glossary() {
  const { t } = useI18n();
  const { key } = Route.useParams();
  const { data } = useSuspenseQuery(glossaryQuery(key));
  const design = { components: asMap(data.design?.components), forbidden: data.design?.forbidden ?? [], palette: asMap(data.design?.palette), referenceScreens: data.design?.referenceScreens ?? [] };
  const none = <p className="px-5 py-4 text-[13px] text-muted-foreground">{t("glossary.none")}</p>;
  return (
    <>
      <PageHeader title={t("nav.glossary")} description={t("glossary.lead")} />
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader><CardTitle>{t("glossary.terms")}</CardTitle><TermDialog projectKey={key} /></CardHeader>
          {data.terms.length === 0 ? none : (
            <ul className="divide-y">
              {data.terms.map((term) => (
                <li key={term.id} className="flex items-start gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold">{term.term}</p>
                    <p className="text-[13px]">{term.means}</p>
                    {term.note && <p className="mt-0.5 text-[12px] text-muted-foreground">{term.note}</p>}
                  </div>
                  <TermDialog projectKey={key} initial={term} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div className="grid gap-5 [&>*]:min-w-0">
          <Card>
            <CardHeader><CardTitle>{t("glossary.invariants")}</CardTitle><InvariantDialog projectKey={key} /></CardHeader>
            {data.invariants.length === 0 ? none : (
              <ul className="divide-y">
                {data.invariants.map((inv) => (
                  <li key={inv.id} className="flex items-start gap-3 px-5 py-3">
                    <span className="font-mono text-[12px] text-muted-foreground">{inv.code}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px]">{inv.text}</p>
                      {inv.testRefs.map((r) => <p key={r} className="truncate font-mono text-[11.5px] text-muted-foreground">{r}</p>)}
                    </div>
                    <InvariantDialog projectKey={key} initial={inv} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardHeader><CardTitle>{t("glossary.design")}</CardTitle><DesignDialog projectKey={key} initial={design} /></CardHeader>
            <div className="grid gap-3 px-5 py-4 text-[13px]">
              <div><p className="mb-1 text-[12px] font-medium text-muted-foreground">{t("glossary.design.forbidden")}</p>{design.forbidden.length ? <ul className="list-disc pl-5">{design.forbidden.map((f) => <li key={f}>{f}</li>)}</ul> : "—"}</div>
              <div><p className="mb-1 text-[12px] font-medium text-muted-foreground">{t("glossary.design.components")}</p>{Object.keys(design.components).length ? Object.entries(design.components).map(([k, v]) => <p key={k}><span className="font-mono">{k}</span>: {v}</p>) : "—"}</div>
              <div><p className="mb-1 text-[12px] font-medium text-muted-foreground">{t("glossary.design.palette")}</p>{Object.keys(design.palette).length ? <div className="flex flex-wrap gap-2">{Object.entries(design.palette).map(([k, v]) => <span key={k} className="flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-[11.5px]"><span className="size-3 rounded-sm border" style={{ background: v }} />{k} {v}</span>)}</div> : "—"}</div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
