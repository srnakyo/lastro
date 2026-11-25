import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { FormDialog } from "@/components/common/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveDesignContract, saveInvariant, saveTerm } from "@/fns/glossary";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n";
import { fromLines, fromPairs, toLines, toPairs } from "@/lib/lines";

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <label className="grid gap-1.5 text-[13px] font-medium">{label}{children}</label>;

export function TermDialog({ projectKey, initial }: { projectKey: string; initial?: { term: string; means: string; note: string | null } }) {
  const { t } = useI18n();
  const { run } = useAction(projectKey);
  const [term, setTerm] = useState(initial?.term ?? "");
  const [means, setMeans] = useState(initial?.means ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  return (
    <FormDialog
      trigger={initial ? <Button size="sm" variant="ghost" aria-label={`${t("common.edit")} ${initial.term}`}><Pencil /></Button> : <Button size="sm" variant="outline"><Plus /> {t("glossary.addTerm")}</Button>}
      title={initial ? initial.term : t("glossary.addTerm")}
      submitLabel={t("common.save")}
      disabled={!term.trim() || !means.trim()}
      onSubmit={() => run(() => saveTerm({ data: { key: projectKey, term: { term: term.trim(), means: means.trim(), note: note.trim() || undefined } } }), t("action.done"))}
    >
      <Field label={t("glossary.term")}><Input value={term} onChange={(e) => setTerm(e.target.value)} disabled={!!initial} /></Field>
      <Field label={t("glossary.means")}><Textarea value={means} onChange={(e) => setMeans(e.target.value)} rows={3} /></Field>
      <Field label={t("glossary.note")}><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
    </FormDialog>
  );
}

export function InvariantDialog({ projectKey, next, initial }: { projectKey: string; next: string; initial?: { code: string; text: string; testRefs: string[] } }) {
  const { t } = useI18n();
  const { run } = useAction(projectKey);
  const [text, setText] = useState(initial?.text ?? "");
  const [tests, setTests] = useState(toLines(initial?.testRefs ?? []));
  const code = initial?.code ?? next;
  return (
    <FormDialog
      trigger={initial ? <Button size="sm" variant="ghost" aria-label={`${t("common.edit")} ${initial.code}`}><Pencil /></Button> : <Button size="sm" variant="outline"><Plus /> {t("glossary.addInvariant")}</Button>}
      title={code}
      submitLabel={t("common.save")}
      disabled={!text.trim()}
      onSubmit={() => run(() => saveInvariant({ data: { key: projectKey, invariant: { code, text: text.trim(), testRefs: fromLines(tests) } } }), t("action.done"))}
    >
      <Field label={t("glossary.invariant.text")}><Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} /></Field>
      <Field label={t("glossary.invariant.tests")}><Textarea value={tests} onChange={(e) => setTests(e.target.value)} rows={3} className="font-mono text-[12px]" /></Field>
    </FormDialog>
  );
}

interface Contract {
  components: Record<string, string>;
  forbidden: string[];
  palette: Record<string, string>;
  referenceScreens: string[];
}

export function DesignDialog({ projectKey, initial }: { projectKey: string; initial: Contract }) {
  const { t } = useI18n();
  const { run } = useAction(projectKey);
  const [forbidden, setForbidden] = useState(toLines(initial.forbidden));
  const [components, setComponents] = useState(toPairs(initial.components));
  const [palette, setPalette] = useState(toPairs(initial.palette));
  const [screens, setScreens] = useState(toLines(initial.referenceScreens));
  return (
    <FormDialog
      trigger={<Button size="sm" variant="outline"><Pencil /> {t("common.edit")}</Button>}
      title={t("glossary.design")}
      submitLabel={t("common.save")}
      onSubmit={() => run(() => saveDesignContract({ data: { key: projectKey, contract: { forbidden: fromLines(forbidden), components: fromPairs(components), palette: fromPairs(palette), referenceScreens: fromLines(screens) } } }), t("action.done"))}
    >
      <Field label={t("glossary.design.forbidden")}><Textarea value={forbidden} onChange={(e) => setForbidden(e.target.value)} rows={3} /></Field>
      <Field label={t("glossary.design.components")}><Textarea value={components} onChange={(e) => setComponents(e.target.value)} rows={3} className="font-mono text-[12px]" /></Field>
      <Field label={t("glossary.design.palette")}><Textarea value={palette} onChange={(e) => setPalette(e.target.value)} rows={3} className="font-mono text-[12px]" /></Field>
      <Field label={t("glossary.design.screens")}><Textarea value={screens} onChange={(e) => setScreens(e.target.value)} rows={2} className="font-mono text-[12px]" /></Field>
    </FormDialog>
  );
}
