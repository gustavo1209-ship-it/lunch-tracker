'use client';

import { useState } from 'react';
import ColumnEditor from './column-editor';
import {columnFor,type KanbanColumn} from './kanban-columns';
import { ChefHat, Clock3, Plus, ArrowRight, Check, RotateCcw } from 'lucide-react';
import { orderLabel, productionFor, type KitchenOrder, type Production } from './production';

type Dish = { id: number; name: string; minutes: number; station: string; processes?: string[] };

export default function Kitchen({ orders, dishes, now, onUpdate, onProcesses, columns, onColumns }: {
  columns:KanbanColumn[]; onColumns:(columns:KanbanColumn[])=>void;
  orders: KitchenOrder[]; dishes: Dish[]; now: number;
  onUpdate: (orderId: number, itemIndex: number, production: Production) => void;
  onProcesses: (dishId: number, processes: string[]) => void;
}) {
  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [station, setStation] = useState('Todas');
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [dragged, setDragged] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const getProcesses = (dish: Dish, production: Production) => production.processes ?? (dish.processes ?? ['Executar preparo conforme a ficha técnica', 'Conferir ponto e montagem']).map((label, index) => ({id:`process-${index}`,label,done:production.stage === 4}));
  const active = orders.filter(order => order.status < 3);
  const tasks = active.flatMap(order => order.items.map((item, index) => ({ order, item, index, dish: dishes.find(d => d.id === item.dish)!, production: productionFor(item, order.status) })));
  const filtered = tasks.filter(t => (station === 'Todas' || t.dish.station === station) && `${orderLabel(t.order)} ${t.order.id} ${t.dish.name} ${t.production.owner}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  filtered.sort((a,b)=>a.order.created-b.order.created);
  const portions = filtered.filter(t => t.production.stage < 4).reduce((sum, t) => sum + t.item.qty, 0);
  const changeStage = (order: KitchenOrder, index: number, production: Production, dish: Dish, columnId: string) => {
    const target=columns.find(c=>c.id===columnId);if(!target)return;
    const stage=target.phase;
    if(columnFor(production,columns).id===columnId)return;
    if (stage >= 2 && production.activities.some(a => !a.done)) {setMessage('Conclua as pré-atividades antes de avançar para produção.');return;}
    const processes = getProcesses(dish, production);
    if (stage >= 3 && processes.some(p => !p.done)) {setMessage('Marque os processos de preparo concluídos antes de finalizar.');return;}
    onUpdate(order.id,index,{...production,processes,stage,columnId});
    setMessage(`${dish.name} · ${orderLabel(order)}: ${target.name}`);
  };
  return <div className="kitchen">
    <div className="kitchen-command"><ChefHat size={34}/><div><span>O QUE FAZER AGORA</span><h2>{!filtered.length?'Nenhuma produção neste filtro':filtered.some(t=>t.production.stage===3)?'Finalize os pratos que já estão na montagem':filtered.some(t=>t.production.stage===2)?'Continue os preparos em andamento':filtered.some(t=>t.production.stage<2)?'Comece pelos pedidos mais antigos':'Confira os pedidos prontos para servir'}</h2><p>Faça a ação indicada no cartão e toque no botão grande para confirmar. Os pedidos mais antigos aparecem primeiro em cada etapa.</p></div></div>
    <p className="kitchen-feedback" role="status" aria-live="polite">{message}</p>
    <div className="toolbar kitchen-filters"><label>Estação<select value={station} onChange={e => setStation(e.target.value)}><option>Todas</option>{Array.from(new Set(dishes.map(d => d.station))).map(s => <option key={s}>{s}</option>)}</select></label><label>Buscar produção<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Mesa, pedido, prato ou responsável"/></label><span>{portions} porções pendentes · {filtered.length} produções</span></div>
    <ColumnEditor columns={columns} occupied={tasks.map(t=>columnFor(t.production,columns).id)} onSave={next=>{onColumns(next);setStageFilter(null)}}/>
    <div className="kitchen-stage-tabs" aria-label="Filtrar etapa"><button className={stageFilter===null?'active':''} aria-pressed={stageFilter===null} onClick={()=>setStageFilter(null)}>Todas as etapas</button>{columns.map(c=><button key={c.id} aria-pressed={stageFilter===c.id} className={stageFilter===c.id?'active':''} onClick={()=>setStageFilter(c.id)}>{c.name}<b>{filtered.filter(t=>columnFor(t.production,columns).id===c.id).length}</b></button>)}</div>
    <div style={stageFilter===null?{gridTemplateColumns:`repeat(${columns.length}, minmax(310px, 1fr))`}:undefined} className={`kitchen-board ${stageFilter!==null?'kitchen-focused':''}`}>{columns.map((column,position) => {
      const stage=column.phase; const title=column.name;
      const inColumn=filtered.filter(t=>columnFor(t.production,columns).id===column.id);
      return (stageFilter===null||stageFilter===column.id)&&<section key={column.id} aria-label={title} style={{borderTop:`5px solid ${column.color}`}} onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect='move';setOver(column.id)}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setOver(null)}} onDrop={e=>{e.preventDefault();const key=e.dataTransfer.getData('text/plain');const task=tasks.find(t=>`${t.order.id}-${t.index}`===key);if(task)changeStage(task.order,task.index,task.production,task.dish,column.id);setDragged(null);setOver(null)}} className={`kitchen-lane kitchen-stage-${stage} ${over===column.id?'drag-over':''}`}>
      <div className="lane-title"><span style={{background:column.color}} className="kitchen-dot"/><b>{title}</b><span className="count">{inColumn.length}</span></div>
      {inColumn.map(({ order, item, index, dish, production }) => {
        const key = `${order.id}-${index}`;
        const done = production.activities.filter(a => a.done).length;
        const processes = getProcesses(dish, production);
        const maxMinutes = Math.max(...order.items.map(i => dishes.find(d => d.id === i.dish)!.minutes));
        const readyCount = order.items.filter(i => productionFor(i, order.status).stage === 4).length;
        const pendingActivity = production.activities.find(a=>!a.done);
        const pendingProcess = processes.find(p=>!p.done);
        const nextTask = stage===0?'Separe esta produção para começar':stage===1?(pendingActivity?.label||'Ingredientes conferidos. Pode começar o preparo.'):stage===2?(pendingProcess?.label||'Preparo concluído. Faça a montagem.'):stage===3?'Confira a montagem e as observações antes de liberar':readyCount===order.items.length?'Todos os pratos deste pedido estão prontos':'Aguarde os outros pratos para servir junto';
        const nextColumn=columns[position+1];
        const advanceLabel=nextColumn?`Ir para ${nextColumn.name}`:'';
        const update = (patch: Partial<Production>) => onUpdate(order.id, index, { ...production, ...patch });
        return <article className={`order-card production-card ${dragged===key?'dragging':''}`} key={key}>
          <div className="drag-handle" draggable onDragStart={e=>{e.dataTransfer.setData('text/plain',key);e.dataTransfer.effectAllowed='move';setDragged(key)}} onDragEnd={()=>{setDragged(null);setOver(null)}} title="Arrastar para outra etapa">⠿ Arrastar produção</div>
          <div className="card-top"><strong>{orderLabel(order)}</strong><span>#{order.id}</span></div>
          <h3>{item.qty}× {dish.name}</h3><span className="production-station">{dish.station} · {dish.minutes} min</span>
          <div className="order-time"><Clock3 size={13}/>{Math.max(0, Math.floor((now-order.created)/60000))} min desde o pedido</div>
          {order.note && <p className="note">{order.note}</p>}
          <div className="next-task"><span>{stage===4?'SAÍDA DO PEDIDO':'AGORA, FAÇA ISTO'}</span><strong>{nextTask}</strong></div>
          {stage===1&&<><div className="activity-heading"><b>Pré-preparo</b><span>{done}/{production.activities.length}</span></div><div className="activities">{production.activities.map(activity=><label key={activity.id}><input type="checkbox" checked={activity.done} onChange={e=>update({activities:production.activities.map(a=>a.id===activity.id?{...a,done:e.target.checked}:a)})}/><span>{activity.label}</span></label>)}</div></>}
          <div className="production-progress"><Check size={13}/>{readyCount}/{order.items.length} produções prontas do pedido</div>
          {stage===2&&<><div className="activity-heading"><b>Processos de preparo</b><span>{processes.filter(p=>p.done).length}/{processes.length}</span></div><div className="activities cooking-processes">{processes.map((process,i)=><label key={process.id}><input type="checkbox" checked={process.done} onChange={e=>update({processes:processes.map(p=>p.id===process.id?{...p,done:e.target.checked}:p)})}/><span><b>{i+1}.</b> {process.label}</span></label>)}</div></>}
          {stage<4?<button className="primary full kitchen-main-action" aria-label={`${dish.name}, ${orderLabel(order)}: ${stage===1&&pendingActivity?`Concluir ${pendingActivity.label}`:stage===2&&pendingProcess?`Concluir ${pendingProcess.label}`:advanceLabel}`} onClick={()=>{
            if(stage===1&&pendingActivity){update({activities:production.activities.map(a=>a.id===pendingActivity.id?{...a,done:true}:a)});setMessage(`${dish.name}: ${pendingActivity.label} concluído.`)}
            else if(stage===2&&pendingProcess){update({processes:processes.map(p=>p.id===pendingProcess.id?{...p,done:true}:p)});setMessage(`${dish.name}: ${pendingProcess.label} concluído.`)}
            else nextColumn&&changeStage(order,index,production,dish,nextColumn.id)
          }}>{(stage===1&&pendingActivity)||(stage===2&&pendingProcess)?<><Check size={24}/>Feito! Próxima atividade</>:<>{advanceLabel}<ArrowRight size={24}/></>}</button>:<div className="ready-message"><Check size={24}/>{readyCount===order.items.length?'Pode chamar o garçom / expedição':'Aguardando os outros pratos'}</div>}
          <details className="production-details"><summary>Detalhes e ajustes</summary>
          <label className="owner-label">Responsável<input value={production.owner} placeholder="Nome da pessoa" maxLength={50} onChange={e => update({owner: e.target.value})}/></label>
          <p className="production-timing">Início planejado: +{maxMinutes-dish.minutes} min da entrada do pedido.</p>
          <p className="footnote">Sequência: {processes.map(p=>p.label).join(' → ')}</p>
          {!dish.processes?.length&&!production.processes&&<p className="footnote">Checklist genérico. Configure os processos deste prato no fim da tela.</p>}
          {stage < 2 && <form className="add-activity" onSubmit={e => {e.preventDefault(); const label = drafts[key]?.trim(); if (!label) return; update({activities: [...production.activities, {id: crypto.randomUUID(), label, done:false}]}); setDrafts(d => ({...d, [key]: ''}));}}><input aria-label={`Nova atividade para ${dish.name} ${orderLabel(order)}`} value={drafts[key] || ''} maxLength={100} placeholder="Adicionar pré-atividade" onChange={e => setDrafts({...drafts, [key]:e.target.value})}/><button aria-label="Adicionar atividade" disabled={!drafts[key]?.trim()}><Plus size={16}/></button></form>}
          {position > 0 && <button className="text-button production-back" onClick={() => changeStage(order,index,production,dish,columns[position-1].id)}><RotateCcw size={12}/> Voltar etapa</button>}
          <label className="move-stage">Mover para<select value={column.id} onChange={e=>changeStage(order,index,production,dish,e.target.value)}>{columns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          </details>
        </article>;
      })}
      {!inColumn.length && <p className="empty">Nenhuma produção nesta etapa</p>}
    </section>})}</div>
    <details className="panel process-settings"><summary>Configurar processos de preparo por prato</summary><p>Uma etapa por linha, na ordem de execução. Novas produções usam esta sequência; produções já iniciadas preservam seus processos.</p><div className="process-editors">{dishes.map(d => <ProcessEditor key={d.id} dish={d} onSave={steps=>{onProcesses(d.id,steps);setMessage(`Processos de ${d.name} salvos.`)}}/>)}</div></details>
    {!active.length && <div className="info">Todos os pedidos foram entregues. Novos pedidos aparecerão aqui automaticamente.</div>}
  </div>;
}

function ProcessEditor({dish,onSave}:{dish:Dish;onSave:(steps:string[])=>void}) {
  const [value,setValue]=useState((dish.processes??[]).join('\n'));
  return <form onSubmit={e=>{e.preventDefault();const steps=value.split('\n').map(s=>s.trim()).filter(Boolean);if(steps.length)onSave(steps)}}><label>{dish.name}<textarea value={value} onChange={e=>setValue(e.target.value)} maxLength={2000} placeholder={'Exemplo: selar\nCozinhar\nDescansar\nMontar'}/></label><button className="secondary" disabled={!value.trim()}>Salvar processos</button></form>;
}
