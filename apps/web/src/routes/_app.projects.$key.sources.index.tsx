import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { FileAudio, FileImage, FileText, FileVideo, MessagesSquare, Quote } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { UploadSourceDialog } from "@/components/spec/upload-source-dialog";
import { EmptyState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { sourcesQuery } from "@/hooks/spec-queries";
import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/projects/$key/sources/")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(sourcesQuery(params.key)),
  component: Sources,
});

const ICON = { chat: MessagesSquare, audio: FileAudio, video: FileVideo, image: FileImage } as Record<string, typeof FileText>;

function Sources() {
  const { t, lang } = useI18n();
  const { key } = Route.useParams();
  const { data: sources } = useSuspenseQuery(sourcesQuery(key));
  return (
    <>
      <PageHeader title={t("nav.sources")} description={t("src.lead")} actions={<UploadSourceDialog projectKey={key} sources={sources} />} />
      {sources.length === 0 ? (
        <EmptyState icon={<Quote />} title={t("src.empty.title")} body={t("src.empty.body")} />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead>
              <tr className="border-b text-left text-[12px] text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">{t("src.col.source")}</th>
                <th className="px-3 py-2.5 font-medium">{t("src.col.kind")}</th>
                <th className="px-3 py-2.5 font-medium">{t("src.col.version")}</th>
                <th className="px-3 py-2.5 text-right font-medium">{t("src.col.quotes")}</th>
                <th className="px-5 py-2.5 font-medium">{t("src.upload.from")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sources.map((s) => {
                const Icon = ICON[s.kind] ?? FileText;
                return (
                  <tr key={s.code} className="hover:bg-accent/40">
                    <td className="px-5 py-3">
                      <Link to="/projects/$key/sources/$code" params={{ key, code: s.code }} className="group flex items-start gap-3">
                        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <span>
                          <span className="block font-medium group-hover:text-primary">{s.title}</span>
                          <span className="font-mono text-[11.5px] text-muted-foreground">{s.code}{s.path ? ` · ${s.path}` : ""}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <Badge>{s.kind}</Badge>
                      {s.machineTranscript && <Badge tone="warning" className="ml-1">{t("src.transcript")}</Badge>}
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={s.final ? "success" : "warning"}>v{s.version} · {s.final ? t("src.final") : t("src.draft")}</Badge>
                    </td>
                    <td className="tabular px-3 py-3 text-right">{s.citations}</td>
                    <td className="px-5 py-3 text-[12.5px] text-muted-foreground">{t(`role.${s.from}`)} · {formatDateTime(s.receivedAt, lang)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
