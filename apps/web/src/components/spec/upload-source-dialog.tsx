import { ROLES } from "@lastro/shared";
import { Upload } from "lucide-react";
import { useState } from "react";
import { FormDialog } from "@/components/common/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n";

/** Sends a file to the intake route: it becomes a new source or a new version of an existing one. */
export function UploadSourceDialog({ projectKey, sources }: { projectKey: string; sources: { code: string; title: string }[] }) {
  const { t } = useI18n();
  const { run } = useAction(projectKey);
  const [file, setFile] = useState<File | null>(null);
  const [from, setFrom] = useState<(typeof ROLES)[number]>("client");
  const [target, setTarget] = useState("");
  async function send() {
    if (!file) return null;
    const body = new FormData();
    body.set("file", file);
    body.set("from", from);
    if (target) body.set("source", target);
    const res = await fetch(`/api/projects/${projectKey}/sources`, { method: "POST", body });
    if (!res.ok) throw new Error((await res.json().catch(() => ({ error: res.statusText }))).error);
    return res.json();
  }
  return (
    <FormDialog
      trigger={<Button><Upload /> {t("src.upload")}</Button>}
      title={t("src.upload.title")}
      description={t("src.upload.body")}
      submitLabel={t("src.upload")}
      disabled={!file}
      onSubmit={() => run(send, t("action.done"))}
    >
      <label className="grid gap-1.5 text-[13px] font-medium">
        {t("src.upload.file")}
        <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="py-1.5" />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-[13px] font-medium">
          {t("src.upload.from")}
          <Select value={from} onChange={(e) => setFrom(e.target.value as typeof from)}>
            {ROLES.map((r) => <option key={r} value={r}>{t(`role.${r}`)}</option>)}
          </Select>
        </label>
        <label className="grid gap-1.5 text-[13px] font-medium">
          {t("src.upload.newVersion")}
          <Select value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">{t("src.upload.newSource")}</option>
            {sources.map((s) => <option key={s.code} value={s.code}>{s.code} · {s.title}</option>)}
          </Select>
        </label>
      </div>
    </FormDialog>
  );
}
