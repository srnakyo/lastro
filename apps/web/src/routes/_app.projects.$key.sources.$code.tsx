import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Stamp } from "lucide-react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Markdown } from "@/components/common/markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { markSourceFinal } from "@/fns/sources";
import { sourceQuery } from "@/hooks/spec-queries";
import { useAction } from "@/hooks/use-action";
import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/projects/$key/sources/$code")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(sourceQuery(params.key, params.code)),
  component: SourceDetail,
});

function SourceDetail() {
  const { t, lang } = useI18n();
  const { key, code } = Route.useParams();
  const { data: s } = useSuspenseQuery(sourceQuery(key, code));
  const { run } = useAction(key);
  const latest = s.versions[0];
  const quotedBy = (anchor: string) => [...new Map(s.citations.filter((c) => c.passageAnchor === anchor).map((c) => [c.requirement.code, c])).values()];
  return (
    <div className="grid gap-5">
      <div>
        <Link to="/projects/$key/sources" params={{ key }} className="inline-flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> {t("nav.sources")}
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[12px] text-muted-foreground">{s.code} · {s.kind}</p>
            <h1 className="mt-1 text-[22px] font-bold tracking-tight">{s.title}</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">{t(`role.${s.from}`)} · {formatDateTime(s.receivedAt, lang)}</p>
          </div>
          {latest && !latest.final && (
            <ConfirmDialog
              trigger={<Button><Stamp /> {t("src.markFinal")}</Button>}
              title={t("src.markFinal.title")}
              description={t("src.markFinal.body")}
              confirmLabel={t("src.markFinal")}
              onConfirm={() => run(() => markSourceFinal({ data: { key, code } }), t("action.done"))}
            />
          )}
        </div>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card>
          <CardHeader>
            <CardTitle>{t("src.passages")}</CardTitle>
            <span className="tabular text-[12px] text-muted-foreground">{s.passages.length}</span>
          </CardHeader>
          <ol className="divide-y">
            {s.passages.map((p) => {
              const quotes = quotedBy(p.anchor);
              return (
                <li key={p.anchor} className={quotes.length ? "bg-warning/10 px-5 py-3" : "px-5 py-3"}>
                  <div className="mb-1 flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
                    <span>{p.anchor}</span>
                    {p.heading && <span className="font-sans">· {p.heading}</span>}
                  </div>
                  <Markdown text={p.text} projectKey={key} />
                  {quotes.length > 0 && (
                    <p className="mt-2 flex flex-wrap gap-2 text-[12px]">
                      {t("src.quotedBy")}:
                      {quotes.map((c) => (
                        <Link key={c.requirement.code} to="/projects/$key/requirements/$code" params={{ key, code: c.requirement.code }} className="font-mono text-primary hover:underline">{c.requirement.code}</Link>
                      ))}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("src.versions")}</CardTitle>
          </CardHeader>
          <ul className="divide-y">
            {s.versions.map((v) => (
              <li key={v.id} className="px-5 py-3 text-[12.5px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">v{v.version}</span>
                  <Badge tone={v.final ? "success" : "warning"}>{v.final ? t("src.final") : t("src.draft")}</Badge>
                </div>
                <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{v.hash}</p>
                <p className="text-muted-foreground">{formatDateTime(v.createdAt, lang)}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
