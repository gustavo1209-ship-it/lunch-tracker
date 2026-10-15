export type Activity = { id: string; label: string; done: boolean };
export type Production = { stage: number; activities: Activity[]; owner: string; processes?: Activity[] };
export type ProductionItem = { dish: number; qty: number; production?: Production };
export type KitchenOrder = { id: number; table: number; items: ProductionItem[]; status: number; created: number; note: string };

export function productionFor(item: ProductionItem, status: number): Production {
  return item.production ?? {
    stage: status >= 2 ? 4 : status === 1 ? 2 : 0,
    owner: '',
    activities: ['Conferir observações do pedido', 'Separar ingredientes', 'Porcionar e organizar a bancada'].map((label, i) => ({ id: `default-${i}`, label, done: status > 0 })),
  };
}

export function updateProduction(order: KitchenOrder, index: number, production: Production): KitchenOrder {
  if (order.status === 3) return order;
  const items = order.items.map((item, i) => ({ ...item, production: i === index ? production : productionFor(item, order.status) }));
  const stages = items.map(item => item.production.stage);
  const status = stages.every(stage => stage === 4) ? 2 : stages.some(stage => stage > 0) ? 1 : 0;
  return { ...order, items, status };
}

export function advanceOrder(order: KitchenOrder, status: number): KitchenOrder {
  return { ...order, status, items: order.items.map(item => {
    const current = productionFor(item, order.status);
    return { ...item, production: { ...current, stage: status >= 2 ? 4 : Math.max(2, current.stage), activities: current.activities.map(a => ({ ...a, done: true })), ...(current.processes ? {processes: current.processes.map(p => ({...p,done:status >= 2 ? true : p.done}))} : {}) } };
  }) };
}
