import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CircleHelp } from "lucide-react";
import { useState } from "react";
import { FormDialog } from "@/components/common/form-dialog";
import { PageHeader } from "@/components/page-header";
import { NewQuestionDialog } from "@/components/spec/decision-forms";
import { EmptyState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { answerQuestion } from "@/fns/decisions";
import { questionsQuery } from "@/hooks/spec-queries";
import { useAction } from "@/hooks/use-action";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/projects/$key/requirements/questions")({
  loader: ({ context, params }) => context.queryClient.ensureQueryData(questionsQuery(params.key)),
  component: Questions,
});

function AnswerDialog({ projectKey, code }: { projectKey: string; code: string }) {
  const { t } = useI18n();
  const { run } = useAction(projectKey);
  const [answer, setAnswer] = useState("");
  const [source, setSource] = useState("");
  return (
    <FormDialog
      trigger={<Button size="sm">{t("q.answer")}</Button>}
      title={t("q.answer.title")}
      submitLabel={t("common.save")}
      disabled={!answer}
      onSubmit={() => run(() => answerQuestion({ data: { key: projectKey, code, input: { answer, answerSource: source || undefined, decidedBy: "client" } } }), t("action.done"))}
    >
      <label className="grid gap-1.5 text-[13px] font-medium">{t("q.answer.text")}<Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} /></label>
      <label className="grid gap-1.5 text-[13px] font-medium">{t("q.answer.source")}<Input value={source} onChange={(e) => setSource(e.target.value)} /></label>
    </FormDialog>
  );
}

function Questions() {
  const { t } = useI18n();
  const { key } = Route.useParams();
  const { data: questions } = useSuspenseQuery(questionsQuery(key));
  return (
    <>
      <PageHeader title={t("spec.tabs.questions")} description={t("q.lead")} actions={<NewQuestionDialog projectKey={key} />} />
      {questions.length === 0 ? (
        <EmptyState icon={<CircleHelp />} title={t("q.empty")} body={t("q.lead")} />
      ) : (
        <Card>
          <ul className="divide-y">
            {questions.map((q) => (
              <li key={q.code} className="grid gap-3 px-5 py-4 lg:grid-cols-[1fr_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[12px]">
                    <span className="font-mono text-muted-foreground">{q.code}</span>
                    <Badge tone={q.answer ? "success" : q.blocks ? "danger" : "warning"}>{q.answer ? t("q.answered") : q.blocks ? t("q.blocking") : t("q.open")}</Badge>
                    <span className="text-muted-foreground">{t("q.askedTo")}: {t(`role.${q.askedTo}`)}</span>
                  </div>
                  <p className="mt-1.5 max-w-[90ch] text-[13.5px] font-medium">{q.text}</p>
                  {q.answer && <p className="mt-1 max-w-[90ch] text-[13px] text-success">{q.answer}{q.answerSource ? <span className="text-muted-foreground"> · {q.answerSource}</span> : null}</p>}
                  {q.requirements.length > 0 && (
                    <p className="mt-2 flex flex-wrap gap-2">
                      {q.requirements.map((code) => (
                        <Link key={code} to="/projects/$key/requirements/$code" params={{ key, code }} className="font-mono text-[11.5px] text-primary hover:underline">{code}</Link>
                      ))}
                    </p>
                  )}
                </div>
                {!q.answer && <AnswerDialog projectKey={key} code={q.code} />}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
