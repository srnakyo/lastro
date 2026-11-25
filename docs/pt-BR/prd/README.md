# PRD do Lastro

> **Status:** em desenho. Nada aqui está implementado ainda.
> **Idioma:** esta é a versão original em português. A versão em inglês fica em [`docs/prd`](../../prd/README.md).

O Lastro é uma camada open source entre quem pede o software, o agente de IA que escreve o código e quem aceita a entrega. A regra central é uma só:

> **Nenhum item fica pronto sem lastro.** Lastro é a origem citada do pedido, o critério de aceite de quem pediu e a evidência, ligada ao commit atual, de que esse critério passou.

## Documentos

| # | Documento | O que responde |
|---|---|---|
| 1 | [O problema](01-problem.md) | Por que pedido e entrega divergem no desenvolvimento com IA, com dados de um projeto real |
| 2 | [Visão e escopo](02-vision-scope.md) | Princípios, para quem é, o que fica fora e o que já existe no mercado |
| 3 | [Painel, documentação e diagramas](03-dashboard.md) | O que se vê no painel: testes, execuções, resultados, diagramas vivos e documentação gerada |
| 4 | [Modelo de dados, formato dos arquivos e armazenamento](04-domain-model.md) | As entidades, como ficam gravadas em `.lastro/` e no banco (SQLite ou Postgres) |
| 5 | [Ciclo de vida, gate e fluxos de QA](05-lifecycle-and-gates.md) | Os estados de um requisito, o que libera cada passagem e como configurar o QA |
| 6 | [Como obrigar o agente a seguir](06-enforcement.md) | Orientação, controle por hooks e bloqueio externo |
| 7 | [Interfaces](07-interfaces.md) | CLI, servidor MCP, relatórios e entrada de material |
| 8 | [Integrações](08-integrations.md) | Claude Code, Claude Ship, GitHub, executores de teste |
| 9 | [Arquitetura e roteiro](09-architecture-roadmap.md) | Pacotes, stack, ordem do MVP e perguntas em aberto |

## Este PRD também é a primeira spec do Lastro

O diretório [`.lastro/`](../../../.lastro) na raiz do repositório descreve o MVP do próprio Lastro no formato que ele propõe: a fonte é este PRD, os requisitos citam trechos dele, e as decisões e perguntas em aberto ficam registradas ao lado. Quando o núcleo existir, o Lastro vai cobrar a si mesmo.
