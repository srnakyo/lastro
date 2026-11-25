import { values } from "@lastro/docs";
/** The screen languages; kept here so this module loads outside the React app (unit tests, servers). */
type Lang = "en" | "pt-BR";

/**
 * The server writes its errors in English, for the API, the CLI and agents. On a Portuguese screen, the
 * errors a person can meet are rewritten here; anything else is shown as the server wrote it.
 */
const PT: [RegExp, (m: RegExpExecArray, w: ReturnType<typeof values>) => string][] = [
  [/^(\S+) cannot be approved yet$/, (m) => `${m[1]} ainda não pode ser aprovado: veja na página dele o que falta.`],
  [/^(\S+) still has pending requirements$/, (m) => `${m[1]} ainda tem requisitos pendentes.`],
  [/^a workspace keeps at least one owner$/, () => "O workspace precisa manter pelo menos um dono."],
  [/^(\S+) already has this content as version (\d+)$/, (m) => `${m[1]} já tem esse conteúdo na versão ${m[2]}.`],
  [/^(\S+) is already answered$/, (m) => `${m[1]} já foi respondida.`],
  [/^(\S+) is already a member$/, (m) => `${m[1]} já é membro.`],
  [/^project (\S+) already exists$/, (m) => `Já existe um projeto com a chave ${m[1]}.`],
  [/^workspace (\S+) already exists$/, (m) => `Já existe um workspace com o identificador ${m[1]}.`],
  [/^(\S+) already exists$/, (m) => `${m[1]} já existe.`],
  [/^could not generate a free (\S+) code$/, (m) => `Não foi possível gerar um código ${m[1]} livre. Tente de novo.`],
  [/^invalid or revoked token$/, () => "Token inválido ou revogado."],
  [/^invalid token$/, () => "Token inválido."],
  [/^not a member of this workspace$/, () => "Você não é membro deste workspace."],
  [/^only owners and admins manage members$/, () => "Só donos e admins gerenciam membros."],
  [/^(.+) needs a person; agents cannot do it$/, (m) => `${m[1]} precisa de uma pessoa: agentes não podem fazer isso.`],
  [/^(\S+) (\S+) is locked; a person must unlock it$/, (m) => `${m[1]} ${m[2]} está travado: uma pessoa precisa destravar.`],
  [/^(\S+) is (\S+); report an incident to change what was delivered$/, (m, w) => `${m[1]} está ${w.of("status", m[2])}: registre um incidente para mudar o que foi entregue.`],
  [/^(\S+): (\S+) → (\S+) is not allowed for (\S+)$/, (m, w) => `${m[1]}: de ${w.of("status", m[2])} para ${w.of("status", m[3])} não é permitido para ${w.of("actor", m[4])}.`],
  [/^nobody signed up with (\S+): ask them to create an account first$/, (m) => `Ninguém se cadastrou com ${m[1]}: peça para a pessoa criar uma conta antes.`],
  [/^a bug needs the regression test that will cover it$/, () => "Um bug precisa do teste de regressão que vai cobri-lo."],
  [/^acceptance needs a reference$/, () => "O aceite precisa de uma referência: a mensagem, o e-mail ou o link."],
  [/^dropping needs a reason$/, () => "Descartar precisa de um motivo."],
  [/^slug: lowercase letters, digits and hyphens, 3 to 40 characters$/, () => "Identificador: letras minúsculas, números e hífens, de 3 a 40 caracteres."],
  [/^project (\S+) not found$/, (m) => `Projeto ${m[1]} não encontrado.`],
  [/^(.+) not found$/, (m) => `${m[1]} não encontrado.`],
];

/** An error message in the screen's language when Lastro knows it. */
export function errorText(lang: Lang, message: string): string {
  if (lang === "en") return message;
  const w = values(lang);
  for (const [re, write] of PT) {
    const m = re.exec(message.trim());
    if (m) return write(m, w);
  }
  return message;
}

const AUTH_PT: Record<string, string> = {
  USER_ALREADY_EXISTS: "Já existe uma conta com esse e-mail.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Já existe uma conta com esse e-mail.",
  PASSWORD_TOO_SHORT: "A senha é curta demais.",
  PASSWORD_TOO_LONG: "A senha é longa demais.",
  INVALID_EMAIL: "E-mail inválido.",
  INVALID_EMAIL_OR_PASSWORD: "E-mail ou senha não conferem com nenhuma conta.",
};

/** A sign-up or sign-in error from the auth library, by its code, in the screen's language. */
export function authErrorText(lang: Lang, error: { code?: string; message?: string }, fallback: string): string {
  if (lang === "pt-BR" && error.code && AUTH_PT[error.code]) return AUTH_PT[error.code] as string;
  return lang === "en" && error.message ? error.message : fallback;
}
