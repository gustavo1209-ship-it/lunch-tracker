# Cérebro do projeto — Mesa / lunch-tracker

Última atualização: 15/10/2026.

## 1. Objetivo e decisões do usuário

Aplicativo operacional de restaurantes para coordenar pedidos dos garçons e delivery, preparar vários pratos por mesa/pedido com saída conjunta, visualizar produção em Kanban/Gantt, controlar insumos e planejar compras e equipe.

- Tecnologia solicitada: Next.js e Node.js.
- Primeiro validar interfaces e MVP local. Supabase e Vercel são a fase posterior, não serviços já conectados.
- Permitir identidade de diferentes restaurantes por nome e logo.
- Todo trabalho concluído deve ser versionado em https://github.com/gustavo1209-ship-it/lunch-tracker, branch `main`.
- Manter este documento atualizado quando houver mudanças de funcionalidades, arquitetura ou limitações.

## 2. Estado atual

MVP local funcional com Next.js App Router, React, TypeScript e ícones Lucide. O Next roda sobre Node.js. Não há API de negócio, banco remoto, autenticação, autorização por perfil ou conexão ativa aos marketplaces.

Os dados ficam em `localStorage`, chave `mesa-demo-v1`. Abas da mesma origem/navegador recebem alterações pelo evento `storage`. Isso não equivale a sincronização entre celulares ou computadores; edições simultâneas podem se sobrescrever. Credenciais não devem ser armazenadas aqui. A demonstração inicia com dados fictícios.

## 3. Interfaces entregues

### Visão geral

Indicadores de pedidos, pratos, duração estimada e mesas; resumo do Kanban; alertas de compra e estimativa de capacidade da equipe.

### Área do garçom

16 mesas demonstrativas. Lançamento de vários pratos e quantidades, observações e múltiplos pedidos por mesa. Pedidos novos entram na fila da cozinha.

### Pedidos e Kanban

Etapas: Na fila → Em preparo → Prontos → Entregues. Busca por identificação do pedido, mesa ou canal. Avançar o pedido inteiro atualiza os cartões de produção e conclui seus checklists conforme a etapa. É uma ação em lote, diferente da gestão individual na cozinha.

### Cozinha e pré-preparo

Cada cartão representa um prato e sua quantidade dentro de um pedido, não uma porção individual. Etapas: Recebidos → Pré-preparo → Em produção → Finalização → Prontos.

- Arrastar pela alça, botões de avanço/retorno e seletor acessível para teclado/touch.
- Filtros por estação, prato, identificação do pedido e responsável.
- Checklist inicial de conferência, separação e organização; permite adicionar pré-atividades.
- Campo de responsável por produção.
- Processos de preparo configuráveis por prato, uma etapa por linha. Sem cadastro específico, há checklist genérico identificado como tal.
- Pré-atividades bloqueiam avanço para produção; processos pendentes bloqueiam finalização.
- Processos ficam registrados no cartão ao movimentá-lo. Editar o cadastro não reescreve cartões que já possuem sua sequência.
- Todos os pratos prontos tornam o pedido pronto. Reabrir uma produção devolve o pedido a preparo. Pedidos entregues saem da cozinha e não são reabertos por esse fluxo.

### Linha de produção / Gantt

Usa a maior duração do pedido como referência. Início de cada prato = duração máxima − duração do prato; saída prevista = entrada do pedido + duração máxima. Permite visualizar o planejamento de saída conjunta.

Limites: 1–30 minutos por prato; não considera disponibilidade de equipamento, atrasos reais, capacidade de estação, tempos individuais de processos ou agrupamento de pedidos distintos da mesma mesa. É planejamento, não execução cronometrada.

### Supply diário

Consumo comprometido = soma de quantidades × consumo cadastrado por prato. Saldo previsto = inicial + entradas − consumo. Comprar = máximo entre zero e meta − saldo. Valores editáveis e CSV de compras.

Limites: um insumo principal por prato; cálculo inclui todos os pedidos existentes na demonstração; sem fechamento por data/virada automática. Editar uma ficha recalcula pedidos passados. Integração real precisará de snapshots e movimentos imutáveis.

### Previsão e equipe

Simulação de sete dias com multiplicador manual; fins de semana +35%; opção de feriado +30% aplicada a todos os dias do cenário. Sem calendário externo ou modelo estatístico treinado.

Equipe estimada = teto de minutos de produção pendentes ÷ minutos disponíveis por pessoa. Não considera lotes, equipamentos em paralelo ou competências. Não usar como previsão de pessoal validada.

