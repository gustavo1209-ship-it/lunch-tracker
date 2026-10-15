import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyIntegrations,parseIncoming,receiveIncoming,importIncoming,incomingKey,mappingKey} from '../app/integration-model.ts';
import {orderLabel,updateProduction,productionFor} from '../app/production.ts';
const sample=()=>({provider:'ifood',merchantId:'store-1',externalId:'external-1',code:'1234',fulfillment:'delivery',note:'Sem queijo',items:[{externalSku:'A',name:'Risoto',qty:2},{externalSku:'B',name:'Risoto extra',qty:1}]});
test('valida contrato e rejeita quantidades inválidas, itens vazios e provedores desconhecidos',()=>{
  const raw=sample();assert.deepEqual(parseIncoming(JSON.stringify(raw)),raw);
  for(const bad of [{...raw,provider:'other'},{...raw,items:[]},{...raw,items:[{...raw.items[0],qty:-1}]},{...raw,items:[{...raw.items[0],qty:1.2}]},{...raw,merchantId:''},{...raw,items:[raw.items[0],raw.items[0]]}])assert.throws(()=>parseIncoming(JSON.stringify(bad)));
});
test('deduplica por plataforma, loja e ID externo, inclusive após arquivamento',()=>{
  const raw=sample();const state=receiveIncoming(emptyIntegrations(),raw,0);
  assert.throws(()=>receiveIncoming(state,raw,1));
  state.inbox[0].state='archived';assert.throws(()=>receiveIncoming(state,raw,1));
  assert.equal(receiveIncoming(state,{...raw,merchantId:'other'},1).inbox.length,2);
  assert.equal(receiveIncoming(state,{...raw,provider:'deliverymuch'},1).inbox.length,2);
});
test('exige mapeamento, agrupa pratos e envia uma única vez à produção sem ocupar mesa',()=>{
  const raw=sample();const state=receiveIncoming(emptyIntegrations(),raw,0);const key=incomingKey(raw);
  assert.throws(()=>importIncoming(state,[],key,[1],1));
  state.mappings[mappingKey(raw,'A')]=1;state.mappings[mappingKey(raw,'B')]=1;
  const result=importIncoming(state,[],key,[1],1);const order=result.orders[0];
  assert.deepEqual(order.items,[{dish:1,qty:3}]);assert.equal(order.table,0);assert.equal(order.note,'Sem queijo');assert.equal(orderLabel(order),'iFood · 1234');
  assert.equal(result.integrations.inbox[0].state,'imported');
  assert.throws(()=>importIncoming(result.integrations,result.orders,key,[1],2));
  assert.throws(()=>importIncoming(state,result.orders,key,[1],2));
  const ready=updateProduction(order,0,{...productionFor(order.items[0],0),stage:4});assert.equal(ready.status,2);assert.equal(ready.externalId,raw.externalId);
});
