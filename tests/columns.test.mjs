import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultColumns,columnFor,validateColumns} from '../app/kanban-columns.ts';
import {productionFor,updateProduction,advanceOrder} from '../app/production.ts';
test('colunas legadas e reordenadas preservam identidade de produção',()=>{
  const p=productionFor({dish:1,qty:1},1);
  assert.equal(columnFor(p,defaultColumns).id,'phase-2');
  const columns=[...defaultColumns];columns.splice(3,0,{id:'oven',name:'Forno',phase:2,color:'#123456'});
  validateColumns(columns);
  assert.equal(columnFor({...p,columnId:'oven'},columns).name,'Forno');
  [columns[2],columns[3]]=[columns[3],columns[2]];
  assert.equal(columnFor({...p,columnId:'oven'},columns).id,'oven');
  validateColumns(columns);
});
test('configuração impede perder fases, duplicar conclusão ou inverter fluxo',()=>{
  assert.throws(()=>validateColumns(defaultColumns.slice(1)));
  assert.throws(()=>validateColumns([...defaultColumns,{id:'another',name:'Final',phase:4,color:'#123456'}]));
  const reversed=[...defaultColumns];[reversed[1],reversed[2]]=[reversed[2],reversed[1]];
  assert.throws(()=>validateColumns(reversed));
  assert.throws(()=>validateColumns(defaultColumns.map(c=>({...c,name:'Igual'}))));
});
test('coluna intermediária não libera pedido e avanço geral remove posição antiga',()=>{
  const order={id:1,table:1,status:0,created:0,note:'',items:[{dish:1,qty:1}]};
  const preparing=updateProduction(order,0,{...productionFor(order.items[0],0),stage:2,columnId:'oven'});
  assert.equal(preparing.status,1);
  const ready=advanceOrder(preparing,2);
  assert.equal(ready.status,2);
  assert.equal(columnFor(ready.items[0].production,defaultColumns).phase,4);
  assert.equal(preparing.items[0].production.columnId,'oven');
});
test('permite excluir etapas originais sem perder produções legadas',()=>{
  const columns=defaultColumns.filter(c=>c.phase===0||c.phase===4);
  validateColumns(columns);
  for(const stage of [1,2,3]){
    const production={...productionFor({dish:1,qty:1},0),stage,columnId:`phase-${stage}`};
    assert.equal(columnFor(production,columns).phase,0);
    assert.equal(production.stage,stage);
  }
  assert.equal(columnFor(productionFor({dish:1,qty:1},2),columns).phase,4);
  assert.throws(()=>validateColumns(columns.filter(c=>c.phase!==4)));
});