### Cadastros e ajustes

Nome/logo do restaurante (PNG/JPG/WebP até 500 KB), pratos, estação, duração e consumo principal. Perfis administrador, operador e garçom são interfaces; não há barreira de autorização. Restaurar demonstração substitui os dados locais, inclusive os pedidos importados.

## 4. Central de delivery: o que funciona hoje

Aba **Delivery e integrações** com cartões iFood e Delivery Much sempre identificados como **Não conectado**.

1. Informar ID de referência da loja (opcional para simulação).
2. Simular um pedido ou inserir JSON no contrato interno de teste.
3. Revisar código externo, modalidade (entrega/retirada), observações, itens e quantidades.
4. Vincular cada SKU externo a um prato do Mesa. Vínculo salvo por plataforma + loja + SKU.
5. Enviar à cozinha. A importação cria um pedido local, alimentando Kanban, produção, Gantt e consumo de insumos.
6. Acompanhar status local na central; pedidos arquivados podem voltar à revisão.

Uma combinação plataforma + loja + ID externo só pode entrar uma vez. A importação exige todos os pratos mapeados, agrupa SKUs que apontam ao mesmo prato e impede uma segunda produção do mesmo pedido. Pedidos de delivery têm `table: 0` como marcador interno; a interface exibe plataforma e código, e eles não contam como mesas atendidas.

**Simular, importar, arquivar e avançar produção não executam ações nas plataformas.** Não existe receptor HTTP público, polling, webhook, confirmação remota ou cancelamento remoto implementado. Também não se importam endereço, nome de cliente, pagamentos ou complementos automaticamente. Complementos e variantes reais precisarão ser normalizados sem perder instruções de preparo.

### Contrato interno para teste

Não é o payload nativo do iFood ou da Delivery Much. Um futuro adaptador de servidor deverá produzir esse formato a partir da documentação de cada provedor.

```json
{
  "provider": "ifood",
  "merchantId": "loja-demo",
  "externalId": "pedido-0001",
  "code": "1234",
  "fulfillment": "delivery",
  "note": "Sem queijo",
  "items": [
    { "externalSku": "sku-01", "name": "Risoto", "qty": 2 }
  ]
}
```

`provider`: `ifood` ou `deliverymuch`. `fulfillment`: `delivery` ou `pickup`. IDs/código obrigatórios; 1–50 itens; quantidades inteiras de 1–50; SKUs repetidos devem ser agrupados. Tamanho máximo do texto: 50 mil caracteres. Campos adicionais são descartados pelo normalizador. Não inserir credenciais nem dados pessoais no simulador.

## 5. Como habilitar integração real

### iFood

