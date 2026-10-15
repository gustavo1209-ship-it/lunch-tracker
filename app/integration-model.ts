import type { KitchenOrder } from './production';

export type Provider = 'ifood' | 'deliverymuch';
export type IncomingOrder = {
  provider: Provider; merchantId: string; externalId: string; code: string;
  fulfillment: 'delivery' | 'pickup'; note: string;
  items: { externalSku: string; name: string; qty: number }[];
};
export type InboxEntry = IncomingOrder & { receivedAt: number; state: 'pending' | 'imported' | 'archived'; localId?: number };
export type IntegrationState = { merchants: Record<Provider, string>; inbox: InboxEntry[]; mappings: Record<string, number> };
export const emptyIntegrations = (): IntegrationState => ({merchants:{ifood:'',deliverymuch:''},inbox:[],mappings:{}});
export const incomingKey = (o: IncomingOrder) => JSON.stringify([o.provider,o.merchantId,o.externalId]);
export const mappingKey = (o: IncomingOrder, sku: string) => JSON.stringify([o.provider,o.merchantId,sku]);

// Internal exchange format, not either marketplace's native API payload.
export function parseIncoming(text: string): IncomingOrder {
  if(text.length > 50000) throw new Error('O JSON deve ter até 50 mil caracteres.');
  const raw = JSON.parse(text);
  if(!raw || typeof raw !== 'object' || !['ifood','deliverymuch'].includes(raw.provider)) throw new Error('provider deve ser ifood ou deliverymuch.');
  const str = (v: unknown, label: string, max = 160): string => {if(typeof v !== 'string' || !v.trim() || v.length > max)throw new Error(`${label}: informe um texto válido (até ${max} caracteres).`);return v.trim();};
  if(!['delivery','pickup'].includes(raw.fulfillment)) throw new Error('fulfillment deve ser delivery ou pickup.');
  if(!Array.isArray(raw.items) || raw.items.length === 0 || raw.items.length > 50) throw new Error('Informe de 1 a 50 itens.');
  const items = raw.items.map((i: Record<string, unknown>) => {
    if(!i || !Number.isInteger(i.qty) || Number(i.qty)<1 || Number(i.qty)>50) throw new Error('Cada quantidade deve ser inteira, entre 1 e 50.');
    return {externalSku:str(i.externalSku,'SKU'),name:str(i.name,'Nome do item'),qty:Number(i.qty)};
  });
  if(new Set(items.map((i: {externalSku:string})=>i.externalSku)).size !== items.length) throw new Error('Agrupe quantidades do mesmo SKU antes de importar.');
  return {provider:raw.provider,merchantId:str(raw.merchantId,'ID da loja'),externalId:str(raw.externalId,'ID do pedido'),code:str(raw.code,'Código'),fulfillment:raw.fulfillment,note:raw.note === undefined || raw.note === '' ? '' : str(raw.note,'Observações',1000),items};
}

export function receiveIncoming(state: IntegrationState, incoming: IncomingOrder, now: number): IntegrationState {
  if(state.inbox.some(o=>incomingKey(o)===incomingKey(incoming))) throw new Error('Este pedido já está na central. Nenhuma duplicata foi criada.');
  return {...state,inbox:[{...incoming,receivedAt:now,state:'pending'},...state.inbox]};
}

export function importIncoming(state: IntegrationState, orders: KitchenOrder[], key: string, dishIds: number[], now: number) {
  const entry=state.inbox.find(o=>incomingKey(o)===key);
  if(!entry || entry.state!=='pending')throw new Error('Pedido indisponível para importação.');
  if(orders.some(o=>o.source===entry.provider && o.merchantId===entry.merchantId && o.externalId===entry.externalId))throw new Error('Pedido já importado para a cozinha.');
  const quantities = new Map<number,number>();
  for(const item of entry.items){const dish=state.mappings[mappingKey(entry,item.externalSku)];if(!dishIds.includes(dish))throw new Error('Vincule todos os itens a pratos do cardápio antes de importar.');quantities.set(dish,(quantities.get(dish)||0)+item.qty);}
  const id=Math.max(1000,...orders.map(o=>o.id))+1;
  const order:KitchenOrder={id,table:0,status:0,created:now,items:[...quantities].map(([dish,qty])=>({dish,qty})),note:entry.note,source:entry.provider,merchantId:entry.merchantId,externalId:entry.externalId,externalCode:entry.code,fulfillment:entry.fulfillment};
  return {orders:[...orders,order],integrations:{...state,inbox:state.inbox.map(o=>incomingKey(o)===key?{...o,state:'imported' as const,localId:id}:o)}};
}
