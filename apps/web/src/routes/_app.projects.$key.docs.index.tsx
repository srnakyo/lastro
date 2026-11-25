import { DOCUMENTS } from "@lastro/docs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Download, FileText } from "lucide-react";
import { GenerateDocsDialog } from "@/components/docs/generate-dialog";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/states";
import { Card } from "@/components/ui/card";
import { docsQuery } from "@/hooks/doc-queries";
import { formatDateTime } from "@/lib/format";
import { useI18n, type MessageKey } from "@/lib/i18n";

export const Route = createFileRoute("/_app/projects/$key/docs/")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(docsQuery(params.key)),
  component: Docs,
});

function Docs() {
  const { t, lang } = useI18n();
  const { key } = Route.useParams();
  const { data: builds } = useSuspenseQuery(docsQuery(key));
  const built = (id: string, format: string) => builds.find((b) => b.document === id && b.format === format);
  return (
    <>
      <PageHeader title={t("nav.docs")} description={t("docs.lead")} actions={<GenerateDocsDialog projectKey={key} />} />
      {builds.length === 0 && <div className="mb-5"><EmptyState icon={<FileText />} title={t("docs.empty")} body={t("docs.empty.body")} /></div>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {DOCUMENTS.map((d) => {
          const md = built(d.id, "md");
          return (
            <Card key={d.id} className="flex flex-col p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText className="size-4" /></span>
                <div className="min-w-0">
                  <p className="font-mono text-[12.5px] font-semibold">{d.file}</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">{t(`doc.${d.id}` as MessageKey)}</p>
                </div>
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                <span className="mr-auto text-[12px] text-muted-foreground">{md ? t("docs.last", { when: formatDateTime(md.createdAt, lang) }) : t("docs.never")}</span>
                {md && (
                  <>
                    <Link to="/projects/$key/docs/$doc" params={{ key, doc: d.id }} className="rounded-md bg-primary px-2.5 py-1 text-[12.5px] font-medium text-primary-foreground hover:bg-primary/90">{t("docs.read")}</Link>
                    {(["md", "html", "pdf"] as const).filter((f) => built(d.id, f)).map((f) => (
                      <a key={f} href={`/api/projects/${key}/docs/${d.id}.${f}`} target={f === "md" ? undefined : "_blank"} rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[11.5px] hover:bg-accent">
                        <Download className="size-3" />{f}
                      </a>
                    ))}
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
