'use client';
import {playSound} from './sound/engine';
import type {CueName} from './sound/catalog';
import type {KeyboardEvent,ReactNode} from 'react';
import './menu-kit.css';

/* The menu screens' own controls (Adventures, Table settings, the guide), drawn like a game's options menu.
   Each chooser is one keyboard stop that ←/→ change; the arrows and notches are there for the pointer. */
export type MenuOption<T extends string>={value:T;label:string};

function stepKey(event:KeyboardEvent,step:(delta:number)=>void,edge:(end:boolean)=>void){
 if(event.key==='ArrowLeft'){event.preventDefault();step(-1)}
 else if(event.key==='ArrowRight'){event.preventDefault();step(1)}
 else if(event.key==='Home'){event.preventDefault();edge(false)}
 else if(event.key==='End'){event.preventDefault();edge(true)}
}

/** ‹ value › with a notch for each choice. */
export function Chooser<T extends string>({label,options,value,onChange,disabled=false,describedBy,cue='ui-tick'}:{label:string;options:readonly MenuOption<T>[];value:T;onChange:(value:T)=>void;disabled?:boolean;describedBy?:string;cue?:CueName}){
 const index=Math.max(0,options.findIndex(option=>option.value===value));
 const go=(next:number)=>{if(disabled||next<0||next>=options.length||next===index)return;playSound(cue,{rate:.92+next/Math.max(1,options.length-1)*.16});onChange(options[next].value)};
 return <div className="mk-pick" role="slider" tabIndex={disabled?-1:0} aria-label={label} aria-describedby={describedBy} aria-disabled={disabled||undefined}
  aria-valuemin={0} aria-valuemax={options.length-1} aria-valuenow={index} aria-valuetext={options[index]?.label} data-menu-control=""
  onKeyDown={event=>stepKey(event,delta=>go(index+delta),end=>go(end?options.length-1:0))}>
  <button type="button" tabIndex={-1} className="mk-arrow" data-ui-sound="off" aria-label={`Previous: ${label}`} disabled={disabled||index===0} onClick={()=>go(index-1)}>‹</button>
  <span className="mk-value">{options[index]?.label}</span>
  <button type="button" tabIndex={-1} className="mk-arrow" data-ui-sound="off" aria-label={`Next: ${label}`} disabled={disabled||index===options.length-1} onClick={()=>go(index+1)}>›</button>
  <span className="mk-notches" aria-hidden="true">{options.map((option,i)=><i key={option.value} className={i===index?'on':''}/>)}</span>
 </div>;
}

/** A level as ten notches, like a game's volume bar. */
export function Notches({label,value,onChange,min=0,max=1,steps=10,format,disabled=false}:{label:string;value:number;onChange:(value:number)=>void;min?:number;max?:number;steps?:number;format?:(value:number)=>string;disabled?:boolean}){
 const index=Math.round((value-min)/(max-min)*steps),clamped=Math.min(steps,Math.max(0,index));
 const toValue=(i:number)=>Math.round((min+(max-min)*i/steps)*100)/100;
 const go=(next:number)=>{if(disabled)return;const i=Math.min(steps,Math.max(0,next));if(i!==clamped){playSound('ui-tick',{rate:.8+i/steps*.5});onChange(toValue(i))}};
 const text=format?format(toValue(clamped)):`${Math.round(clamped/steps*100)}%`;
 return <div className="mk-bars" role="slider" tabIndex={disabled?-1:0} aria-label={label} aria-disabled={disabled||undefined} aria-valuemin={0} aria-valuemax={steps} aria-valuenow={clamped} aria-valuetext={text} data-menu-control=""
  onKeyDown={event=>stepKey(event,delta=>go(clamped+delta),end=>go(end?steps:0))}>
  <span className="mk-bar-row">{Array.from({length:steps},(_,i)=><i key={i} className={i<clamped?'on':''} onPointerDown={event=>{event.preventDefault();(event.currentTarget.closest('[role=slider]') as HTMLElement|null)?.focus();go(i+1===clamped&&i===0?0:i+1)}}/>)}</span>
  <b>{text}</b>
 </div>;
}

/** Off / On as a chooser. */
export function OnOff({label,on,onChange,disabled,describedBy}:{label:string;on:boolean;onChange:(on:boolean)=>void;disabled?:boolean;describedBy?:string}){
 return <Chooser label={label} describedBy={describedBy} disabled={disabled} cue="ui-toggle" options={[{value:'off',label:'Off'},{value:'on',label:'On'}]} value={on?'on':'off'} onChange={value=>onChange(value==='on')}/>;
}

/** One option: its name and a line about it on the left, the control on the right. */
export function MenuRow({name,why,id,children,wide=false}:{name:string;why?:ReactNode;id?:string;children:ReactNode;wide?:boolean}){
 return <div className={`mk-row${wide?' wide':''}`}><div className="mk-text"><span className="mk-name">{name}</span>{why?<span className="mk-why" id={id}>{why}</span>:null}</div><div className="mk-control">{children}</div></div>;
}

/** The keys a screen answers to, along its foot. Hidden on touch screens. */
export function KeyHints({hints}:{hints:[keys:string[],label:string][]}){
 return <div className="mk-keys" aria-hidden="true">{hints.map(([keys,label])=><span key={label}>{keys.map(key=><kbd key={key}>{key}</kbd>)}{label}</span>)}</div>;
}

/** ↑/↓ move between the options of a menu page. */
export function moveBetweenControls(event:KeyboardEvent<HTMLElement>){
 if(event.key!=='ArrowDown'&&event.key!=='ArrowUp')return;
 const target=event.target as HTMLElement;if(!target.matches('[data-menu-control]'))return;
 const all=[...event.currentTarget.querySelectorAll<HTMLElement>('[data-menu-control]')].filter(el=>el.tabIndex>=0&&el.offsetParent!==null);
 const next=all[all.indexOf(target)+(event.key==='ArrowDown'?1:-1)];
 if(next){event.preventDefault();next.focus();next.scrollIntoView({block:'nearest'})}
}
