/**
 * Words for the codes the data stores (statuses, actors, results, blocker kinds, lifecycle reasons), so diagrams
 * and documents read in their language. A code without a word here is shown as stored.
 */
type Lang = "en" | "pt-BR";
type Words = Record<string, string>;

const EN: Words = {
  "status.captured": "captured", "status.specified": "specified", "status.approved": "approved", "status.building": "building", "status.verified": "verified", "status.previewed": "preview approved", "status.delivered": "delivered", "status.accepted": "accepted", "status.reopened": "reopened", "status.dropped": "dropped",
  "actor.user": "person", "actor.agent": "agent", "actor.system": "Lastro",
  "result.passed": "passed", "result.failed": "failed", "result.error": "error", "result.skipped": "skipped", "result.running": "running",
  "trigger.agent": "agent", "trigger.ci": "CI", "trigger.dev": "dev", "trigger.manual": "manual",
  "decision.proposed": "proposed", "decision.confirmed": "confirmed", "decision.overturned": "overturned",
  "kind.decision": "decision", "kind.assumption": "assumption", "kind.client_answer": "client answer",
  "blocker.unknown_type": "type not configured", "blocker.missing_field": "missing field", "blocker.missing_source": "source does not exist", "blocker.invalid_quote": "quote not found", "blocker.open_question": "open question", "blocker.source_not_final": "source not final", "blocker.unconfirmed_transcript": "transcript quote not confirmed", "blocker.criterion_without_test": "criterion without a test", "blocker.no_evidence": "no evidence", "blocker.decision_overturned": "decision overturned",
  "reason.created": "created", "reason.spec complete": "spec complete", "reason.spec incomplete": "spec incomplete", "reason.decision overturned": "a decision was overturned", "reason.criteria unlocked": "criteria unlocked", "reason.verification failed": "verification failed", "reason.stale evidence": "evidence went stale", "reason.spec changed after approval": "spec changed after approval",
  "reason.run": "run {v}", "reason.branch": "branch {v}", "reason.incident": "incident {v}", "reason.answer": "answer to {v}",
  "type.behavior": "behaviour", "type.calculation": "calculation", "type.ui": "interface", "type.integration": "integration", "type.data": "data", "type.content": "content", "type.security": "security", "type.performance": "performance",
  "role.client": "requester", "role.dev": "developer", "role.team": "team",
  "dia.blocked": "blocked", "dia.sourceNotFinal": "source not final", "dia.quoteNotFound": "quote not found", "dia.noTest": "no test", "dia.notRun": "not run", "dia.run": "run",
};

const PT: Words = {
  "status.captured": "capturado", "status.specified": "especificado", "status.approved": "aprovado", "status.building": "em implementação", "status.verified": "verificado", "status.previewed": "prévia aprovada", "status.delivered": "entregue", "status.accepted": "aceito", "status.reopened": "reaberto", "status.dropped": "descartado",
  "actor.user": "pessoa", "actor.agent": "agente", "actor.system": "Lastro",
  "result.passed": "passou", "result.failed": "falhou", "result.error": "erro", "result.skipped": "pulado", "result.running": "rodando",
  "trigger.agent": "agente", "trigger.ci": "CI", "trigger.dev": "dev", "trigger.manual": "manual",
  "decision.proposed": "proposta", "decision.confirmed": "confirmada", "decision.overturned": "derrubada",
  "kind.decision": "decisão", "kind.assumption": "suposição", "kind.client_answer": "resposta do cliente",
  "blocker.unknown_type": "tipo não configurado", "blocker.missing_field": "campo faltando", "blocker.missing_source": "fonte não existe", "blocker.invalid_quote": "citação não encontrada", "blocker.open_question": "pergunta em aberto", "blocker.source_not_final": "fonte não é final", "blocker.unconfirmed_transcript": "citação de transcrição sem confirmar", "blocker.criterion_without_test": "critério sem teste", "blocker.no_evidence": "sem evidência", "blocker.decision_overturned": "decisão derrubada",
  "reason.created": "registrado", "reason.spec complete": "especificação completa", "reason.spec incomplete": "especificação incompleta", "reason.decision overturned": "uma decisão foi derrubada", "reason.criteria unlocked": "critérios destravados", "reason.verification failed": "a verificação falhou", "reason.stale evidence": "a evidência venceu", "reason.spec changed after approval": "a especificação mudou depois da aprovação",
  "reason.run": "execução {v}", "reason.branch": "branch {v}", "reason.incident": "incidente {v}", "reason.answer": "resposta a {v}",
  "type.behavior": "comportamento", "type.calculation": "cálculo", "type.ui": "interface", "type.integration": "integração", "type.data": "dados", "type.content": "conteúdo", "type.security": "segurança", "type.performance": "desempenho",
  "role.client": "quem pediu", "role.dev": "desenvolvedor", "role.team": "time",
  "dia.blocked": "travado", "dia.sourceNotFinal": "fonte não é final", "dia.quoteNotFound": "citação não encontrada", "dia.noTest": "sem teste", "dia.notRun": "não rodou", "dia.run": "execução",
};

export type ValueGroup = "status" | "actor" | "result" | "trigger" | "decision" | "kind" | "blocker" | "type" | "role";

export interface Values {
  /** The word for a stored code, or the code itself when there is none. */
  of: (group: ValueGroup, code: string | null | undefined) => string;
  /** A lifecycle reason in words: fixed phrases, or "run …", "branch …", "incident …", "answer to …". */
  reason: (reason: string | null | undefined) => string;
  /** A word used inside diagrams. */
  word: (key: "blocked" | "sourceNotFinal" | "quoteNotFound" | "noTest" | "notRun" | "run") => string;
}

const PATTERNS: [RegExp, string][] = [
  [/^run (.+)$/, "reason.run"],
  [/^branch (.+)$/, "reason.branch"],
  [/^incident (.+)$/, "reason.incident"],
  [/^answer to (.+)$/, "reason.answer"],
];

export function values(lang: Lang = "en"): Values {
  const w = lang === "pt-BR" ? PT : EN;
  return {
    of: (group, code) => (code ? (w[`${group}.${code}`] ?? code) : ""),
    reason: (reason) => {
      if (!reason) return "";
      const fixed = w[`reason.${reason}`];
      if (fixed) return fixed;
      for (const [re, key] of PATTERNS) {
        const m = re.exec(reason);
        if (m) return (w[key] ?? key).replace("{v}", m[1] ?? "");
      }
      return reason;
    },
    word: (key) => w[`dia.${key}`] ?? key,
  };
}
