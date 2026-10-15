import { test } from 'node:test';
import assert from 'node:assert/strict';
import { productionFor, updateProduction, advanceOrder } from '../app/production.ts';

const order = () => ({id: 1, table: 2, status: 0, items: [{dish:1,qty:2},{dish:2,qty:1}], created: 0, note: ''});
test('pedidos existentes recebem pré-atividades sem migração destrutiva', () => {
  assert.equal(productionFor(order().items[0],0).activities.filter(a=>a.done).length,0);
  assert.equal(productionFor(order().items[0],1).stage,2);
  assert.equal(productionFor(order().items[0],2).stage,4);
});
test('pré-preparo de um prato não avança os demais; liberação exige todos prontos', () => {
  const first = updateProduction(order(),0,{...productionFor(order().items[0],0),stage:1});
  assert.equal(first.status,1);
  assert.equal(first.items[1].production.stage,0);
  const partial = updateProduction(first,0,{...first.items[0].production,stage:4});
  assert.equal(partial.status,1);
  const ready = updateProduction(partial,1,{...partial.items[1].production,stage:4});
  assert.equal(ready.status,2);
  const reopened = updateProduction(ready,0,{...ready.items[0].production,stage:3});
  assert.equal(reopened.status,1);
  assert.equal(reopened.items[1].production.stage,4);
});
test('Kanban geral mantém produções coerentes e entregues não são reabertos', () => {
  const ready = advanceOrder(order(),2);
  assert.ok(ready.items.every(i=>i.production.stage===4));
  const delivered = advanceOrder(ready,3);
  assert.deepEqual(updateProduction(delivered,0,{...delivered.items[0].production,stage:0}),delivered);
  assert.deepEqual(JSON.parse(JSON.stringify(ready)),ready);
});
