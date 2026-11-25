# 6. Interfaces

O Lastro tem quatro portas para o mesmo núcleo: a CLI para pessoas e scripts, o servidor MCP para agentes, o painel local para ver e decidir, e os relatórios para quem pediu.

## CLI

### Projeto

| Comando | O que faz |
|---|---|
| `lastro init` | Cria `.lastro/` com `lastro.yml`, glossário e contrato de layout vazios, e o `.gitignore` das pastas locais |
| `lastro setup claude\|codex\|gemini\|cursor\|git\|github` | Instala as integrações de cada nível |
| `lastro doctor` | Confere configuração, schemas, hooks instalados e comandos do projeto |

### Entrada de material

| Comando | O que faz |
|---|---|
| `lastro intake <arquivo ou pasta>` | Registra a fonte, guarda o binário em `.store/`, extrai texto com âncoras. Se já existe fonte com o mesmo título, cria a nova versão com `supersedes` |
| `lastro source diff <SRC> <SRC>` | Diferença entre duas versões, com os requisitos afetados |
| `lastro source final <SRC>` | Marca a fonte como final |

O Lastro não chama LLM. A quebra da fonte em requisitos atômicos é feita pelo agente via MCP (`lastro_propose_requirements`), e os itens nascem `captured`.

### Requisitos, decisões e perguntas

| Comando | O que faz |
|---|---|
| `lastro req new\|edit\|show\|list` | Cria, edita, mostra e lista requisitos, com filtros por estado, tipo e pacote |
| `lastro pending [PKG]` | Só o que não chegou em `verified`, agrupado por motivo: falta campo, pergunta aberta, aguardando aprovação, em implementação, gate vermelho |
| `lastro ask <REQ> "<pergunta>" [--blocks]` | Abre pergunta |
| `lastro answer <Q> "<resposta>" --source <SRC@âncora>` | Registra a resposta e cria a decisão `client_answer` |
| `lastro decide <REQ> "<decisão>" --reason "<motivo>"` | Registra decisão |
| `lastro decision confirm\|overturn <DEC>` | Humano |
| `lastro approve <REQ\|PKG>` | Humano. Também trava os critérios |
| `lastro lock\|unlock <REQ>` | Trava ou destrava critérios e testes. O `unlock` é humano |

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
| `lastro incident triage <INC> --triage bug --cause spec_gap --billing courtesy` | Classifica |
| `lastro ui` | Abre o painel local |

## Servidor MCP

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

## Painel local

`lastro ui` sobe um servidor local (só `127.0.0.1`), que lê os mesmos arquivos e o SQLite e atualiza ao vivo.

| Página | O que mostra |
|---|---|
| Visão geral | Pacotes abertos, funil por estado, gate de cada pacote, últimas execuções |
| Pacote | Os itens na numeração de quem pediu, com estado, origem, evidência e o que falta. "Pendente" aqui é só o que não foi verificado |
| Requisito | A citação lado a lado com o trecho da fonte, os campos, os critérios, os testes por condição, a evidência por commit, as decisões e as perguntas |
| Fontes | Versões, diferença entre elas, âncoras, requisitos que cada trecho gerou |
| Perguntas e decisões | O que está aberto, o que o agente presumiu e ainda não foi confirmado |
| Incidentes | Triagem, causa e cobrança: quanto foi spec incompleta, quanto foi implementação, quanto foi cortesia |
| Qualidade | Cobertura de critérios por testes, testes por condição, etapas manuais pendentes |
| Configuração | Fluxos, condições, glossário e contrato de layout, editáveis |

As ações humanas do painel (aprovar, aceitar, registrar prévia) gravam nos mesmos arquivos que a CLI e entram no próximo commit.

## Relatórios

| Relatório | Para quem | Conteúdo |
|---|---|---|
| Entrega do pacote | Quem pediu | Item a item, na numeração da fonte: pedido literal, situação, o que foi feito, o que decidimos, onde ver, prints |
| Aguardando resposta | Quem pediu | Só as perguntas abertas, cada uma com o trecho do pedido que a originou |
| Técnico | Dev e revisor | Evidência por requisito, comandos, commits, condições, travamentos, incidentes e regressões |
| Incidentes do período | Dev | Triagem, causa e cobrança, para a conversa comercial |

Formatos: Markdown, HTML e PDF. O visual do PDF é configurável (logo, cores e capa do desenvolvedor).

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
