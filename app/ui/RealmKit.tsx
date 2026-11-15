'use client';
import type {ButtonHTMLAttributes,CSSProperties,ReactNode} from 'react';
import {portraitCrop} from '../../game/presets';
import type {FaceCentre} from '../../game/presets';
import './realm-kit.css';

/* Shared controls for the redesigned screens. Screens wrap their root in `className="realm"`. */

type ButtonProps=ButtonHTMLAttributes<HTMLButtonElement>&{variant?:'primary'|'secondary';small?:boolean;minWidth?:number;children:ReactNode};
/** Clipped-corner action. Primary is the steel-blue main action of a group; secondary is a dark face in a slate edge. */
export function RealmButton({variant='secondary',small=false,minWidth,className='',children,type='button',style,...rest}:ButtonProps){
 const label=<span className="realm-btn-label">{children}</span>;
 return <button type={type} className={`realm-btn realm-${variant}${small?' realm-small':''} ${className}`} style={{...style,...(minWidth?{'--realm-btn-min':minWidth+'px'}:{})} as CSSProperties} {...rest}>
  <span className="realm-btn-face">{variant==='secondary'?<span className="realm-btn-inner">{label}</span>:label}</span>
 </button>;
}

export function Check({size=10}:{size?:number}){
 return <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 4.5"/></svg>;
}
/** The small filled diamond that marks the chosen option. */
export const Diamond=()=><span className="realm-diamond" aria-hidden="true"/>;
export const CheckBadge=()=><span className="realm-check" aria-hidden="true"><Check/></span>;

export const QUEST_STEPS=['Game Master','Tale','Hero','Set Out'] as const;
/** Game Master → Tale → Hero → Set Out, always at the top right of quest setup. */
export function QuestSteps({current,className=''}:{current:number;className?:string}){
 return <ol className={`realm-steps ${className}`} aria-label="Quest steps">
  {QUEST_STEPS.map((step,i)=><li key={step} className={i<current?'done':i===current?'current':''} aria-current={i===current?'step':undefined}>
   {i<current?<span className="realm-step-done" aria-hidden="true"><Check size={9}/></span>:<span className="realm-step-mark" aria-hidden="true"/>}
   {step}{i<current?<span className="sr-only"> (done)</span>:null}
  </li>)}
 </ol>;
}

/** A head-to-chest crop of full-body art, centred on the face so every portrait lines up. */
export function Portrait({art,face,ratio,width,height,scale,eye,alt='',className=''}:{art:string;face:FaceCentre;ratio:number;width:number;height:number;scale?:number;eye?:number;alt?:string;className?:string}){
 const crop=portraitCrop(face,{w:width,h:height},ratio,scale,eye);
 return <span className={`realm-portrait ${className}`} style={{width,height}} role={alt?'img':undefined} aria-label={alt||undefined} aria-hidden={alt?undefined:true}>
  <img src={art} alt="" draggable={false} style={{left:crop.left,top:crop.top,width:crop.width,height:crop.height}}/>
 </span>;
}
