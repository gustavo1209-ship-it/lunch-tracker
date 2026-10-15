'use client';

import { useState } from 'react';
import { ChefHat, Clock3, Plus, ArrowRight, Check, RotateCcw } from 'lucide-react';
import { productionFor, type KitchenOrder, type Production } from './production';

type Dish = { id: number; name: string; minutes: number; station: string; processes?: string[] };
const stages = ['Recebidos', 'Pré-preparo', 'Em produção', 'Finalização', 'Prontos'];
const actions = ['Iniciar pré-preparo', 'Iniciar produção', 'Finalizar montagem', 'Marcar pronto'];

export default function Kitchen({ orders, dishes, now, onUpdate, onProcesses }: {
  orders: KitchenOrder[]; dishes: Dish[]; now: number;
  onUpdate: (orderId: number, itemIndex: number, production: Production) => void;
  onProcesses: (dishId: number, processes: string[]) => void;
}) {
  const [station, setStation] = useState('Todas');
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [dragged, setDragged] = useState<string | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const getProcesses = (dish: Dish, production: Production) => production.processes ?? (dish.processes ?? ['Executar preparo conforme a ficha técnica', 'Conferir ponto e montagem']).map((label, index) => ({id:`process-${index}`,label,done:production.stage === 4}));
  const active = orders.filter(order => order.status < 3);
  const tasks = active.flatMap(order => order.items.map((item, index) => ({ order, item, index, dish: dishes.find(d => d.id === item.dish)!, production: productionFor(item, order.status) })));
  const filtered = tasks.filter(t => (station === 'Todas' || t.dish.station === station) && `${t.order.table} ${t.order.id} ${t.dish.name} ${t.production.owner}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const portions = filtered.filter(t => t.production.stage < 4).reduce((sum, t) => sum + t.item.qty, 0);
  const changeStage = (order: KitchenOrder, index: number, production: Production, dish: Dish, stage: number) => {
    if (stage === production.stage) return;
    if (stage >= 2 && production.activities.some(a => !a.done)) {setMessage('Conclua as pré-atividades antes de avançar para produção.');return;}
    const processes = getProcesses(dish, production);
    if (stage >= 3 && processes.some(p => !p.done)) {setMessage('Marque os processos de preparo concluídos antes de finalizar.');return;}
    onUpdate(order.id,index,{...production,processes,stage});
    setMessage(`${dish.name} · Mesa ${order.table}: ${stages[stage]}`);
  };
  return <div className="kitchen">
    <div className="info"><ChefHat size={24}/><div><b>Antecipe o pré-preparo de cada produção</b><p>Separe ingredientes, organize a bancada e distribua responsáveis antes de iniciar o preparo. Cada cartão representa todas as porções de um prato no pedido. A mesa só fica pronta quando todos os pratos do pedido estiverem prontos.</p></div></div>
    <details className="panel process-settings"><summary>Configurar processos de preparo por prato</summary><p>Uma etapa por linha, na ordem de execução. Novas produções usam esta sequência; produções já iniciadas preservam seus processos.</p><div className="process-editors">{dishes.map(d => <ProcessEditor key={d.id} dish={d} onSave={steps=>{onProcesses(d.id,steps);setMessage(`Processos de ${d.name} salvos.`)}}/>)}</div></details>
    <p className="footnote">Arraste os cards pela alça ou use os botões e o seletor de etapa. Conclua os checklists para avançar.</p>
    <p className="kitchen-feedback" role="status" aria-live="polite">{message}</p>
    <div className="toolbar kitchen-filters"><label>Estação<select value={station} onChange={e => setStation(e.target.value)}><option>Todas</option>{Array.from(new Set(dishes.map(d => d.station))).map(s => <option key={s}>{s}</option>)}</select></label><label>Buscar produção<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Mesa, pedido, prato ou responsável"/></label><span>{portions} porções pendentes · {filtered.length} produções</span></div>
    <div className="kitchen-board">{stages.map((title, stage) => <section key={title} aria-label={title} onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect='move';setOver(stage)}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setOver(null)}} onDrop={e=>{e.preventDefault();const key=e.dataTransfer.getData('text/plain');const task=tasks.find(t=>`${t.order.id}-${t.index}`===key);if(task)changeStage(task.order,task.index,task.production,task.dish,stage);setDragged(null);setOver(null)}} className={`kitchen-lane kitchen-stage-${stage} ${over===stage?'drag-over':''}`}>
      <div className="lane-title"><span className="kitchen-dot"/><b>{title}</b><span className="count">{filtered.filter(t => t.production.stage === stage).length}</span></div>
      {filtered.filter(t => t.production.stage === stage).map(({ order, item, index, dish, production }) => {
        const key = `${order.id}-${index}`;
        const done = production.activities.filter(a => a.done).length;
        const complete = done === production.activities.length;
        const processes = getProcesses(dish, production);
        const processesDone = processes.every(p => p.done);
        const maxMinutes = Math.max(...order.items.map(i => dishes.find(d => d.id === i.dish)!.minutes));
        const readyCount = order.items.filter(i => productionFor(i, order.status).stage === 4).length;
        const update = (patch: Partial<Production>) => onUpdate(order.id, index, { ...production, ...patch });
        return <article className={`order-card production-card ${dragged===key?'dragging':''}`} key={key}>
          <div className="drag-handle" draggable onDragStart={e=>{e.dataTransfer.setData('text/plain',key);e.dataTransfer.effectAllowed='move';setDragged(key)}} onDragEnd={()=>{setDragged(null);setOver(null)}} title="Arrastar para outra etapa">⠿ Arrastar produção</div>
          <div className="card-top"><strong>Mesa {String(order.table).padStart(2,'0')}</strong><span>#{order.id}</span></div>
          <h3>{item.qty}× {dish.name}</h3><span className="production-station">{dish.station} · {dish.minutes} min</span>
          <div className="order-time"><Clock3 size={13}/>{Math.max(0, Math.floor((now-order.created)/60000))} min desde o pedido</div>
          {order.note && <p className="note">{order.note}</p>}
          <p className="production-timing">Início planejado: +{maxMinutes-dish.minutes} min da entrada do pedido. Pré-preparo pode ser adiantado.</p>
          <label className="owner-label">Responsável<input value={production.owner} placeholder="Nome da pessoa" maxLength={50} onChange={e => update({owner: e.target.value})}/></label>
          <div className="activity-heading"><b>Pré-atividades</b><span>{done}/{production.activities.length}</span></div>
          <div className="activities">{production.activities.map(activity => <label key={activity.id}><input type="checkbox" checked={activity.done} disabled={stage >= 2} onChange={e => update({stage: Math.max(1, stage), activities: production.activities.map(a => a.id === activity.id ? {...a, done: e.target.checked} : a)})}/><span>{activity.label}</span></label>)}</div>
          {stage < 2 && <form className="add-activity" onSubmit={e => {e.preventDefault(); const label = drafts[key]?.trim(); if (!label) return; update({activities: [...production.activities, {id: crypto.randomUUID(), label, done:false}]}); setDrafts(d => ({...d, [key]: ''}));}}><input aria-label={`Nova atividade para ${dish.name} mesa ${order.table}`} value={drafts[key] || ''} maxLength={100} placeholder="Adicionar pré-atividade" onChange={e => setDrafts({...drafts, [key]:e.target.value})}/><button aria-label="Adicionar atividade" disabled={!drafts[key]?.trim()}><Plus size={16}/></button></form>}
          <div className="production-progress"><Check size={13}/>{readyCount}/{order.items.length} produções prontas do pedido</div>
          <div className="activity-heading"><b>Processos de preparo</b><span>{processes.filter(p=>p.done).length}/{processes.length}</span></div>
          {!dish.processes?.length && !production.processes && <p className="activity-help">Checklist genérico. Cadastre os processos específicos deste prato acima.</p>}
          <div className="activities cooking-processes">{processes.map((process,i)=><label key={process.id}><input type="checkbox" checked={process.done} disabled={stage!==2} onChange={e=>update({processes:processes.map(p=>p.id===process.id?{...p,done:e.target.checked}:p)})}/><span><b>{i+1}.</b> {process.label}</span></label>)}</div>
          {stage<2&&<p className="activity-help">Os processos ficam disponíveis na etapa Em produção.</p>}
          {stage === 1 && !complete && <p className="activity-help">Conclua as pré-atividades para iniciar a produção.</p>}
          {stage < 4 ? <button className="primary full" disabled={(stage === 1 && !complete)||(stage===2&&!processesDone)} onClick={() => changeStage(order,index,production,dish,stage+1)}>{actions[stage]}<ArrowRight size={14}/></button> : <div className="ready-message">{readyCount === order.items.length ? 'Pedido pronto para servir junto' : 'Aguardando os outros pratos'}</div>}
          {stage > 0 && <button className="text-button production-back" onClick={() => changeStage(order,index,production,dish,stage-1)}><RotateCcw size={12}/> Voltar etapa</button>}
          <label className="move-stage">Mover para<select value={stage} onChange={e=>changeStage(order,index,production,dish,+e.target.value)}>{stages.map((s,i)=><option key={s} value={i}>{s}</option>)}</select></label>
        </article>;
      })}
      {!filtered.some(t => t.production.stage === stage) && <p className="empty">Nenhuma produção nesta etapa</p>}
    </section>)}</div>
    {!active.length && <div className="info">Todos os pedidos foram entregues. Novos pedidos aparecerão aqui automaticamente.</div>}
  </div>;
}

function ProcessEditor({dish,onSave}:{dish:Dish;onSave:(steps:string[])=>void}) {
  const [value,setValue]=useState((dish.processes??[]).join('\n'));
  return <form onSubmit={e=>{e.preventDefault();const steps=value.split('\n').map(s=>s.trim()).filter(Boolean);if(steps.length)onSave(steps)}}><label>{dish.name}<textarea value={value} onChange={e=>setValue(e.target.value)} maxLength={2000} placeholder={'Exemplo: selar\nCozinhar\nDescansar\nMontar'}/></label><button className="secondary" disabled={!value.trim()}>Salvar processos</button></form>;
}
