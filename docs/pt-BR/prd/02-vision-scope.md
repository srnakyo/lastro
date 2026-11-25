# 2. Visão e escopo

## Princípios

1. **Sem lastro, não está pronto.** O agente pode dizer que terminou; quem decide é o gate.
2. **O que vale é o que rodou.** Evidência é o que o próprio Lastro executou e gravou, com o commit, o comando e a saída. O que o agente relata não conta.
3. **Toda frase tem origem.** Cada requisito cita literalmente a fonte e aponta onde ela está.
4. **Suposição é registrada, nunca escondida.** Se o pedido não diz, o agente decide e registra a decisão, que o cliente vê.
5. **Quem pediu define o aceite.** Os exemplos e números de quem pediu viram os critérios. O agente não edita critério travado.
6. **O Postgres é a verdade, e o git recebe a exportação.** Tudo o que importa fica no banco do servidor do Lastro. `lastro export` grava no repositório um retrato determinístico em `.lastro/`, em YAML e Markdown, revisado no mesmo PR que o código.
7. **Um servidor, vários projetos.** Um servidor do Lastro, auto-hospedado com Docker numa VPS só, guarda todos os projetos de um workspace. O painel, o servidor MCP e a CLI escrevem pela API dele.
8. **Sem LLM dentro.** Quem pensa é o agente que o desenvolvedor já usa. O Lastro guarda, cobra e confere. Sem custo de tokens próprio.
9. **Agnóstico de agente e de stack.** Claude Code primeiro, mas o formato, a CLI e o MCP servem a qualquer agente e linguagem.
10. **Só a fase não feita é pendência.** Item feito e verificado não aparece como pendente, nem com ressalva.

## Para quem é

| Papel | O que precisa |
|---|---|
| **Desenvolvedor que trabalha com agente** (freelancer ou time pequeno) | Saber o que falta de verdade, parar de repetir instruções e ter como provar o que foi entregue |
| **Agente de IA** (Claude Code, Codex, Gemini CLI, Cursor) | Receber o requisito com a origem e os critérios, ter onde perguntar e registrar decisões, saber o que o gate cobra |
| **Cliente ou dono do produto** | Ver item a item o que pediu, o que foi feito, o que foi decidido por ele e onde conferir. Aprovar prévias e aceitar entregas |
| **Líder técnico** | Política de qualidade por tipo de mudança, aplicada igual para todo mundo |

## Objetivos

1. Cada pedido vira itens atômicos com ID, citação e âncora na fonte.
2. Nenhum item começa a ser implementado com campo obrigatório em branco ou pergunta que trava em aberto.
3. Os critérios de aceite levam os exemplos de quem pediu e ficam travados.
4. O gate só passa com evidência executada pelo Lastro no commit atual, nas condições exigidas pelo tipo do item.
5. O agente não consegue encerrar a resposta dizendo que terminou com o gate vermelho (Claude Code).
6. Glossário, invariantes, contrato de layout e decisões voltam ao contexto do agente em toda sessão e depois de toda compactação.
7. Relatório item a item para o cliente, com o texto literal do pedido.
8. Um painel visual com os pacotes, os requisitos, o catálogo de testes, as execuções e os resultados, os diagramas vivos dos fluxos de QA e da rastreabilidade, e a geração da documentação do projeto.
9. Os dados de todos os projetos guardados num Postgres, atrás de uma API única, e exportados para `.lastro/` em cada repositório.

## Fora do escopo

- Ser um gerenciador de projetos completo (sprints, horas, quadro kanban).
- Portal para o cliente entrar e aprovar. Por enquanto, a aprovação do cliente entra como referência (id da mensagem, e-mail, assinatura) registrada pelo desenvolvedor. O login do painel é para o time.
- Gerar código ou testes por conta própria. Isso é trabalho do agente.
- Substituir o CI. O Lastro roda dentro dele.
- Ser um linter. O Lastro roda os linters do projeto e lê o resultado em SARIF.

## O que já existe e onde o Lastro entra

| Ferramenta | O que faz bem | O que não cobre |
|---|---|---|
| Spec Kit (GitHub), OpenSpec, BMAD, Kiro (AWS) | Levam da spec escrita às tarefas para o agente | A entrada a partir de material bagunçado de cliente, a verificação com evidência e o aceite de quem pediu. As specs em markdown tendem a desatualizar |
| reqstool, SpecTrace, Doorframe | Ligam requisito, código e teste, alguns por MCP | Suposições, condições de teste, prévia visual, aceite do cliente e travas no agente |
| Playwright (e os agentes de teste dele) | Testes de interface e evidência visual | Ligar o teste ao pedido e à condição de uso do cliente |
| Claude Ship (Code Review, PR Steward, Claude Approvals) | Revisa, corrige e aprova pull requests | Começa quando o código já existe. Não sabe o que o cliente pediu |

O Lastro cobre as duas pontas que essas ferramentas deixam soltas: **do cliente até a spec** e **da entrega até o aceite do cliente**. No meio, ele se integra com o que o desenvolvedor já usa.

## Como se mede o sucesso

Num projeto piloto, rodada a rodada:

- incidentes por rodada de entrega;
- parcela de incidentes com causa "spec incompleta" contra "implementação";
- itens reabertos por rodada;
- perguntas feitas antes de implementar contra perguntas feitas depois da entrega;
- parcela de reclamações que não eram defeito;
- quantas vezes alguém pergunta "o que está pendente?" e a resposta já estava no painel.
