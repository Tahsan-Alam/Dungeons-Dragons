'use client';

import {useEffect,useState} from 'react';
import type {CSSProperties} from 'react';
import {AETHER} from '../../game/creation';
import type {NarratorAvatar as AvatarRecipe,NarratorProfile} from '../../game/creation';
import {useTheme} from './Theme';
import LegacyNarratorAvatar from './LegacyNarratorAvatar';
import './narrator-avatar.css';

type Form=AvatarRecipe['form'];
type Appearance={form:Form;accessory:AvatarRecipe['accessory'];color:string;key:string};
export type NarratorAvatarProps={profile?:NarratorProfile|null;speaking?:boolean;talking?:boolean;pending?:boolean;compact?:boolean;size?:number;onClick?:()=>void};
const CELLS:Record<Form,[number,number]>={spirit:[0,0],human:[1,0],cat:[2,0],owl:[0,1],fox:[1,1],dragon:[2,1]};
const EYES:Record<Exclude<Form,'spirit'>,{points:[number,number,number][];color:string}>={
 human:{points:[[246,147,17],[316,157,17]],color:'#c9947d'},
 cat:{points:[[248,203,23],[338,185,21]],color:'#4c365e'},
 owl:{points:[[271,165,25],[348,167,24]],color:'#c8c1cb'},
 fox:{points:[[289,160,22]],color:'#a16b4e'},
 dragon:{points:[[160,161,23]],color:'#9580ae'},
};
const ORBITS=Array.from({length:18},(_,i)=>({x:13+(i*37)%76,y:8+(i*29)%79,delay:-i*.79,duration:3.8+(i%5)*.6,size:i%4===0?3:2}));

function look(profile:NarratorProfile):Appearance{
 const form=profile.avatar?.form??'spirit',accessory=profile.avatar?.accessory??'none';
 return {form,accessory,color:profile.color,key:`${form}:${accessory}:${profile.color}`};
}

/** The generated Paint and Pixel atlases share cells and identity. Motion is local. */
export default function NarratorAvatar(props:NarratorAvatarProps){
 // Old saves retain Pip or their original class portrait. Existing gameplay call
 // sites use `talking`; new creation surfaces use `speaking` for the large stage.
 if(!props.profile?.avatar&&(props.talking!==undefined||props.size!==undefined))return <LegacyNarratorAvatar profile={props.profile??undefined} talking={props.speaking||props.talking} size={props.size}/>;
 return <LivingNarratorAvatar {...props} size={props.size??(props.talking!==undefined?64:undefined)}/>;
}

function LivingNarratorAvatar({profile,speaking=false,talking=false,pending=false,compact=false,size,onClick}:NarratorAvatarProps){
 const {theme,reducedMotion}=useTheme(),narrator=profile??AETHER,next=look(narrator);
 const [layers,setLayers]=useState<{current:Appearance;previous:Appearance|null}>(()=>({current:next,previous:null}));
 useEffect(()=>{
  setLayers(old=>old.current.key===next.key?old:{current:next,previous:reducedMotion?null:old.current});
  const timer=window.setTimeout(()=>setLayers(old=>old.previous?{...old,previous:null}:old),700);
  return()=>window.clearTimeout(timer);
  // Only appearance changes should restart the emergence, not conversational text.
 },[next.key,reducedMotion]);
 const visual=<>
  <span className="narrator-aura" aria-hidden="true"/>
  <span className="narrator-orbit narrator-orbit-back" aria-hidden="true"><i/><i/><i/></span>
  <span className="narrator-sprite-frame" aria-hidden="true">
   {layers.previous?<Portrait key={`old-${layers.previous.key}`} appearance={layers.previous} theme={theme} leaving/>:null}
   <Portrait key={layers.current.key} appearance={layers.current} theme={theme}/>
  </span>
  <span className="narrator-orbit narrator-orbit-front" aria-hidden="true"><i/><i/><i/></span>
  <span className="narrator-particles" aria-hidden="true">{ORBITS.map((p,i)=><i key={i} style={{'--particle-x':`${p.x}%`,'--particle-y':`${p.y}%`,'--particle-delay':`${p.delay}s`,'--particle-duration':`${p.duration}s`,'--particle-size':`${p.size}px`} as CSSProperties}/>)}</span>
  <span className="narrator-resonance" aria-hidden="true"/>
 </>;
 const shared={className:`narrator-avatar${compact?' narrator-avatar-compact':''}`,style:{'--narrator-pigment':narrator.color,...(size?{'--narrator-size':`${size}px`}:{})} as CSSProperties,'data-form':layers.current.form,'data-speaking':speaking||talking,'data-pending':pending,'data-art':theme,'data-reduced':reducedMotion};
 return onClick?<button type="button" {...shared} onClick={onClick} aria-label={`Talk with ${narrator.name}`} title={`Talk with ${narrator.name}`}>{visual}</button>:<span {...shared} role="img" aria-label={`${narrator.name}, ${layers.current.form==='spirit'?'a luminous spirit':`a ${layers.current.form} storyteller`}, in ${theme==='paint'?'painted':'pixel'} art`}>{visual}</span>;
}