Começar pelo [portal oficial de desenvolvedores](https://developer.ifood.com.br/pt-BR/), cadastrar a aplicação e seguir o fluxo de acesso, autorização da loja, testes e homologação indicado para o integrador. Não há credenciais configuradas neste projeto.

O [guia oficial de pedidos](https://developer.ifood.com.br/pt-BR/docs/guides/order/) orienta receber eventos por polling ou webhook e consultar os detalhes antes de confirmar/cancelar. O [guia de polling](https://developer.ifood.com.br/es-CO/docs/food/guides/modules/events/polling-overview) documenta recebimento de eventos e acknowledgment. Validar versão, permissões e contrato exatos durante a implementação.

Fluxo proposto para o Mesa: persistir evento → eliminar duplicata → buscar detalhes → normalizar/vincular itens → revisar disponibilidade → confirmar na plataforma → produzir → sincronizar os estados aplicáveis. Acknowledgment de recebimento não é aceitação comercial do pedido. Tratar cancelamentos, repetição de eventos e tentativas com falha de forma explícita.

### Delivery Much

No [portal oficial](https://developer.deliverymuch.com.br/), preencher o formulário de interesse para obter credenciais de desenvolvimento. O portal informa OAuth2, credenciais da aplicação e da loja, HTTPS e credenciais de produção após homologação e termo de uso.

O contrato documenta consulta de pedidos e ações de recebimento, aceite, pronto e cancelamento. O código do pedido deve ser exibido à loja. Também há requisitos de disponibilidade da loja e tempos de entrega/retirada. Usar o ambiente de testes e os pedidos fictícios documentados antes de solicitar produção. Conferir o [material oficial do processo](https://developer.deliverymuch.com.br/specs/orientacoes.pdf).

Para o Mesa, implementar o adaptador de servidor conforme o contrato fornecido à aplicação, persistir e revisar o pedido antes de enviar estados remotos, e testar recuperação de falhas. A interface atual não substitui as funções obrigatórias de homologação.

### Trabalho técnico ainda necessário (decisão de arquitetura do projeto)

1. Banco persistente com restaurantes, usuários, lojas conectadas, pedidos, eventos recebidos, itens, fichas técnicas, mapeamentos e tarefas.
2. Autenticação e isolamento entre restaurantes; autorização de administrador/cozinha/garçom.
3. Segredos exclusivamente no servidor, nunca em variáveis `NEXT_PUBLIC_*`, Git, localStorage ou telas de simulação.
4. Adaptadores independentes por plataforma; validar origem dos eventos pelo mecanismo oficial, renovar tokens e tratar limites de requisição.
5. Persistência transacional e índice único `(restaurant_id, provider, merchant_id, external_id)`; também deduplicar IDs de eventos.
6. Processamento durável para polling/retries; não depender de uma aba aberta ou de timers de uma requisição web.
7. Fila de saída para sincronizar comandos remotos com tentativa, falha, auditoria e reconciliação. Não tratar uma chamada com falha como confirmada.
8. Detalhamento de modificadores, combos, restrições, taxas, pagamento, logística, retirada, agendamento e cancelamento conforme contratos de cada API.
9. Persistir antes de reconhecer eventos de modo a evitar perda. Testar eventos repetidos, fora de ordem e interrupções.
10. Homologação e piloto em uma loja antes da abertura para múltiplos restaurantes.

## 6. Arquivos e responsabilidades

| Arquivo | Responsabilidade |
| --- | --- |
| `app/page.tsx` | Estado persistido, navegação, telas principais e integração dos módulos |
| `app/kitchen.tsx` | Kanban da cozinha, drag-and-drop, responsáveis e processos |
| `app/production.ts` | Estados de produção, sincronização com pedido e identificação mesa/delivery |
| `app/integrations.tsx` | Central de delivery, simuladores, revisão e mapeamento |
| `app/integration-model.ts` | Contrato interno, validação, deduplicação e importação |
| `app/globals.css` | Estilos responsivos e cores operacionais |
| `app/layout.tsx` | Documento e metadados |
| `tests/production.test.mjs` | Regras de produção e estados legados |
| `tests/integrations.test.mjs` | Validação, duplicatas, mapeamento e entrada na cozinha |
| `README.md` | Como executar e testar rapidamente |
| `AGENTS.md` | Orientação para agentes, Git e regras locais do Next |

## 7. Execução e verificação

```sh
npm install
npm run dev
# http://localhost:3000
npm run build
npm run typecheck
node --experimental-strip-types --test tests/production.test.mjs tests/integrations.test.mjs
```

Usar Node.js compatível com Next; ambiente de desenvolvimento atual: Node 24.15.0. Build e testes automatizados não substituem teste visual. O navegador automatizado não estava disponível nesta sessão, portanto cliques/arraste e apresentação visual precisam de confirmação manual.

Roteiro: criar pedido de mesa → pré-preparo → processos → pronto → entregue; simular cada plataforma → vincular itens → importar → verificar identificação na cozinha/Gantt → concluir pratos; repetir o mesmo JSON e confirmar o bloqueio de duplicata; recarregar e verificar persistência.

## 8. Próximas prioridades

- Validar a experiência operacional com restaurante real e simplificar o que a equipe não usar.
- Separar componentes e estado central, introduzir persistência transacional e auditoria.
- Integrar Supabase e publicar na Vercel quando autorizado na próxima fase.
- Implementar e homologar conectores de delivery; manter modo simulado separado.
- Fichas com múltiplos ingredientes, fechamento diário e histórico imutável.
- Tempos por processo, capacidade por estação, lotes e planejamento executável.
- Forecast com histórico, calendário real e avaliação de erro; dimensionamento de equipe com dados operacionais.

## 9. Versionamento e fontes

Código, testes e documentação no repositório canônico; dependências, builds e arquivos `.env*` ignorados. Não alterar visibilidade, não force-push, não publicar segredos. Dados digitados no navegador não são enviados ao GitHub.

As fontes oficiais acima foram consultadas em 15/10/2026. Alguns links do iFood responderam 403 na leitura direta; a pesquisa retornou trechos indexados oficiais. Antes de construir o adaptador, conferir os contratos atuais no portal autenticado. As propostas de arquitetura deste documento são decisões do Mesa, não garantias das plataformas.
