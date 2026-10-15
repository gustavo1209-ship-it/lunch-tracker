import type {Production} from './production';
export type KanbanColumn={id:string;name:string;phase:number;color:string};
export const columnColors=['#738598','#7972ba','#bc862b','#bd7352','#41855b'];
export const defaultColumns:KanbanColumn[]=['Recebidos','Pré-preparo','Em produção','Finalização','Prontos'].map((name,phase)=>({id:`phase-${phase}`,name,phase,color:columnColors[phase]}));
export function columnFor(production:Production,columns:KanbanColumn[]):KanbanColumn{
  return columns.find(c=>c.id===production.columnId&&c.phase===production.stage)??columns.find(c=>c.phase===production.stage)!;
}
export function validateColumns(columns:KanbanColumn[]):void{
  if(columns.length<5||columns.length>12)throw new Error('Use entre 5 e 12 colunas.');
  if(new Set(columns.map(c=>c.id)).size!==columns.length)throw new Error('Identificadores de coluna repetidos.');
  if(new Set(columns.map(c=>c.name.trim().toLocaleLowerCase())).size!==columns.length)throw new Error('Cada coluna precisa ter um nome diferente.');
  for(const [i,c] of columns.entries()){
    if(!c.name.trim()||c.name.length>35)throw new Error('Nomes devem ter entre 1 e 35 caracteres.');
    if(!Number.isInteger(c.phase)||c.phase<0||c.phase>4||!/^#[0-9a-f]{6}$/i.test(c.color))throw new Error('Coluna inválida.');
    if(i>0&&c.phase<columns[i-1].phase)throw new Error('Mantenha a sequência: recebimento, pré-preparo, produção, finalização e pronto.');
  }
  for(let phase=0;phase<5;phase++)if(!columns.some(c=>c.phase===phase))throw new Error('Mantenha pelo menos uma coluna de cada fase.');
  if(columns.filter(c=>c.phase===4).length!==1)throw new Error('Use apenas uma coluna de conclusão.');
}
