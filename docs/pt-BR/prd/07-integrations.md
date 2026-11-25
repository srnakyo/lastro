# 7. Integrações

## Claude Code

`lastro setup claude` instala os três pedaços de uma vez:

- **Servidor MCP** no `.mcp.json` do projeto (ver [Interfaces](06-interfaces.md)).
- **Hooks** no `.claude/settings.json` do projeto (ver [Como obrigar o agente a seguir](05-enforcement.md)).
- **Seção marcada** no `CLAUDE.md`.

Também sai como **plugin do Claude Code**, com hooks, MCP e skills juntos:

| Skill | Para quê |
|---|---|
| `/lastro:intake` | Registra a fonte, quebra em requisitos atômicos com citação literal e lista o que ficou em aberto |
| `/lastro:spec` | Completa os campos obrigatórios de um pacote e transforma dúvidas em perguntas ou decisões |
| `/lastro:build` | Pega o próximo requisito `approved`, implementa, liga os testes e roda `lastro_verify` até passar |
| `/lastro:report` | Gera o relatório do pacote para quem pediu |
| `/lastro:triage` | Recebe uma reclamação, registra o incidente e propõe triagem, causa e cobrança |

## Claude Ship

O Claude Ship cuida do pull request: o **Code Review** revisa, o **PR Steward** corrige CI quebrado, conflitos e comentários, e o **Claude Approvals** aplica a política de aprovação do time. Ele começa quando o código já existe e não sabe o que o cliente pediu. O Lastro entrega isso a ele.

Limites do Claude Ship que valem para o desenho:

- Funciona só nos planos Team e Enterprise e só com repositórios no GitHub.
- Não funciona com Zero Data Retention, com a configuração HIPAA nem com chaves de criptografia gerenciadas pelo cliente.
- O PR Steward e o Claude Approvals estão em beta.
- O uso é cobrado por tokens.

Por isso **o Lastro funciona sozinho**, e o Claude Ship entra como adaptador opcional (`lastro setup claude-ship`).

### `/ship` com o Lastro

1. O desenvolvedor roda `/ship` no Claude Code.
2. O `/ship` faz o push. O hook `pre-push` do Lastro bloqueia se um requisito tocado não está verificado. O agente recebe o motivo e resolve antes.
3. O PR abre. O CI do Lastro publica o check "Lastro gate" e escreve o bloco de rastreio na descrição.
4. Se o "Lastro gate" falha, o **PR Steward** trata como qualquer check quebrado. A saída do gate separa:
   - **o que o agente resolve**: teste falhando, condição sem execução, critério sem teste;
   - **o que só uma pessoa resolve**: aprovação, prévia, etapa manual, pergunta ao cliente.

   Para a segunda parte, a saída diz explicitamente para o Steward não tentar e marcar uma pessoa.

### Code Review

`lastro export review-md` mantém uma seção marcada no `REVIEW.md`, gerada a partir de:

- o glossário ("no código, o papel chamado de 'gerente' pelo cliente é `manager`");
- as invariantes ("regra de negócio e permissão são calculadas na API");
- o contrato de layout ("só `app-modal`, `app-tabs`, `app-filter-bar`; nenhuma cor fora da paleta").

O Code Review passa a revisar contra as regras do projeto, não só contra boas práticas gerais.

### Claude Approvals

O que o Approvals consegue e não consegue ler muda o desenho:

- As regras do Approvals **não leem outros checks** nem resultados de CI. O "Lastro gate" não entra na política. Ele fica obrigatório na proteção da branch, ao lado do check "Claude Approvals".
- Um **classificador próprio** (`repo/<nome>`) lê o título, a descrição, os arquivos alterados e o diff do PR, além dos arquivos da própria pasta dele. Ele não lê o resto do repositório.

O Lastro usa isso assim:

1. O CI escreve na descrição do PR o bloco do Lastro: requisitos, critérios de aceite, alcance e decisões.
2. Um classificador `repo/lastro_scope` confere se o diff fica dentro desses requisitos. É ele que pega "controles que entraram sem ninguém pedir".
3. A política exige uma pessoa para mudanças no contrato (`.lastro/**`) e nos caminhos que o projeto marcar como sensíveis (dinheiro, permissão).

