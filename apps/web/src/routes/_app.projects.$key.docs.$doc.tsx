import { DOCUMENTS, DOCUMENT_IDS, type DocumentId } from "@lastro/docs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeft, Download } from "lucide-react";
import { DocView } from "@/components/docs/doc-view";
import { Card } from "@/components/ui/card";
import { docQuery } from "@/hooks/doc-queries";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/projects/$key/docs/$doc")({
  loader: ({ context, params }) => {
    if (!DOCUMENT_IDS.includes(params.doc as DocumentId)) throw notFound();
    return context.queryClient.ensureQueryData(docQuery(params.key, params.doc as DocumentId));
  },
  component: DocPage,
});

function DocPage() {
  const { t } = useI18n();
  const { key, doc } = Route.useParams();
  const { data } = useSuspenseQuery(docQuery(key, doc as DocumentId));
  const file = DOCUMENTS.find((d) => d.id === doc)?.file ?? doc;
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link to="/projects/$key/docs" params={{ key }} className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground"><ArrowLeft className="size-3.5" /> {t("docs.back")}</Link>
        <span className="font-mono text-[12.5px] font-semibold">{file}</span>
        <span className="ml-auto flex gap-2">
          {(["md", "html", "pdf"] as const).map((f) => (
            <a key={f} href={`/api/projects/${key}/docs/${doc}.${f}`} target={f === "md" ? undefined : "_blank"} rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[11.5px] hover:bg-accent"><Download className="size-3" />{f}</a>
          ))}
        </span>
      </div>
      <Card className="px-6 py-6 sm:px-10 sm:py-8">
        <DocView markdown={data.markdown} projectKey={key} />
      </Card>
    </>
  );
}
