# 3. Painel, documentação e diagramas

O painel é onde tudo o que o Lastro guarda fica visível e organizado:

- o que foi pedido e de onde veio;
- o que foi testado, em quais condições e com qual resultado;
- o que falhou e por quê;
- o que falta, e de quem depende;
- a documentação do projeto, gerada a partir desses dados.

Ele é a peça central do produto. A CLI, o MCP e os hooks alimentam os dados; o painel é onde as pessoas olham, decidem e geram os documentos.

## Duas formas de rodar

| Modo | Comando | Banco | Para quem |
|---|---|---|---|
| **Local** | `lastro ui` | SQLite em `.lastro/.state/`, sem configuração | Um desenvolvedor, na própria máquina. Escuta só em `127.0.0.1`, sem login |
| **Servidor** | `lastro server` | Postgres (ver [Armazenamento](04-domain-model.md#armazenamento)) | Time, vários projetos e o histórico de todo mundo no mesmo lugar. Com login, e o CI grava lá com um token |

O painel é o mesmo nos dois modos. Muda só de onde ele lê.

## Organização

Tudo segue a mesma hierarquia, do mais amplo ao mais detalhado:

```
Projeto → Pacote (rodada de entrega) → Requisito → Critério de aceite → Teste → Execução → Evidência
```

Em toda lista dá para filtrar por:

- estado e tipo;
- módulo;
- condição;
- período e commit;
- quem decidiu.

A busca global acha qualquer coisa por ID, por trecho da citação ou pelo nome do teste.

## Páginas

| Página | O que mostra |
|---|---|
| **Visão geral** | Indicadores do projeto: cobertura de requisitos por testes, testes executados, aprovados, reprovados e pendentes, gate de cada pacote, qualidade por módulo, últimas execuções e incidentes abertos |
| **Pacotes** | Cada rodada de entrega com os itens na numeração de quem pediu, o funil por estado e o que falta. "Pendente" aqui é só o que não foi verificado |
| **Requisito** | A citação lado a lado com o trecho da fonte, os campos, os critérios, os testes de cada critério por condição, a evidência por commit, as decisões, as perguntas e o histórico de estados |
| **Testes** | O catálogo de todos os testes do projeto (detalhado abaixo) |
| **Execuções** | Cada `lastro verify` e cada rodada do CI (detalhado abaixo) |
| **Diagramas** | Os diagramas vivos do projeto, do pacote e do requisito (ver a próxima seção) |
| **Documentação** | Gerar, ver e baixar os documentos do projeto (ver mais abaixo) |
| **Fontes** | Os documentos, conversas, áudios e vídeos recebidos, com as versões, a diferença entre elas e os requisitos que cada trecho gerou |
| **Perguntas e decisões** | O que está aberto, o que o agente presumiu e ainda não foi confirmado, o que o cliente respondeu |
| **Incidentes** | Reclamações depois da entrega, com triagem, causa e cobrança (correção, cortesia ou orçamento) |
| **Configuração** | Fluxos de QA, condições, glossário e contrato de layout. Os fluxos são editados visualmente: incluir, tirar e reordenar etapas e condições |
| **Projetos** | Só no modo servidor: todos os projetos do banco, lado a lado, com os mesmos indicadores |

### Página de testes

- Cada teste do projeto, identificado como `arquivo::nome do teste`, com os critérios e requisitos que ele cobre.
- O histórico de resultados por commit e por condição, com a duração de cada execução.
- **Testes instáveis:** passam e falham sem mudança no código que eles cobrem.
- **Testes órfãos:** existem no projeto, mas não cobrem nenhum critério.
- **Critérios sem teste:** a lista do que ainda não tem como ser verificado.

### Página de execuções

Cada execução mostra:

- quem disparou (dev, agente ou CI), o commit e a branch;
- as etapas e as condições, em ordem, com o resultado de cada uma;
- o comando rodado, a saída, a duração e o código de saída;
- os prints, vídeos e relatórios anexados;
- a comparação com a execução anterior do mesmo requisito: o que passou a falhar e o que voltou a passar.

## Diagramas vivos

Os diagramas são gerados a partir dos dados, nunca desenhados à mão, então nunca ficam desatualizados.

- São escritos em Mermaid e renderizados no painel.
- Clicar num elemento abre o item.
- Os mesmos diagramas vão para a documentação gerada, como Mermaid e SVG.

### Fluxo de QA de um requisito, com o resultado

Cada etapa, em cada condição, colorida pelo último resultado no commit atual:

```mermaid
flowchart LR
  T[typecheck]:::pass --> U[unit]:::pass
  U --> E1["e2e · dark-theme"]:::fail
  U --> E2["e2e · zoom-125"]:::pass
  E1 --> D[design_contract]:::skip
  E2 --> D
  D --> P["preview · client"]:::human
  classDef pass fill:#16a34a,color:#fff
  classDef fail fill:#dc2626,color:#fff
  classDef skip fill:#9ca3af,color:#fff
  classDef human fill:#f59e0b,color:#000
```

Verde passou, vermelho falhou, cinza não rodou porque uma etapa anterior falhou, e laranja aguarda uma pessoa.

### Rastreabilidade

Da fonte até a evidência, com os buracos destacados:

```mermaid
flowchart LR
  S["SRC-8M2KD @p3 · item 10"] --> R[REQ-K7Q2M]
  R --> A1[AC-1]
  R --> A2["AC-2 · sem teste"]:::gap
  A1 --> T1["unit/billing/volume-discount.test.ts"]
  A1 --> T2["e2e/invoices/detail.spec.ts"]
  T1 --> X1["8298399 · passou"]:::pass
  T2 --> X2["8298399 · falhou"]:::fail
  classDef pass fill:#16a34a,color:#fff
  classDef fail fill:#dc2626,color:#fff
  classDef gap fill:#fff,stroke:#dc2626,stroke-dasharray:4
```

O que aparece como buraco:

- critério sem teste;
- teste sem execução no commit atual;
- citação que não confere com a fonte;
- requisito sem fonte final.

### Ciclo de vida do pacote

O diagrama de estados do [ciclo de vida](05-lifecycle-and-gates.md), com a quantidade de itens em cada estado e as passagens que estão travadas.

### Mapa de módulos

Os módulos do sistema, com quantos requisitos e incidentes cada um tem. Sai do `reach.modules` e dos arquivos em `touches`. Mostra onde o projeto mais quebra.

### Linhas do tempo

Gráficos, não diagramas:

- resultados por commit e por dia;
- incidentes por pacote, separados por causa (spec incompleta, implementação, regressão);
- itens reabertos por pacote.

## Documentação gerada

`lastro docs build` gera a documentação a partir dos dados, nunca da memória do agente. O painel tem o mesmo botão.

| Documento | Conteúdo |
|---|---|
| **Visão do projeto** | Pacotes, módulos, glossário e números gerais |
| **Requisitos** | Por módulo: origem, regra, campos, critérios e estado |
| **Regras de negócio e invariantes** | O glossário e as invariantes, com os testes que as protegem |
| **Decisões** | Todas as decisões, com o motivo e quem decidiu |
| **Plano de testes** | Os fluxos de QA por tipo, as condições e os comandos |
| **Casos de teste** | O catálogo, com o que cada teste cobre |
| **Relatório de qualidade** | Indicadores, testes executados, falhas e pendências, por pacote ou por período |
| **Histórico de entregas** | Por pacote: o que entrou, com a evidência |
| **Relatório do cliente** | Item a item, na numeração de quem pediu (ver [Pacotes e o relatório item a item](05-lifecycle-and-gates.md#pacotes-e-o-relatório-item-a-item)) |
| **Diagramas** | Os diagramas vivos acima, em Mermaid e SVG |

- Formatos: Markdown, HTML e PDF.
- O PDF aceita logo, cores e capa do desenvolvedor.
- Os arquivos em Markdown podem ir para o repositório, em `docs/lastro/`, se o projeto configurar.
- Todo documento diz de qual commit e de qual data foi gerado. Gerado de novo no CI, ele acompanha o código.

## Ações humanas no painel

Pelo painel, uma pessoa pode:

- aprovar spec;
- confirmar ou derrubar decisão;
- responder pergunta;
- registrar prévia e etapa manual;
- aceitar entrega;
- fazer a triagem de incidente;
- editar os fluxos de QA.

São as mesmas ações humanas da CLI, e o agente não tem acesso a nenhuma delas.

- **No modo local,** a ação grava direto nos arquivos de `.lastro/` e entra no próximo commit.
- **No modo servidor,** a ação vira um evento no Postgres. O `lastro sync` aplica o evento nos arquivos do repositório, para a spec continuar revisada no PR.

## Visual

- React, com Tailwind e shadcn/ui.
- Tema claro e escuro.
- Funciona em tela de notebook e de celular.
- Confirmações por diálogo próprio, nunca pelas caixas nativas do navegador.
- Diagramas em Mermaid; gráficos em Recharts.
