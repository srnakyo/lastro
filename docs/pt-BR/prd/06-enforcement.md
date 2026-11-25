# 6. Como obrigar o agente a seguir

Nenhuma ferramenta consegue garantir que um agente externo obedeça a um sistema que ele pode contornar. Por isso o Lastro trabalha em três níveis, e só o terceiro é garantia de verdade.

| Nível | Mecanismo | O que segura |
|---|---|---|
| 1. Orientação | Contexto injetado e instruções geradas | O agente sabe o que está em jogo e o que o gate vai cobrar |
| 2. Controle | Hooks do agente e servidor MCP | O agente não encerra com o gate vermelho, não edita teste travado, não roda comando humano |
| 3. Bloqueio externo | Hook de git, check obrigatório no CI e proteção de branch | Nada chega à branch principal sem lastro, com ou sem agente |

## Nível 1: orientação

`lastro setup claude` (ou `codex`, `gemini`, `cursor`) gera e mantém uma seção marcada no `CLAUDE.md` ou no `AGENTS.md`:

```markdown
<!-- lastro:start -->
Este projeto usa o Lastro. Antes de implementar, chame `lastro_context`.
- Só trabalhe em requisitos `approved`. Use `lastro_start` antes de mexer no código.
- Não presuma em silêncio: registre com `lastro_record_decision` ou pergunte com `lastro_ask`.
- Quem verifica é o Lastro: rode `lastro_verify`. Não diga que terminou com o gate vermelho.
- Critérios e testes travados não se editam.
<!-- lastro:end -->
```

O texto fica curto de propósito. O contexto de verdade vem pelo MCP e pelo hook de início de sessão.

## Nível 2: controle no Claude Code

`lastro setup claude` registra os hooks no `.claude/settings.json` do projeto e o servidor MCP no `.mcp.json`. Também é distribuído como plugin do Claude Code, com os hooks, o MCP e as skills juntos.

| Hook | O que o Lastro faz |
|---|---|
| **Início de sessão** (também depois de compactação e de `/clear`) | Injeta o pacote ativo, os requisitos `approved` e `building`, o glossário, as invariantes, o contrato de layout e as decisões recentes. Resolve o "esqueceu o que tinha sido combinado" |
| **Antes de ferramenta: Edit, Write e afins** | Nega edição de arquivo de critério ou de teste travado, com a mensagem: "teste travado em REQ-K7Q2M; peça ao desenvolvedor `lastro unlock`" |
| **Antes de ferramenta: Bash** | Nega os comandos humanos (`lastro approve`, `accept`, `unlock`, `check --manual`, `decision confirm`, `source final`). Opcional: nega `git push` para a branch principal com o gate vermelho |
| **Fim de resposta** | Roda `lastro gate --session`. Se há requisito em `building` com mudanças sem verificação, ou se o agente pediu `lastro_submit` e o gate está vermelho, bloqueia o fim e devolve o que falta. Não bloqueia quando o agente abriu uma pergunta ou registrou uma pausa com motivo. Tem limite de bloqueios seguidos, para não prender o agente em laço |
| **Depois de ferramenta** | Registra no histórico quais arquivos o agente mexeu, para preencher `touches` e detectar mudança fora do alcance declarado |

### Por que o agente não consegue "dizer que passou"

- O gate só aceita evidência que o próprio Lastro gerou, rodando o comando e lendo o JUnit ou o SARIF.
- `lastro_verify` pelo MCP executa os comandos. O agente recebe o resultado, não escreve o resultado.
- No CI, o gate não confia em evidência guardada: roda todas as etapas automáticas de novo. A evidência do servidor serve para o painel, o relatório e o PR, não como prova final.
- Editar a exportação `.lastro/` à mão não libera nada: o gate confere o hash de cada critério travado, e o `lastro import` só aplica uma ação humana com o token de uma pessoa.

### Comandos humanos

As ações que dependem de uma pessoa são:

- aprovar spec;
- confirmar ou derrubar decisão;
- destravar critério;
- tirar um item do escopo;
- registrar a resposta de uma pergunta;
- confirmar a triagem de um incidente;
- marcar uma fonte como final;
- registrar etapa manual;
- registrar prévia;
- aceitar entrega.

Elas:

- são recusadas pelo núcleo quando quem pede é um agente: o serviço confere o ator (a sessão de uma pessoa no painel, o token de uma pessoa ou o token de um agente) antes de gravar, venha o pedido do painel, da API, da CLI ou do MCP;
- não existem no servidor MCP;
- são bloqueadas para o agente pelo hook de Bash;
- pedem confirmação interativa no terminal;
- no gate offline do CI, que lê o `.lastro/`, só contam quando o commit que as trouxe é de uma identidade permitida (`gate.human_identities` no `lastro.yml`) ou quando o PR foi aprovado por uma pessoa.

## Nível 3: bloqueio externo

- **Hook `pre-push` do git** (`lastro setup git`): roda `lastro gate --changed` e bloqueia o push quando um requisito tocado não está verificado.
- **Check no CI** (`lastro gate --ci`): roda todas as etapas automáticas de novo num ambiente limpo, confere os travamentos e publica o check "Lastro gate" com uma tabela por requisito. Com servidor, envia as execuções para ele; sem servidor, roda offline com os critérios travados do `.lastro/`. Marcado como obrigatório na proteção da branch principal, ele impede o merge.
- **Bloco no PR**: o CI escreve ou atualiza, na descrição do PR, um bloco marcado com os requisitos, as decisões e a evidência. Serve para quem revisa e para as integrações (ver [Integrações](08-integrations.md)).

## Outros agentes

| Agente | Nível 1 | Nível 2 | Nível 3 |
|---|---|---|---|
| Claude Code | `CLAUDE.md` + MCP | Hooks completos | Git + CI |
| Codex CLI, Gemini CLI, Cursor | `AGENTS.md` + MCP | Os hooks que cada um oferecer, via adaptador | Git + CI |
| Qualquer outro | `AGENTS.md` | Nenhum | Git + CI |

O nível 3 vale para todos. Os níveis 1 e 2 reduzem o retrabalho; o nível 3 garante o resultado.
