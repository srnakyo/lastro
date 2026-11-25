import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Field } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createProject } from "@/fns/projects";
import { keys } from "@/hooks/queries";
import { useI18n } from "@/lib/i18n";

const toKey = (v: string) => v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);

export function NewProjectDialog() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const created = await createProject({ data: { key: key || toKey(name), name, description: description || undefined } });
      await queryClient.invalidateQueries({ queryKey: keys.projects });
      setOpen(false);
      await navigate({ to: "/projects/$key", params: { key: created.key } });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> {t("home.new")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("project.new.title")}</DialogTitle>
          <DialogDescription>{t("onboarding.lead")}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <Field id="p-name" label={t("project.new.name")}>
            <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field id="p-key" label={t("project.new.key")} hint={t("project.new.keyHint")} error={error}>
            <Input id="p-key" value={key || toKey(name)} onChange={(e) => setKey(toKey(e.target.value))} className="font-mono" required />
          </Field>
          <Field id="p-desc" label={t("project.new.description")}>
            <Input id="p-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={!name}>
              {t("project.new.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
