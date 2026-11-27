'use client';
import {useEffect,useState} from 'react';
import {GAME_MASTER_ART_RATIO,HERO_ART_RATIO} from '../../game/presets';
import {MAX_PAINTINGS} from '../../game/own-paintings';
import {Portrait} from './RealmKit';
import {borrowedName} from '../../game/paint-words';
import {paintedFailed,usePaintedFigure,type PaintedKind} from './painted-portrait';

type Access={imagesAvailable?:boolean;imagesPerDay?:number};
/** Whether this server can paint for this device. The server answers from its own painting setup and the
    device's AI on/off cookie, so painting works even where the paid text AI isn't set up. Checked once per screen. */
export function useImageAccess(){
 const [access,setAccess]=useState<Access|null>(null);
 useEffect(()=>{const controller=new AbortController();
  fetch('/api/ai/access',{cache:'no-store',signal:controller.signal}).then(r=>r.ok?r.json() as Promise<Access>:null).then(setAccess).catch(()=>{});
  return()=>controller.abort();},[]);
 return access?.imagesAvailable?access:null;
}

function Option({id,kind,checked,onPick,label}:{id:string;kind:PaintedKind;checked:boolean;onPick:()=>void;label:string}){
 const figure=usePaintedFigure(id,kind),failed=paintedFailed(id,kind);
 if(failed)return <span className="realm-choice qs-paint-option qs-paint-unusable" title="The figure can’t be cut out cleanly: a background or frame behind it, or part of it outside the picture."><span className="qs-paint-loading" aria-hidden="true"/><span>Can’t use</span></span>;
 return <button type="button" role="radio" aria-checked={checked} aria-label={label} className="realm-choice qs-paint-option" onClick={onPick} disabled={!figure}>
  {figure?<Portrait art={figure.art} face={figure.face} ratio={kind==='hero'?HERO_ART_RATIO:GAME_MASTER_ART_RATIO} width={64} height={78} scale={1.7}/>:<span className="qs-paint-loading" aria-hidden="true"/>}
  <span>{label}</span></button>;
}

/** Paint mode: the player describes their Game Master or hero in their own words and the image model paints one
    picture per try. Every painting stays in the list (newest first) to choose from; the chosen one is theirs.
    `extra` is sent with the request (a hero's class, which sets their gear). */
export default function PaintPanel({kind,extra={},paintings,portrait,onPainted,onChoose,placeholder,available,perDay}:{kind:PaintedKind;extra?:Record<string,string>;
 paintings:string[];portrait?:string;onPainted:(id:string)=>void;onChoose:(id:string)=>void;placeholder:string;available:boolean;perDay?:number}){
 const [description,setDescription]=useState(''),[pending,setPending]=useState(false),[error,setError]=useState('');
 const borrowed=borrowedName(description),words=description.trim(),who=kind==='hero'?'hero':'Game Master';
 async function paint(){
  if(pending||words.length<3||borrowed||!available)return;setPending(true);setError('');
  try{
   const response=await fetch('/api/ai/paint',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({...extra,kind,description:words,requestId:crypto.randomUUID()})});
   const data=await response.json() as {images?:string[];error?:string};
   if(!response.ok||!data.images?.length)throw new Error(data.error??'The painter could not finish. Try again.');
   onPainted(data.images[0]);
  }catch(e){setError(e instanceof Error?e.message:'The painter could not finish.');}
  finally{setPending(false);}
 }
 return <div className="qs-paint">
  <label className="qs-own-who qs-paint-describe"><span className="realm-eyebrow">Describe them</span>
   <textarea name="paint-description" value={description} maxLength={200} rows={3} placeholder={placeholder} onChange={e=>setDescription(e.target.value)}
    onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void paint();}}}/></label>
  <div className="qs-paint-row">
   <button type="button" className="qs-own-chip qs-paint-go" onClick={()=>void paint()} disabled={!available||pending||words.length<3||!!borrowed}>{pending?'Painting…':paintings.length?'Paint another':'Paint them'}</button>
   <span className="qs-paint-hint">{available?`One picture per try · up to ${perDay??4} ${who} paintings a day`:'Painting isn’t available here. Switch to Draw them.'}</span>
  </div>
  {borrowed?<p className="qs-own-taken" role="status">“{borrowed}” belongs to another story. Describe how they look instead.</p>:null}
  {error?<p className="qs-own-taken" role="status">{error}</p>:null}
  {paintings.length?<div className="qs-paint-options" role="radiogroup" aria-label="Choose their picture">
   {paintings.slice(0,MAX_PAINTINGS).map((id,i)=><Option key={id} id={id} kind={kind} checked={portrait===id} onPick={()=>onChoose(id)} label={`Painting ${paintings.length-i}`}/>)}
  </div>:null}
 </div>;
}

/** The two ways to make your own: draw them from our parts, or paint them with the image AI from your own words.
    The AI way only appears where the server offers painting (or a creation was painted before, so it can be switched back). */
export function ModeSwitch({mode,setMode,canPaint,drawHint}:{mode:'draw'|'paint';setMode:(m:'draw'|'paint')=>void;canPaint:boolean;drawHint:string}){
 if(!canPaint&&mode!=='paint')return null;
 return <div className="qs-mode" role="radiogroup" aria-label="How to make them">
  <button type="button" role="radio" aria-checked={mode==='draw'} className="realm-choice qs-mode-pick" onClick={()=>setMode('draw')}><strong>Draw them</strong><span>{drawHint}</span></button>
  <button type="button" role="radio" aria-checked={mode==='paint'} className="realm-choice qs-mode-pick" onClick={()=>setMode('paint')}><strong>Paint them with AI</strong><span>Describe them in your own words</span></button>
 </div>;
}