function Portrait({appearance,theme,leaving=false}:{appearance:Appearance;theme:'paint'|'pixel';leaving?:boolean}){
 const [column,row]=CELLS[appearance.form],eyes=appearance.form==='spirit'?null:EYES[appearance.form];
 return <span className={`narrator-sprite${leaving?' narrator-sprite-leaving':''}`} data-form={appearance.form}>
  {appearance.form==='spirit'?<img className="narrator-ether-art" src={`/art/narrators/ether-${theme}.png`} width={1280} height={1280} alt="" draggable={false}/>:<img className="narrator-atlas" src={`/art/narrators/${theme}-atlas.webp`} width={1536} height={1024} alt="" draggable={false} style={{left:`${-column*100}%`,top:`${-row*100}%`}}/>}
  {appearance.form==='spirit'?<span className="narrator-heartlight"/>:null}
  {eyes?<svg className="narrator-eyelids" viewBox="0 0 512 512" fill="none" aria-hidden="true">{eyes.points.map(([x,y,r],i)=><g key={i}><ellipse cx={x} cy={y} rx={r+2} ry={10} fill={eyes.color}/><path d={`M${x-r} ${y} Q${x} ${y+7} ${x+r} ${y-1}`} stroke="#312437" strokeWidth="3" strokeLinecap="round"/></g>)}</svg>:null}
  <Accessory form={appearance.form} accessory={appearance.accessory} pixel={theme==='pixel'}/>
 </span>;
}

function Accessory({form,accessory,pixel}:{form:Form;accessory:AvatarRecipe['accessory'];pixel:boolean}){
 if(accessory==='none'||(form==='spirit'&&accessory==='hood'))return null;
 const eyes=form==='spirit'?[[271,204,27],[333,204,27]]:EYES[form].points;
 return <svg className={`narrator-accessory narrator-accessory-${accessory}`} viewBox="0 0 512 512" fill="none" aria-hidden="true" shapeRendering={pixel?'crispEdges':undefined}>
  {accessory==='glasses'?<g stroke="#e8cd97" strokeWidth="5" strokeLinecap={pixel?'square':'round'} strokeLinejoin={pixel?'miter':'round'}>
   {eyes.map(([x,y,r],i)=>pixel?<path key={i} d={`M${x-r-5} ${y-13} h${r*2+10} v28 h-${r*2+10} Z`} fill="#cec6ff12"/>:<ellipse key={i} cx={x} cy={y} rx={r+7} ry={20} fill="#cec6ff12"/>)}
   {eyes.length===2?<path d={`M${eyes[0][0]+eyes[0][2]+7} ${eyes[0][1]-1} Q${(eyes[0][0]+eyes[1][0])/2} ${Math.min(eyes[0][1],eyes[1][1])-12} ${eyes[1][0]-eyes[1][2]-7} ${eyes[1][1]-1}`}/>:<path d={`M${eyes[0][0]+eyes[0][2]+6} ${eyes[0][1]-6} l39 -17`}/>}
   <path d={`M${eyes[0][0]-eyes[0][2]-8} ${eyes[0][1]-8} l-18 -8`}/>
  </g>:accessory==='crown'?<g transform={`translate(${form==='dragon'?155:form==='fox'?304:form==='spirit'?298:286} ${form==='spirit'?65:form==='cat'?109:form==='owl'?105:72}) rotate(${form==='cat'?-7:form==='fox'?-4:0})`}>
   <path d="m-49 16-12-45 29 17 29-34 27 35 33-15-12 45Z" fill="#d7b767" stroke="#6d5181" strokeWidth="5" strokeLinejoin="round"/>
   <path d="M-48 17h93v14h-93Z" fill="#edd09a" stroke="#6d5181" strokeWidth="4"/><path d="m-3-16 7 9-7 9-7-9Z" fill="#8870c2"/>
  </g>:<path d={form==='dragon'?'M99 212C65 87 148 34 229 82c76 45 96 176 64 240l-38-38c27-94-19-177-72-181-52-3-60 55-60 104Z':form==='fox'?'M206 236c-72-104-24-191 67-198 104-9 182 86 159 220l-48 23c21-114-18-195-95-199-67-3-85 59-59 134Z':'M141 272C85 138 157 31 277 29c125-1 200 119 167 253l-49-17c26-103-26-184-118-188-90-4-134 82-99 174Z'} fill="#635087" fillOpacity=".8" stroke="#a58ac7" strokeWidth={pixel?7:4} strokeLinejoin="round"/>}
 </svg>;
}
