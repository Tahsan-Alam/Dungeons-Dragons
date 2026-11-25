'use client';
import {playSound} from './sound/engine';
import {useLayoutEffect,useRef,useState} from 'react';
import type {GameState} from '../../game/types';
import {SCENE_FOR_BIOME} from '../../game/presets';
import './sealed-note.css';

const STORE='painted-realms.sealed-notes';
/** Which sealed notes this browser has opened. Only a convenience: if storage is unavailable the note is offered again. */
export function sealedOpened(key:string){try{return (JSON.parse(localStorage.getItem(STORE)||'[]') as string[]).includes(key)}catch{return false}}
export function markSealedOpened(key:string){try{const seen=JSON.parse(localStorage.getItem(STORE)||'[]') as string[];if(!seen.includes(key))localStorage.setItem(STORE,JSON.stringify([...seen,key].slice(-200)))}catch{/* storage unavailable */}}

/** The Game Master's mark pressed into the wax. */
export function SealSigil({gm}:{gm:string}){
 return <svg viewBox="-20 -20 40 40" className="sn-sigil" aria-hidden="true">
  {gm==='wanderer'?<g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M-6-11h12M-4-11v-3h8v3"/><path d="M-7-11 -9 8h18L7-11"/><path d="M-11 8h22"/><path d="M0-5c-3 4-3 7 0 9 3-2 3-5 0-9Z" fill="currentColor" stroke="none"/></g>
  :gm==='survivor'?<g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"><path d="M-8-12h16c0 9-4 13-8 13S-8-3-8-12Z"/><path d="M0 1v9M-6 11h12"/><path d="M-5-7h10" opacity=".7"/></g>
  :<g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M-13 0C-7-8 7-8 13 0 7 8-7 8-13 0Z"/><path d="M0-6c-2 3-2 9 0 12 2-3 2-9 0-12Z" fill="currentColor"/></g>}
 </svg>;
}

/**
 * The quest has begun: the Game Master hands this player, and only this player, a sealed note. Breaking the seal shows
 * the secret that ties their hero to the Game Master. It stays in the hero sheet afterwards.
 */
export default function SealedNote({game,heroName,gmId,gmName,gmRealName,gmArt,secret,opened=false,onClose}:{game:GameState;heroName:string;gmId:string;gmName:string;gmRealName:string;gmArt:string;secret:string;opened?:boolean;onClose:(opened:boolean)=>void}){
 const dialog=useRef<HTMLDialogElement>(null),[open,setOpen]=useState(opened),close=useRef(onClose),state=useRef(open);
 useLayoutEffect(()=>{close.current=onClose;state.current=open});
 useLayoutEffect(()=>{
  const el=dialog.current;el?.showModal();(el?.querySelector('[data-autofocus]') as HTMLElement|null)?.focus();
  const cancel=(e:Event)=>{e.preventDefault();close.current(state.current)};el?.addEventListener('cancel',cancel);
  return()=>{el?.removeEventListener('cancel',cancel);el?.close()};
 },[]);
 // Opening the seal moves focus to the note itself, so it is read first.
 useLayoutEffect(()=>{if(open&&!opened)(dialog.current?.querySelector('.sn-paper') as HTMLElement|null)?.focus()},[open,opened]);
 const scene=SCENE_FOR_BIOME[game.options.biome].scene,first=heroName.split(' ')[0];
 return <dialog ref={dialog} className={`sn-scene realm gm-${gmId} ${open?'is-open':''}`} aria-label={`Sealed note for ${heroName}`}>
  <img className="sn-backdrop" src={scene} alt="" aria-hidden="true"/>
  <div className="sn-wash" aria-hidden="true"/>
  <div className="sn-figure" aria-hidden="true"><img src={gmArt} alt=""/><span className="sn-shadow"/></div>
  <header className="sn-title"><p>Chapter I · The quest begins</p><h1>For your eyes only</h1></header>
  <section className="sn-stage">
   <div className="sn-letter">
    {open?<div className="sn-paper" tabIndex={-1} role="document" aria-label={`What ${gmName} has never told you`}>
     <span className="sn-broken" aria-hidden="true"><span className="sn-half left"><SealSigil gm={gmId}/></span><span className="sn-half right"><SealSigil gm={gmId}/></span></span>
     <p className="sn-from">What {gmName} has never told you</p>
     <p className="sn-secret">{secret}</p>
     <p className="sn-sign">— {gmRealName}</p>
     <p className="sn-private">Only you can see this. It stays in {first}’s hero sheet.</p>
    </div>:<div className="sn-envelope">
     <div className="sn-flap" aria-hidden="true"/>
     <div className="sn-seal" aria-hidden="true"><SealSigil gm={gmId}/></div>
     <p className="sn-to"><span>For the eyes of</span>{heroName}</p>
     <p className="sn-hint">{gmName} presses it into your hand before the road starts. No one else at the table can read it.</p>
    </div>}
   </div>
   <div className="sn-actions">
    {open?<button type="button" className="sn-primary" data-tooltip="none" data-keep data-autofocus={opened||undefined} onClick={()=>onClose(true)}>Keep it close<span aria-hidden="true">›</span></button>
    :<><button type="button" className="sn-secondary" data-tooltip="none" onClick={()=>onClose(false)}>Later</button><button type="button" className="sn-primary" data-tooltip="none" data-autofocus data-ui-sound="off" onClick={()=>{playSound('ui-seal');playSound('ui-unfold',{delay:.3});setOpen(true)}}>Break the seal</button></>}
   </div>
  </section>
 </dialog>;
}
