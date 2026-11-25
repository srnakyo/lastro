import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Package as PackageIcon, Plus } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { FormDialog } from "@/components/common/form-dialog";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { closePackage, createPackage } from "@/fns/decisions";
import { packagesQuery } from "@/hooks/spec-queries";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n";

const DONE = ["verified", "previewed", "delivered", "accepted"];

export const Route = createFileRoute("/_app/projects/$key/requirements/packages")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(packagesQuery(params.key)),
  component: Packages,
});

function NewPackage({ projectKey }: { projectKey: string }) {
  const { t } = useI18n();
  const { run } = useAction(projectKey);
  const [title, setTitle] = useState("");
  return (
    <FormDialog
      trigger={<Button><Plus /> {t("pkg.new")}</Button>}
      title={t("pkg.new")}
      submitLabel={t("common.save")}
      disabled={!title}
      onSubmit={() => run(() => createPackage({ data: { key: projectKey, input: { title } } }), t("action.done"))}
    >
      <label className="grid gap-1.5 text-[13px] font-medium">
        {t("pkg.name")}
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
    </FormDialog>
  );
}

function Packages() {
  const { t } = useI18n();
  const { key } = Route.useParams();
  const { data: packages } = useSuspenseQuery(packagesQuery(key));
  const { run } = useAction(key);
  return (
    <>
      <PageHeader title={t("spec.tabs.packages")} description={t("pkg.lead")} actions={<NewPackage projectKey={key} />} />
      {packages.length === 0 ? (
        <EmptyState icon={<PackageIcon />} title={t("pkg.empty")} body={t("pkg.lead")} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {packages.map((p) => {
            const done = p.requirements.filter((r) => DONE.includes(r.status)).length;
            const pct = p.requirements.length ? Math.round((done / p.requirements.length) * 100) : 0;
            return (
              <Card key={p.code} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[11.5px] text-muted-foreground">{p.code}</p>
                    <Link to="/projects/$key/requirements" params={{ key }} search={{ pkg: p.code }} className="font-semibold hover:text-primary">
                      {p.title}
                    </Link>
                  </div>
                  <Badge tone={p.closedAt ? "neutral" : "primary"}>{p.closedAt ? t("pkg.closed") : t("pkg.open")}</Badge>
                </div>
                <p className="mt-3 text-[12.5px] text-muted-foreground">{t("pkg.progress", { done, total: p.requirements.length })}</p>
                <Progress value={pct} className="mt-1.5" />
                {p.sources.length > 0 && <p className="mt-3 text-[12px] text-muted-foreground">{p.sources.map((s) => `${s.code} · ${s.title}`).join(", ")}</p>}
                {!p.closedAt && (
                  <div className="mt-4">
                    <ConfirmDialog
                      trigger={<Button variant="outline" size="sm">{t("pkg.close")}</Button>}
                      title={t("pkg.close.title")}
                      description={t("pkg.close.body")}
                      confirmLabel={t("pkg.close")}
                      onConfirm={() => run(() => closePackage({ data: { key, code: p.code } }), t("action.done"))}
                    />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
