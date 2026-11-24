'use client';
import {useLayoutEffect,useRef,type ReactNode} from 'react';
import type {GameState} from '../../game/types';
import {GAME_MASTERS} from '../../game/presets';
import type {Biome} from '../../game/types';
import NarratorAvatar from './NarratorAvatar';
import {useTheme} from './Theme';
import './gm-scene.css';

/** The region behind the Game Master, by day or after dusk (design canvas: World page mood boards). Follows Time of day. */
const REGION:Record<Biome,string>={woodland:'lanternwood',ruins:'reach',coast:'saltreach'};
export const regionScene=(biome:Biome,night:boolean)=>`/art/scenes/region-${REGION[biome]??'lanternwood'}-${night?'dusk':'day'}.svg`;

/** A full-screen moment with the Game Master standing in the tale's place: the chapter opening and Ask.
    The panel along the bottom holds what they say and the way back to the encounter. */
export default function GameMasterScene({game,label,eyebrow,title,talking=false,onClose,children,className=''}:{game:GameState;label:string;eyebrow?:string;title:string;talking?:boolean;onClose:()=>void;children:ReactNode;className?:string}){
 const dialog=useRef<HTMLDialogElement>(null),close=useRef(onClose);
 useLayoutEffect(()=>{close.current=onClose});
 useLayoutEffect(()=>{
  const el=dialog.current;el?.showModal();(el?.querySelector('[data-autofocus]') as HTMLElement|null)?.focus();
  const cancel=(e:Event)=>{e.preventDefault();close.current()};el?.addEventListener('cancel',cancel);
  return()=>{el?.removeEventListener('cancel',cancel);el?.close()};
 },[]);
 const narrator=game.options.creation?.narrator,gm=GAME_MASTERS.find(g=>g.profile.name===narrator?.name);
 const night=useTheme().resolvedColorMode==='dark',scene=regionScene(game.options.biome,night);
 return <dialog ref={dialog} className={`gm-scene realm ${night?'dusk':'day'} ${className}`} aria-label={label}>
  <img className="gm-backdrop" src={scene} alt="" aria-hidden="true"/>
  <div className="gm-wash" aria-hidden="true"/>
  <div className="gm-figure" aria-hidden="true">{gm?<img src={gm.art} alt=""/>:<NarratorAvatar profile={narrator} size={220} talking={talking}/>}<span className="gm-shadow"/></div>
  <header className="gm-title">{eyebrow?<p className="gm-eyebrow">{eyebrow}</p>:null}<h1>{title}</h1></header>
  <section className="gm-panel">{children}</section>
 </dialog>;
}
