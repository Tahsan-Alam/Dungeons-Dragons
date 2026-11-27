'use client';
import {useEffect,useState} from 'react';
import {GAME_MASTER_ART_RATIO} from '../../game/presets';
import type {OwnGameMasterInput} from '../../game/own-game-master';
import {Portrait} from './RealmKit';
import {paintedFailed,usePaintedFigure} from './painted-portrait';
import {useAIPreference} from './ai-preferences';

type Access={imagesAvailable?:boolean;imagesPerDay?:number};
/** Whether this server can paint and this device has AI on. Checked once per visit. */
function useImageAccess(){
 const [access,setAccess]=useState<Access|null>(null),[ai]=useAIPreference();
 useEffect(()=>{const controller=new AbortController();
  fetch('/api/ai/access',{cache:'no-store',signal:controller.signal}).then(r=>r.ok?r.json() as Promise<Access>:null).then(setAccess).catch(()=>{});
  return()=>controller.abort();},[]);
 return ai&&access?.imagesAvailable?access:null;
}

function Option({id,checked,onPick,label}:{id:string;checked:boolean;onPick:()=>void;label:string}){
 const figure=usePaintedFigure(id),failed=paintedFailed(id);
 if(failed)return <span className="realm-choice qs-paint-option qs-paint-unusable" title="The painter left a background that can’t be cleared."><span className="qs-paint-loading" aria-hidden="true"/><span>Can’t use</span></span>;
 return <button type="button" role="radio" aria-checked={checked} aria-label={label} className="realm-choice qs-paint-option" onClick={onPick} disabled={!figure}>
  {figure?<Portrait art={figure.art} face={figure.face} ratio={GAME_MASTER_ART_RATIO} width={64} height={78} scale={1.7}/>:<span className="qs-paint-loading" aria-hidden="true"/>}
  <span>{label}</span></button>;
}

/** "Paint them": the image model paints your own Game Master from the builder's choices and a few words.
    Two options come back; the player keeps one, or keeps the drawing. Only shown when the server offers it. */
export default function PaintGameMaster({own,name,drawing,setPortrait}:{own:OwnGameMasterInput;name:string;drawing:string;setPortrait:(id:string|undefined)=>void}){
 const access=useImageAccess();
 const [description,setDescription]=useState(''),[pending,setPending]=useState(false),[error,setError]=useState(''),[options,setOptions]=useState<string[]>(own.portrait?[own.portrait]:[]);
 if(!access)return null;
 async function paint(){
  if(pending||!name.trim())return;setPending(true);setError('');
  try{
   const response=await fetch('/api/ai/paint',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({name,form:own.form,accessory:own.accessory,color:own.color,tone:own.tone,description,requestId:crypto.randomUUID()})});
   const data=await response.json() as {images?:string[];error?:string};
   if(!response.ok||!data.images?.length)throw new Error(data.error??'The painter could not finish. Your Game Master keeps their drawing.');
   setOptions(data.images);setPortrait(undefined);
  }catch(e){setError(e instanceof Error?e.message:'The painter could not finish.');}
  finally{setPending(false);}
 }
 return <fieldset className="qs-own-set qs-paint">
  <legend className="realm-eyebrow">Paint them</legend>
  <p className="qs-paint-note">The painter turns your choices into a picture in the realm’s style. Up to {access.imagesPerDay??4} pictures a day; each try paints two.</p>
  <label className="qs-paint-describe"><span className="sr-only">A few words for the painter</span>
   <input name="paint-description" value={description} maxLength={80} placeholder="A few words: a one-eyed sailor with a parrot" autoComplete="off" onChange={e=>setDescription(e.target.value)}/></label>
  <div className="qs-paint-row">
   <button type="button" className="qs-own-chip qs-paint-go" onClick={()=>void paint()} disabled={pending||!name.trim()}>{pending?'Painting…':options.length?'Paint again':'Paint them'}</button>
   {!name.trim()?<span className="qs-paint-hint">Name them first.</span>:null}
  </div>
  {error?<p className="qs-own-taken" role="status">{error}</p>:null}
  {options.length?<div className="qs-paint-options" role="radiogroup" aria-label="Choose their picture">
   <button type="button" role="radio" aria-checked={!own.portrait} aria-label="Keep the drawing" className="realm-choice qs-paint-option" onClick={()=>setPortrait(undefined)}>
    <img src={drawing} alt="" className="qs-paint-drawing"/><span>Drawing</span></button>
   {options.map((id,i)=><Option key={id} id={id} checked={own.portrait===id} onPick={()=>setPortrait(id)} label={`Painting ${i+1}`}/>)}
  </div>:null}
 </fieldset>;
}