A descrição do PR é texto que o autor pode editar e que pode tentar influenciar o classificador. Por isso o classificador é apoio, e a trava firme continua sendo o "Lastro gate" obrigatório.

Esboço gerado pelo adaptador, sempre começando em modo de observação. Antes de ativar, revise com a skill `claude-approvals` do Claude Code: chave desconhecida faz o arquivo inteiro deixar de valer.

```yaml
# .claude/approvals.yml (esboço)
version: 1
mode: observe
rules:
  - purpose: "Base: o autor e mais uma pessoa. Claude aprova quando a revisão passa e o diff fica no escopo do Lastro."
    paths: ["**"]
    verdict: { claude: comments, seats: 2 }
    override:
      - { if: "claude/code_review = pass AND repo/lastro_scope = pass", verdict: { claude: approves, seats: 1 } }
  - purpose: "O contrato do Lastro e os caminhos sensíveis sempre com uma pessoa além do autor."
    paths: [".lastro/**", "src/billing/**", "src/permissions/**"]
    verdict: { claude: comments, seats: 2 }
  - purpose: "Regras de revisão e classificadores: o autor e mais uma pessoa."
    paths: ["**/.claude/**", "**/REVIEW.md", "**/.gitattributes", "**/.gitmodules"]
    nested: inherit
    verdict: { claude: comments, seats: 2 }
```

```yaml
# .claude/classifiers/lastro_scope/def.yml (esboço)
version: 1
description: "O diff fica dentro dos requisitos listados no bloco do Lastro da descrição?"
model: opus
prompt: |
  A descrição do PR tem um bloco entre <!-- lastro:start --> e <!-- lastro:end -->
  com os requisitos (id, statement, where, reach, critérios de aceite).
  pass: toda mudança de comportamento visível no diff é explicada por um desses requisitos.
  fail: o diff muda comportamento, tela, regra ou permissão que nenhum requisito pede,
  ou o bloco não existe. Na dúvida, fail.
outputs:
  scope: { type: ordinal, values: [fail, pass] }
```

Como as regras se somam: vale a mais estrita, e `seats: 2` é o autor mais uma pessoa. Um PR que só toca código comum, com revisão e escopo aprovados, precisa do autor e pode receber a aprovação do Claude. Um PR que toca `.lastro/**` ou `src/billing/**` sempre precisa de mais uma pessoa.

## GitHub

- **Action** `lastro gate --ci`: roda as etapas automáticas num ambiente limpo, publica o check "Lastro gate" com uma tabela por requisito e atualiza o bloco do PR.
- **Proteção de branch**: o adaptador mostra o passo a passo para marcar "Lastro gate" como obrigatório. Só um admin do repositório faz isso.
- **Comentário fixo no PR**, opcional, com o resumo do gate e os links para os prints.

GitLab e outros: o mesmo comando roda em qualquer CI. O check e o bloco do PR dependem de adaptador.

## Executores de teste e análise

O Lastro não sabe rodar teste de nenhuma linguagem: ele roda o comando do projeto e lê formatos padrão.

| Formato | De onde vem |
|---|---|
| JUnit XML | Vitest, Jest, Playwright, pytest, PHPUnit, Pest, go test (via gotestsum), JUnit, RSpec |
| SARIF | ESLint, Semgrep, Ruff, PHPStan (com formatador), CodeQL |
| LCOV, Cobertura | Cobertura, opcional e só informativa |

O vínculo entre critério e teste é pelo nome do caso no JUnit (`arquivo::nome do teste`), então funciona em qualquer stack que gere JUnit.

### Playwright

- As capturas e vídeos anexados ao relatório viram artefatos do Lastro, ligados à condição em que rodaram.
- A comparação visual do próprio Playwright (`toHaveScreenshot`) pode usar a tela de referência do requisito (`visual_ref`) como base.
- As condições do `lastro.yml` chegam aos testes por variáveis de ambiente (`E2E_PROFILE`, `E2E_THEME`, `E2E_ZOOM`). Cada projeto decide como o teste usa cada uma.

## Ferramentas de conhecimento de projeto

O Lastro guarda o contrato de **um repositório**. Ferramentas que centralizam vários projetos podem ler `.lastro/` e o histórico pelo CLI (`lastro export --json`) para dar a visão entre projetos ou um portal para o cliente. A primeira integração planejada é a Loqivo.
