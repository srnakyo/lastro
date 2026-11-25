# 1. O problema

## Resumo

No desenvolvimento com agentes de IA, escrever o código deixou de ser o gargalo. O gargalo virou o caminho de ida e volta entre quem pede e o que é entregue:

- o pedido chega incompleto e em pedaços (mensagem, áudio, vídeo, documento, print);
- o agente preenche os buracos sozinho e não avisa;
- os testes confirmam a interpretação do agente, não a de quem pediu;
- o que foi combinado se perde entre uma sessão e outra;
- quem pediu só descobre a divergência usando o sistema em produção.

Instruções no `CLAUDE.md` ou no `AGENTS.md` ajudam, mas dependem do agente lembrar e obedecer. O Lastro transforma essas regras em travas verificáveis.

## Evidência de um projeto real

Para sustentar a tese, usamos como exemplo um projeto real que tinha material suficiente para medir o problema. O Lastro não é feito para esse projeto nem para esse domínio. O padrão se repete em qualquer software feito com agente a partir de pedidos de outra pessoa.

O exemplo é um sistema de gestão desenvolvido com Claude Code por um desenvolvedor só, de agosto a novembro de 2026. O cliente mandava os pedidos por WhatsApp (texto, áudio, vídeo narrado, print) e por documentos DOCX e PDF. Os dados abaixo saíram da leitura das sessões, das mensagens do cliente e das notas do projeto. Nomes, marcas e valores foram retirados.

Foram cerca de **170 incidentes** em que o pedido e a entrega não bateram. Dois levantamentos independentes os classificaram assim:

| Causa | Ago–out | Out–nov |
|---|---|---|
| Requisito incompleto ou ambíguo, e o agente presumiu sem avisar | 17 | 16 |
| Regra de negócio implícita do domínio | 12 | 13 |
| Layout, padrão visual ou fidelidade ao sistema original | 15 | 9 |
| Fonte de dado ou cálculo errado | 12 | 7 |
| Não testou nas condições de uso do cliente | não classificado | 16 |
| Permissão, perfil ou pessoa com acesso a várias unidades | 5 | 9 |
| Regressão | 7 | 2 |
| Tela de fachada (a tela existe, o back-end ignora o campo) | 5 | não classificado |
| Processo e deploy | 9 | não classificado |
| Não era defeito | não classificado | 7 |

As rodadas de correção não diminuíram com o tempo. O módulo de premiação aparece em quase todas e, num ponto do projeto, pagava de 5 a 10 vezes o valor previsto no documento do cliente, com todos os testes passando.

## As oito causas de fundo

O agente quase nunca desobedeceu o que estava escrito. O problema estava em volta do pedido.

### 1. O pedido diz o conteúdo, não onde, quem, de onde vem o dado e como aparece

Quando o desenvolvedor perguntou se os ajustes eram erro de implementação ou de escopo, a conclusão foi: "o escopo estava incompleto". O documento de regras dizia quais números entram no cálculo, mas não onde nem como esses números entram no sistema. O agente inventou uma janela de digitação e escolheu o lugar do botão. O cliente imaginava outra coisa.

**O que falta:** campos obrigatórios no requisito (onde fica, quem vê, quem usa, fonte do dado, alcance, tela de referência) e a proibição de começar com esses campos em branco.

### 2. A suposição fica invisível

O documento dizia "M-2 ou M-2" e o agente adotou "M-1 ou M-2". Uma meta sem definição virou a execução de um checklist. Um recurso de segurança virou obrigatório quando o desenvolvedor queria opcional. O desenvolvedor vetou relatórios com "pontos a validar", porque pergunta no relatório parece item não feito, e aí a suposição sumiu de vez.

**O que falta:** um registro de decisões que mostre ao cliente "decidimos X porque o documento não dizia", como afirmação e não como pergunta.

### 3. Os testes repetem a interpretação do agente

A premiação passava em todos os testes e pagava muito acima do documento. Um teste ponta a ponta de permissões passou porque seguia a matriz que o próprio agente tinha montado. O erro só apareceu quando alguém conferiu os números do PDF contra a produção.

**O que falta:** critérios de aceite escritos com os exemplos numéricos de quem pediu, antes da implementação, e travados para o agente não editar.

### 4. Conhecimento e decisões se perdem entre sessões

- O vocabulário do cliente ("Gerente" é o cargo Gestor no sistema) precisou ser reensinado.
- Uma limitação da hospedagem estava anotada e foi ignorada semanas depois.
- Nove resumos de compactação seguidos afirmaram um estado falso de um arquivo do repositório.
- A regra de deploy mudou três vezes, e cada sessão precisava lembrar qual valia.

**O que falta:** glossário, invariantes e decisões versionados no repositório e injetados em toda sessão, inclusive depois de cada compactação.

### 5. O controle dos itens é frágil

O desenvolvedor perguntou "o que está pendente?" 29 vezes. O agente:

- listou itens que não estavam no documento;
- citou um trecho que o documento não tinha;
- parou com 11 itens que conseguia fazer;
- misturou versões de documentos com o mesmo nome;
- deixou 30 itens "esperando print" com as imagens dentro do próprio DOCX.

**O que falta:** cada item atômico, com ID, citação literal e âncora na fonte (página, mensagem, minuto do vídeo), estado explícito e diferença entre versões de documento.

### 6. O teste roda em condições que não são as do cliente

- A base local tinha 2 ou 3 unidades; a produção, 46.
- O teste usava um rascunho limpo; o cliente usava o rascunho que vinha do chat.
- O teste rodava como administrador; o cliente usava o perfil de colaborador.
- Zoom, F5, tema escuro e importações de 77 mil linhas ficaram de fora.

**O que falta:** condições de teste reutilizáveis e exigidas por tipo de requisito.

### 7. Falta um contrato de design

O sistema chegou a ter dois estilos de filtro. Um módulo foi portado de um protótipo em vez de seguir o padrão do sistema. Um documento saiu com a cor errada da marca. O gosto do cliente nenhuma ferramenta resolve. O que resolve é mostrar uma prévia aprovada antes de subir.

**O que falta:** contrato de layout (componentes permitidos, telas de referência, paleta) e uma etapa de prévia aprovada para mudança visual.

### 8. O alcance fica implícito

"Você fez isso com todas as unidades?" e "era para ter criado também nas outras três abas". O pedido valia para mais lugares do que estava escrito.

**O que falta:** o campo de alcance (módulos e unidades) obrigatório e conferido no gate.

## O que o desenvolvedor já fazia para compensar

Ao longo do projeto, o desenvolvedor criou regras para cada um desses buracos:

- testar com Playwright como o cliente usa;
- prévia de tela por print antes do push;
- padrão de layout documentado;
- backend calcula e o front só exibe;
- documento novo só entra com aval;
- ler a conversa inteira antes de agir;
- transcrição de áudio sem frase induzida.

Todas funcionavam como lembrete. Nenhuma travava. O Lastro existe para que essas regras deixem de depender da memória do agente.

## Uma consequência comercial

"Erramos ou o escopo estava incompleto?" é a pergunta que decide se um ajuste é correção ou cortesia, e se entra no orçamento. Sem registro, a resposta depende de reconstruir a conversa. Com o Lastro, ela fica no histórico de cada item: a citação da fonte, as decisões tomadas e a causa de cada incidente.
