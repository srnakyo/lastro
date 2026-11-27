# 7. Interfaces

O Lastro tem quatro portas para o mesmo núcleo: a CLI para pessoas e scripts, o servidor MCP para agentes, o painel para ver, decidir e gerar documentação, e os relatórios para quem pediu. O painel tem capítulo próprio: [Painel, documentação e diagramas](03-dashboard.md).

As três primeiras passam pela API HTTP do servidor do Lastro e pelos mesmos serviços do núcleo. Nenhuma delas abre o banco por conta própria.

## CLI

### Projeto

| Comando | O que faz |
|---|---|
| `lastro login [--url] [--token]` | Conecta a máquina ao servidor do Lastro: a pessoa autoriza no navegador (o mesmo código dos dois lados) e a máquina guarda um token de agente que vale para todos os projetos do workspace, fora do repositório. `--token` recebe um token criado à mão, para o CI ou uma máquina sem navegador |
| `lastro link [<projeto>]` | Liga o repositório a um projeto do servidor e grava a chave dele no `lastro.yml` |
| `lastro init` | Cria o projeto no servidor, liga o repositório a ele e grava o primeiro `.lastro/` com `lastro.yml`, glossário e contrato de layout vazios, e o `.gitignore` da pasta `.out/` |
| `lastro setup claude\|codex\|gemini\|cursor\|git\|github` | Instala as integrações de cada nível |
| `lastro doctor` | Confere configuração, schemas, hooks instalados e comandos do projeto |

### Entrada de material

| Comando | O que faz |
|---|---|
| `lastro intake <arquivo ou pasta>` | Envia o material ao servidor, que registra a fonte, guarda o binário, extrai o texto e o quebra em trechos com âncoras. Se já existe fonte com o mesmo título, cria a nova versão com `supersedes` |
| `lastro source diff <SRC> <SRC>` | Diferença entre duas versões, com os requisitos afetados |
| `lastro source final <SRC>` | Marca a fonte como final. Humano |

O Lastro não chama LLM. A quebra da fonte em requisitos atômicos é feita pelo agente via MCP (`lastro_propose_requirements`), e os itens nascem `captured`.

### Requisitos, decisões e perguntas

| Comando | O que faz |
|---|---|
| `lastro req new\|edit\|show\|list` | Cria, edita, mostra e lista requisitos, com filtros por estado, tipo e pacote |
| `lastro pending [PKG]` | Só o que não chegou em `verified`, agrupado por motivo: falta campo, pergunta aberta, aguardando aprovação, em implementação, gate vermelho |
| `lastro ask <REQ> "<pergunta>" [--blocks]` | Abre pergunta |
| `lastro answer <Q> "<resposta>" --source <SRC@âncora>` | Registra a resposta e cria a decisão `client_answer`. Humano |
| `lastro decide <REQ> "<decisão>" --reason "<motivo>"` | Registra decisão |
| `lastro decision confirm\|overturn <DEC>` | Humano |
| `lastro approve <REQ\|PKG>` | Humano. Também trava os critérios |
| `lastro lock\|unlock <REQ>` | Trava ou destrava critérios e testes. O `unlock` é humano |
| `lastro drop <REQ> --reason "<motivo>"` | Tira o item do escopo. Humano |

### Verificação e entrega

| Comando | O que faz |
|---|---|
| `lastro start <REQ>` | Passa para `building` e registra a branch |
| `lastro verify [REQ\|PKG]` | Roda as etapas automáticas do fluxo, em cada condição exigida, e grava a evidência |
| `lastro check <REQ> <etapa> --pass\|--fail --by <papel> --ref "<referência>"` | Registra etapa manual. Humano |
| `lastro gate [--session\|--changed\|--ci] [REQ]` | Avalia o gate. Sai com código 0 só se passar. Em `--ci` roda tudo de novo |
| `lastro package new\|close\|show` | Gerencia rodadas de entrega |
| `lastro report <PKG> [--format md\|html\|pdf] [--audience client\|dev]` | Relatório item a item |
| `lastro accept <REQ\|PKG> --ref "<referência>"` | Aceite de quem pediu. Humano |
| `lastro incident new "<reclamação>" --source <SRC@âncora>` | Registra incidente e reabre o requisito |
| `lastro incident triage <INC> --triage bug --cause spec_gap --billing courtesy` | Confirma a triagem, a causa e a cobrança. Humano |

### Servidor, documentação e exportação

| Comando | O que faz |
|---|---|
| `lastro export [--out .lastro] [--json]` | Grava o retrato determinístico do projeto em `.lastro/`, para revisão no PR e para o gate offline. Com `--json`, escreve o mesmo conteúdo na saída padrão |
| `lastro import [<pasta>]` | Carrega um retrato `.lastro/` no servidor, mostrando antes o que vai mudar |
| `lastro mcp` | Liga o stdio do agente à rota `/api/mcp` do servidor, com o token |
| `lastro docs build [--format md\|html\|pdf] [--out docs/lastro]` | Gera a documentação do projeto a partir dos dados |
| `lastro token create --name ci` | Cria um token de API para o CI ou para um agente. Humano. O token aparece uma vez só; o servidor guarda o hash |

