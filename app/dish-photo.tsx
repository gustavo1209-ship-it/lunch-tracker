'use client';
import {useState} from 'react';
import {ImageIcon} from 'lucide-react';

export type PhotoDish={id:number;name:string;photo?:string};
const examples:Record<number,string>={1:'/dishes/risoto.jpg',2:'/dishes/file.jpg',3:'/dishes/salada.jpg',4:'/dishes/salmao.jpg'};
export function dishPhoto(dish:PhotoDish){return dish.photo??examples[dish.id]??'';}

export function DishPhoto({dish}:{dish:PhotoDish}){
  const src=dishPhoto(dish);
  const [failed,setFailed]=useState('');
  return src&&src!==failed?<img className="dish-photo" src={src} alt={`Foto de ${dish.name}`} width={52} height={52} loading="lazy" onError={()=>setFailed(src)}/>:<span className="dish-photo dish-photo-placeholder" role="img" aria-label={`${dish.name}: sem foto`}><ImageIcon size={22}/></span>;
}

export function DishPhotoEditor({dish,onChange,onError}:{dish:PhotoDish;onChange:(photo:string|undefined)=>void;onError:(message:string)=>void}){
  const [busy,setBusy]=useState(false);
  return <div className="dish-photo-editor"><DishPhoto dish={dish}/><div><label className="photo-upload">{busy?'Carregando…':'Trocar foto'}<input aria-label={`Enviar foto de ${dish.name}`} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async e=>{
    const file=e.target.files?.[0];e.target.value='';if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){onError('Escolha uma foto JPG, PNG ou WebP.');return;}
    if(file.size>200000){onError('A foto deve ter no máximo 200 KB.');return;}
    setBusy(true);
    const reader=new FileReader();
    reader.onerror=()=>{setBusy(false);onError('Não foi possível ler esta foto.');};
    reader.onload=()=>{const value=String(reader.result);const image=new Image();image.onload=()=>{setBusy(false);onChange(value)};image.onerror=()=>{setBusy(false);onError('O arquivo não contém uma imagem válida.');};image.src=value;};
    reader.readAsDataURL(file);
  }}/></label><button type="button" className="text-button" disabled={busy||!dishPhoto(dish)} onClick={()=>onChange('')}>Remover foto</button>{dish.photo!==undefined&&examples[dish.id]&&<button type="button" className="text-button" disabled={busy} onClick={()=>onChange(undefined)}>Usar exemplo</button>}</div></div>;
}
