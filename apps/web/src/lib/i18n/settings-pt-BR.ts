import type { settingsEn } from "./settings-en";

export const settingsPtBR: Record<keyof typeof settingsEn, string> = {
  "settings.lead": "Tokens para a CLI, o CI e os agentes, e os fluxos de qualidade deste projeto.",
  "tokens.title": "Tokens de acesso",
  "tokens.lead": "Token de pessoa age como essa pessoa na CLI e no CI. Token de agente é para o MCP: nunca aprova, aceita nem destrava.",
  "tokens.new": "Novo token",
  "tokens.name": "Nome",
  "tokens.kind": "Tipo",
  "tokens.kind.person": "Pessoa (CLI, CI)",
  "tokens.kind.agent": "Agente (MCP)",
  "tokens.projectOnly": "Só este projeto",
  "tokens.created": "Copie agora: ele não aparece de novo.",
  "tokens.copy": "Copiar",
  "tokens.copied": "Copiado",
  "tokens.revoke": "Revogar",
  "tokens.revoke.title": "Revogar este token?",
  "tokens.revoke.body": "Tudo o que usa este token para de funcionar na hora.",
  "tokens.revoked": "Revogado",
  "tokens.lastUsed": "Último uso",
  "tokens.never": "nunca",
  "tokens.empty": "Nenhum token ainda.",
  "tokens.mcp": "Endereço do MCP",
};