O servidor não é um comando da CLI. Ele é a aplicação web, que sobe com Docker (`docker compose -f docker/compose.prod.yml up -d`), e as migrações do banco rodam no serviço `migrate` antes de o `web` subir.

## Servidor MCP

O servidor MCP é a rota JSON-RPC `/api/mcp` do servidor do Lastro, com um token Bearer. Para os agentes que só falam stdio, `lastro mcp` faz a ponte. As etapas de `lastro_verify` rodam na máquina do agente, pela ponte, que envia a evidência ao servidor.

Ferramentas para o agente. Nenhuma delas aprova, aceita, destrava ou assina etapa manual.

| Ferramenta | Para quê |
|---|---|
| `lastro_context` | Pacote ativo, requisitos `approved` e `building`, glossário, invariantes, contrato de layout, decisões recentes, perguntas abertas |
| `lastro_get_requirement` | O requisito inteiro, com a citação e o trecho da fonte ao redor da âncora |
| `lastro_list` | Requisitos por estado, tipo e pacote |
| `lastro_get_source` | Trecho de uma fonte por âncora |
| `lastro_propose_requirements` | Propõe itens a partir de uma fonte. Nascem `captured` e precisam de citação literal |
| `lastro_update_requirement` | Preenche campos de spec. Não muda estado para `approved` |
| `lastro_record_decision` | Registra suposição ou decisão (`decided_by: agent`, `status: proposed`) |
| `lastro_ask` | Abre pergunta para o dev ou para quem pediu |
| `lastro_link_test` | Liga um teste a um critério de aceite |
| `lastro_start` | Passa um requisito `approved` para `building` |
| `lastro_verify` | O Lastro roda as etapas e devolve o que falhou, por etapa e condição |
| `lastro_gate_status` | O que falta para o gate passar |
| `lastro_submit` | O agente declara que terminou. Se o gate não passa, a resposta diz o que falta e o hook de fim bloqueia |
| `lastro_pause` | Registra pausa com motivo, para o hook de fim não bloquear |
| `lastro_triage_incident` | Propõe triagem e causa de um incidente. Quem confirma é uma pessoa |
| `lastro_glossary` | Busca de termos e invariantes |

Recursos MCP: `lastro://glossary`, `lastro://design`, `lastro://config`, `lastro://package/<id>`.

## Painel

O painel, os diagramas vivos e a documentação gerada estão em [Painel, documentação e diagramas](03-dashboard.md).

## Relatórios

| Relatório | Para quem | Conteúdo |
|---|---|---|
| Entrega do pacote | Quem pediu | Item a item, na numeração da fonte: pedido literal, situação, o que foi feito, o que decidimos, onde ver, prints |
| Aguardando resposta | Quem pediu | Só as perguntas abertas, cada uma com o trecho do pedido que a originou |
| Técnico | Dev e revisor | Evidência por requisito, comandos, commits, condições, travamentos, incidentes e regressões |
| Incidentes do período | Dev | Triagem, causa e cobrança, para a conversa comercial |

Formatos: Markdown, HTML e PDF. O visual do PDF é configurável (logo, cores e capa do desenvolvedor). Os relatórios fazem parte da [documentação gerada](03-dashboard.md#documentação-gerada).

## Entrada de material

| Fonte | Como entra |
|---|---|
| DOCX | Texto e imagens **na ordem em que aparecem**, com âncora por parágrafo e por imagem. A imagem nunca se separa do parágrafo dela |
| PDF | Texto por página e bloco. Páginas que são só imagem viram artefato com âncora de página |
| Conversa | Exportação de WhatsApp e Telegram (texto) e adaptadores para fontes ao vivo. Inclui as respostas de quem desenvolve, marcadas como `from: dev`, porque elas mudam o sentido do pedido. Mensagem citada e encaminhada mantém o vínculo |
| Áudio | Transcrição por um comando configurável (por exemplo, Whisper local). Sem frase sugerida no prompt da transcrição. A fonte fica `machine_transcript: true` |
| Vídeo | Transcrição com tempo e quadros extraídos (ffmpeg) nos pontos citados |
| Imagem, print | Vira artefato. Pode ser `visual_ref` |
| Reunião | Transcrição, como áudio |

Regras da entrada:

- A âncora de cada trecho é estável. Uma nova versão da fonte não muda as âncoras da anterior.
- Fonte com o mesmo título de outra vira nova versão, nunca substituição silenciosa.
- O Lastro só extrai e guarda. Interpretar é tarefa do agente, e confirmar é tarefa de uma pessoa.
