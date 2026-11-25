import { FileText } from "lucide-react";
import { useState } from "react";
import { FormDialog } from "@/components/common/form-dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { generateDocs } from "@/fns/docs";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n";

export function GenerateDocsDialog({ projectKey }: { projectKey: string }) {
  const { t, lang: uiLang } = useI18n();
  const { run } = useAction(projectKey);
  const [lang, setLang] = useState<"en" | "pt-BR">(uiLang);
  return (
    <FormDialog
      trigger={<Button><FileText /> {t("docs.generate")}</Button>}
      title={t("docs.generate.title")}
      description={t("docs.generate.body")}
      submitLabel={t("docs.generate")}
      onSubmit={() => run(() => generateDocs({ data: { key: projectKey, lang } }), t("docs.generated"))}
    >
      <label className="grid gap-1.5 text-[13px] font-medium">{t("docs.language")}
        <Select value={lang} onChange={(e) => setLang(e.target.value as typeof lang)}>
          <option value="en">English</option>
          <option value="pt-BR">Português (Brasil)</option>
        </Select>
      </label>
    </FormDialog>
  );
}
