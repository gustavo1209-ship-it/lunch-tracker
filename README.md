# Mesa — MVP de operação de restaurantes

Next.js (App Router), React, TypeScript e Node.js. Interface em português para administração, cozinha e garçons.

## Executar

```sh
npm install
npm run dev
```

Abra http://localhost:3000. Produção local: `npm run build` e `npm start`.

## Fluxo de teste

1. Em Cadastros, personalize nome/logo e tempos/consumo dos pratos.
2. Na Área do garçom, escolha uma mesa e envie vários pratos no mesmo pedido.
3. No Kanban, avance fila → preparo → pronto → entregue usando a seta.
4. No Gantt, veja início escalonado pelo prato mais demorado e horário de saída conjunta.
5. Em Supply, informe estoque inicial, entradas e meta. Exporte a lista de compras CSV.
6. Em Previsão, simule demanda/feriados e ajuste capacidade da equipe.
7. Em Cozinha e pré-preparo, acompanhe cada prato por pedido em Recebidos → Pré-preparo → Em produção → Finalização → Prontos. Marque o checklist antes de iniciar a produção, adicione pré-atividades e informe o responsável. Use o filtro de estação para organizar a bancada. Voltar etapa permite corrigir marcações.

A cozinha preserva pedidos já salvos e atualiza o Kanban geral: somente todos os pratos prontos liberam o pedido. Avançar um pedido inteiro pelo Kanban geral também atualiza seus pratos. Cada cartão reúne a quantidade daquele prato no pedido; não há controle individual por porção. Testes de integração de estados: `node --experimental-strip-types --test tests/production.test.mjs`.

Arraste a alça do cartão para mover a produção entre colunas; em telas touch ou por teclado, use o seletor Mover para. Pré-atividades pendentes bloqueiam o início da produção, e processos pendentes bloqueiam a finalização. Em Configurar processos de preparo por prato, cadastre uma etapa por linha. A sequência é preservada no cartão ao movimentá-lo; alterações no cadastro são usadas pelas produções ainda não iniciadas. Sem cadastro, aparece um checklist genérico explicitamente identificado.

## Limites explícitos do protótipo

- Persistência em localStorage; abas do mesmo navegador sincronizam por evento storage. Não há sincronização entre dispositivos, autenticação ou controle de acesso. Perfis são telas de demonstração.
- Dados iniciais fictícios. Não há calendário de feriados externo, forecast treinado nem histórico diário. Previsão é cenário com multiplicadores visíveis.
- Gantt por pedido; não otimiza filas por equipamento/estação nem pedidos distintos da mesma mesa. Considera tempos de 1–30 minutos e saída a partir da entrada do pedido.
- Ficha técnica simplificada de um insumo principal por prato. Supply considera todos os pedidos da demonstração e não fecha/rola dias automaticamente. Alterar ficha técnica recalcula consumo histórico neste MVP.
- Dimensionamento de equipe é soma de minutos por porção dividida pela capacidade configurada, sem paralelismo ou preparo em lote.

## Próxima fase

Supabase Auth, PostgreSQL com isolamento por restaurante/RLS e Realtime; fichas técnicas com múltiplos ingredientes, movimentação diária de estoque, histórico imutável de pedidos, capacidade por estação, identificação de turnos e forecast validado com histórico e feriados. Publicação Vercel somente após validação do MVP. Nenhuma credencial ou serviço externo é necessário nesta fase.
