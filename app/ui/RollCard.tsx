'use client';
import {useEffect,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import type {GameEvent,GameState} from '../../game/types';
import {useTheme} from './Theme';
import './roll-card.css';

/* The dice, without covering the board: a compact card above the action bar. The board itself shows the outcome
   (the target's flash, the damage number and its health). Watching or dismissing a roll never sends an action. */

export const ROLL_TUMBLE_MS=800,ROLL_LINGER_MS=2200;

export function Die({value,size=48,tone='ally',big=false,rolling=false}:{value?:number;size?:number;tone?:'ally'|'foe'|'crit';big?:boolean;rolling?:boolean}){
 return <svg className={`rc-die ${tone}${big?' big':''}${rolling?' rolling':''}`} width={size} height={size} viewBox="-4 -4 62 62" aria-hidden="true">
  {big?<circle cx="27" cy="27" r="30" className="rc-die-glow"/>:null}
  <g className="rc-die-body"><path d="M27 3 L49 15 V39 L27 51 L5 39 V15Z" className="rc-die-face"/><path d="M27 3 L27 17 M5 15 L17 22 M49 15 L37 22 M27 51 L27 41 M17 22 L37 22 L27 41Z" className="rc-die-edges"/>
  {value!==undefined&&!rolling?<text x="27" y="34" textAnchor="middle">{value}</text>:null}</g>
 </svg>;
}

/** “14 + 5 = 19 against AC 13” in Classic; Streamlined hits on anything but a natural 1. */
export function rollSum(event:GameEvent):ReactNode {
 const a=event.attack,roll=event.roll??0;
 if(a?.bonus!==undefined&&a.ac!==undefined)return <>{roll} <span className="roll-dim">+ {a.bonus}</span> = {roll+a.bonus} <span className="roll-dim">against AC {a.ac}</span></>;
 return <>{roll} <span className="roll-dim">on the die</span></>;
}
export function rollOutcome(event:GameEvent):{text:string;tone:'hit'|'miss'|'crit'|'plain'} {
 const a=event.attack;
 if(!a)return {text:event.text,tone:'plain'};
 if(a.critical)return {text:`Critical hit · ${a.damage} damage`,tone:'crit'};
 return a.hit?{text:`Hit · ${a.damage} damage`,tone:'hit'}:{text:'Miss',tone:'miss'};
}
export const bigMoment=(event:GameEvent,game:GameState)=>event.roll===20||event.roll===1||!event.attack||(!!event.attack.hit&&!!game.actors.find(a=>a.id===event.attack!.targetId&&a.hp<=0));

/** Your own attack or power: the roll starts as soon as you choose it on the target card. */
export function OwnRoll({label,result,onShown,onDone}:{label:string;result?:GameEvent;onShown?:()=>void;onDone:()=>void}){
 const{reducedMotion}=useTheme();
 const[tumbled,setTumbled]=useState(reducedMotion),[held,setHeld]=useState(false),done=useRef(onDone),announced=useRef(onShown);
 useLayoutEffect(()=>{done.current=onDone;announced.current=onShown});
 useEffect(()=>{if(reducedMotion)return;const t=setTimeout(()=>setTumbled(true),ROLL_TUMBLE_MS);return()=>clearTimeout(t)},[reducedMotion]);
 const shown=tumbled&&result?result:undefined;
 useEffect(()=>{if(shown)announced.current?.()},[shown]);
 useEffect(()=>{if(!shown||held)return;const t=setTimeout(()=>done.current(),ROLL_LINGER_MS);return()=>clearTimeout(t)},[shown,held]);
 const outcome=shown?rollOutcome(shown):undefined,crit=shown?.roll===20;
 return <div className={`roll-card ally${crit?' big crit':''}`} role="status" aria-live="polite" aria-atomic="true" onPointerEnter={()=>setHeld(true)} onPointerLeave={()=>setHeld(false)}>
  <Die value={shown?.roll} rolling={!shown} tone={crit?'crit':'ally'} big={crit} size={crit?68:48}/>
  <div className="roll-lines"><span className="roll-label">{label}</span>
   {crit?<strong className="roll-moment">Natural 20 · Critical hit</strong>:null}
   <span className="roll-sum">{shown?rollSum(shown):'Rolling…'}</span>
   {outcome?<span className={`roll-outcome ${outcome.tone}`}>{outcome.text}</span>:null}
  </div>
 </div>;
}

export type SharedRollItem={event:GameEvent;actorName:string;targetName?:string;description:string;foe:boolean};
/** Other players', companions' and enemies' rolls, one at a time, advancing on their own. */
export function SharedRollCard({roll,remaining,paused,big,onPausedChange,onDone}:{roll:SharedRollItem;remaining:number;paused:boolean;big:boolean;onPausedChange:(paused:boolean)=>void;onDone:()=>void}){
 const{reducedMotion}=useTheme();
 const[tumbled,setTumbled]=useState(reducedMotion),[held,setHeld]=useState(false),[visible,setVisible]=useState(()=>typeof document==='undefined'||!document.hidden),done=useRef(onDone);
 useLayoutEffect(()=>{done.current=onDone});
 useEffect(()=>{const changed=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',changed);return()=>document.removeEventListener('visibilitychange',changed)},[]);
 useEffect(()=>{if(reducedMotion||!visible)return;const t=setTimeout(()=>setTumbled(true),ROLL_TUMBLE_MS);return()=>clearTimeout(t)},[reducedMotion,visible]);
 useEffect(()=>{if(!tumbled||paused||held||!visible)return;const t=setTimeout(()=>done.current(),roll.event.attack?ROLL_LINGER_MS:ROLL_LINGER_MS*2);return()=>clearTimeout(t)},[tumbled,paused,held,visible,roll.event.attack]);
 const crit=tumbled&&roll.event.roll===20,outcome=tumbled?rollOutcome(roll.event):undefined;
 const label=`${roll.actorName} · ${roll.description}${roll.targetName?` → ${roll.targetName}`:''}`;
 return <div className={`roll-card ${roll.foe?'foe':'ally'}${big&&tumbled?' big':''}${crit?' crit':''}`} role="status" aria-live="polite" aria-atomic="true" onPointerEnter={()=>setHeld(true)} onPointerLeave={()=>setHeld(false)}>
  <Die value={roll.event.roll} rolling={!tumbled} tone={crit?'crit':roll.foe?'foe':'ally'} big={crit} size={crit?68:48}/>
  <div className="roll-lines"><span className="roll-label">{label}</span>
   {crit?<strong className="roll-moment">Natural 20 · Critical hit</strong>:null}
   <span className="roll-sum">{tumbled?(roll.event.attack?rollSum(roll.event):<>Rolled {roll.event.roll}</>):`${roll.actorName} is rolling…`}</span>
   {outcome?<span className={`roll-outcome ${outcome.tone}`}>{roll.event.attack?outcome.text:roll.event.text}</span>:null}
   {remaining>1||paused?<span className="roll-queue"><span>{remaining>1?`${remaining-1} more ${remaining===2?'roll':'rolls'}`:'Paused'}</span>
    <button type="button" onClick={()=>onPausedChange(!paused)}>{paused?'Resume':'Pause'}</button>
    <button type="button" className="next" onClick={()=>done.current()}>{remaining>1?'Next ›':'Done'}</button></span>:null}
  </div>
 </div>;
}
