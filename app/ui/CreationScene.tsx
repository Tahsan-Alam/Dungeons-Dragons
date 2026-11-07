'use client';

import {useEffect,useId,useRef,useState} from 'react';
import type {CSSProperties,RefObject} from 'react';
import type {NarratorProfile,StoryBlueprint} from '../../game/creation';
import {AETHER} from '../../game/creation';
import NarratorAvatar from './NarratorAvatar';
import {useTheme} from './Theme';
import {creationLandscape,portraitHueShift} from './creation-scene-model';
import type {CreationLandscape} from './creation-scene-model';
import './creation-scene.css';

export type CreationSceneProps={
 profile?:NarratorProfile|null;
 story?:StoryBlueprint|null;
 neutral:boolean;
 palette:{primary:string;secondary:string};
 speaking?:boolean;
 pending?:boolean;
 onClick?:()=>void;
};
type SceneFrame={neutral:boolean;primary:string;secondary:string;pending:boolean;speaking:boolean;};
const TAU=Math.PI*2;
const RAINBOW=['#ff8e99','#ffc07e','#f7e9a0','#93e2b1','#8be7ef','#93baff','#c1a1f7','#f5b1e1'];
const STARS=Array.from({length:165},(_,i)=>({x:((i*73.37+7)%100)/100,y:((i*31.19+5)%100)/100,size:i%9===0?1.6:.35+(i%4)*.23,phase:i*.73}));

/** Canvas motion has no React render loop and stops when hidden or reduced. */
function useCosmos(back:RefObject<HTMLCanvasElement|null>,front:RefObject<HTMLCanvasElement|null>,frame:SceneFrame,pixel:boolean,reduced:boolean){
 const state=useRef(frame),redraw=useRef(()=>{});state.current=frame;
 useEffect(()=>{
  const background=back.current,foreground=front.current;if(!background||!foreground)return;
  const bg=background.getContext('2d'),fg=foreground.getContext('2d');if(!bg||!fg)return;
  let width=0,height=0,raf=0,elapsed=0,previous=0,visible=true,disposed=false;
  const size=()=>{
   const box=background.getBoundingClientRect();width=box.width;height=box.height;
   const ratio=pixel?.65:Math.min(window.devicePixelRatio||1,1.6);
   for(const canvas of [background,foreground]){canvas.width=Math.max(1,Math.round(width*ratio));canvas.height=Math.max(1,Math.round(height*ratio));}
   for(const context of [bg,fg]){context.setTransform(ratio,0,0,ratio,0,0);context.imageSmoothingEnabled=!pixel;}
   draw(elapsed);
  };
  function dot(context:CanvasRenderingContext2D,x:number,y:number,r:number,color:string,alpha=1){
   context.globalAlpha=alpha;context.fillStyle=color;
   if(pixel)context.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(r*2)),Math.max(1,Math.round(r*2)));
   else {context.beginPath();context.arc(x,y,r,0,TAU);context.fill();}
  }
  function draw(t:number){
   if(!width||!height)return;
   const {neutral,primary,secondary,pending,speaking}=state.current;
   const cx=width*.5,cy=height*.47,unit=Math.min(width,height),speed=pending?1.8:1;
   bg!.clearRect(0,0,width,height);fg!.clearRect(0,0,width,height);
   for(const star of STARS){
    const drift=star.size>1?t*.0014:t*.00035;
    const x=(star.x*width+drift*width)%width,y=star.y*height;
    dot(bg!,x,y,star.size,star.size>1&&neutral?RAINBOW[Math.floor(star.phase)%8]:'#fff',.14+(.5+.5*Math.sin(star.phase+t*.7))*.49);
   }
   // Tilted elliptical orbits cross behind and in front of the emerging being.
   for(let ring=0;ring<4;ring++){
    const radius=unit*(.32+ring*.078),tilt=-.48+ring*.24,flat=.31+ring*.055;
    const point=(angle:number)=>{const x=Math.cos(angle)*radius,y=Math.sin(angle)*radius*flat;return {x:cx+x*Math.cos(tilt)-y*Math.sin(tilt),y:cy+x*Math.sin(tilt)+y*Math.cos(tilt),front:Math.sin(angle)>0};};
    bg!.globalAlpha=.11;bg!.strokeStyle=neutral?'#e2e4ef':primary;bg!.lineWidth=pixel?1.3:.65;bg!.beginPath();
    for(let segment=0;segment<=100;segment++){const p=point(segment/100*TAU);if(segment===0)bg!.moveTo(p.x,p.y);else bg!.lineTo(p.x,p.y);}bg!.stroke();
    for(let i=0;i<11;i++){
     const phase=t*(.16+ring*.042)*speed+i*TAU/11+ring*.8,p=point(phase),context=p.front?fg!:bg!;
     const color=neutral?RAINBOW[(i+ring*2)%8]:i%3?primary:secondary;
     const radius=(i%4===0?2.4:1.1)*(p.front?1.2:.7);
     // Short trails make motion legible without filling the scene with lines.
     context.globalAlpha=p.front?.28:.13;context.strokeStyle=color;context.lineWidth=pixel?1.5:1;context.beginPath();
     for(let n=0;n<9;n++){const trail=point(phase-n*.013);if(n===0)context.moveTo(trail.x,trail.y);else context.lineTo(trail.x,trail.y);}context.stroke();
     if(!pixel){context.shadowColor=color;context.shadowBlur=p.front?8:3;}
     dot(context,p.x,p.y,radius,color,p.front?.9:.45);context.shadowBlur=0;
    }
   }
   // Glowing motes fall inward while a draft is being shaped, outward otherwise.
   for(let i=0;i<30;i++){
    const phase=(i*.137+t*(pending?.16:.035))%1,radial=pending?(1-phase):phase;
    const angle=i*2.399+t*.16,r=unit*(.12+radial*.38);
    const x=cx+Math.cos(angle)*r,y=cy+Math.sin(angle)*r*.9;
    dot(fg!,x,y,pixel?1:(i%3===0?1.5:.7),neutral?RAINBOW[i%8]:i%3?primary:secondary,Math.sin(phase*Math.PI)*.7);
   }
   if(speaking){
    const pulse=(t*.7)%1;fg!.globalAlpha=(1-pulse)*.3;fg!.strokeStyle=neutral?'#ffffff':secondary;fg!.lineWidth=1.2;fg!.beginPath();fg!.arc(cx,cy,unit*(.17+pulse*.18),0,TAU);fg!.stroke();
   }
   bg!.globalAlpha=1;fg!.globalAlpha=1;
  }
  redraw.current=()=>draw(elapsed);
  function tick(now:number){
   if(disposed||document.hidden||!visible||reduced){raf=0;return;}
   elapsed+=previous?Math.min((now-previous)/1000,.06):0;previous=now;draw(elapsed);raf=requestAnimationFrame(tick);
  }
  const resume=()=>{
   cancelAnimationFrame(raf);raf=0;previous=0;
   if(!document.hidden&&visible){draw(elapsed);if(!reduced)raf=requestAnimationFrame(tick);}
  };
  const observer=new ResizeObserver(size);observer.observe(background);
  const intersection=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;resume();});intersection.observe(background);
  document.addEventListener('visibilitychange',resume);size();resume();
  return()=>{disposed=true;redraw.current=()=>{};cancelAnimationFrame(raf);observer.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',resume);};
 },[back,front,pixel,reduced]);
 // A reduced-motion scene still updates its colors when the player edits traits.
 useEffect(()=>{if(reduced)redraw.current();},[reduced,frame.primary,frame.secondary,frame.neutral,frame.speaking]);
}

export default function CreationScene({profile,story,neutral,palette,speaking=false,pending=false,onClick}:CreationSceneProps){
 const {theme,reducedMotion}=useTheme(),back=useRef<HTMLCanvasElement>(null),front=useRef<HTMLCanvasElement>(null),narrator=profile??AETHER;
 const landscape=creationLandscape(story),form=narrator.avatar?.form??'spirit';
 const [hidden,setHidden]=useState(false);
 useEffect(()=>{const update=()=>setHidden(document.hidden);update();document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[]);
 useCosmos(back,front,{neutral,primary:palette.primary,secondary:palette.secondary,pending,speaking},theme==='pixel',reducedMotion);
 const style={'--scene-primary':neutral?'#dce0e8':palette.primary,'--scene-secondary':neutral?'#f2f3f6':palette.secondary,'--scene-hue':`${portraitHueShift(palette.primary)}deg`} as CSSProperties;
 const key=`${form}:${narrator.avatar?.accessory??'none'}`;
 return <div className="creation-scene" data-art={theme} data-neutral={neutral} data-landscape={landscape} data-pending={pending} data-speaking={speaking} data-reduced={reducedMotion} data-paused={hidden} style={style}>
  <div className="creation-cosmos" aria-hidden="true"/>
  <canvas ref={back} className="creation-stars" aria-hidden="true"/>
  <div className="creation-distant-planets" aria-hidden="true"><i/><i/><i/></div>
  {landscape!=='space'?<WorldLayer key={landscape} landscape={landscape} pixel={theme==='pixel'}/>:null}
  <div key={key} className="creation-being" data-form={form}>
   {form==='spirit'?<EtherCore pixel={theme==='pixel'} name={narrator.name} onClick={onClick}/>:<NarratorAvatar profile={narrator} speaking={speaking} pending={pending} onClick={onClick}/>}
  </div>
  <canvas ref={front} className="creation-motes" aria-hidden="true"/>
  <div className="creation-scene-edge" aria-hidden="true"/>
 </div>;
}

function EtherCore({pixel,name,onClick}:{pixel:boolean;name:string;onClick?:()=>void}){
 const content=<><span className="creation-core-light"/><img className="creation-ether-core" src={`/art/narrators/ether-${pixel?'pixel':'paint'}.png`} alt="" width={1280} height={1280} draggable={false}/><span className="creation-core-ribbon creation-core-ribbon-one"/><span className="creation-core-ribbon creation-core-ribbon-two"/></>;
 return onClick?<button className="creation-ether" type="button" onClick={onClick} aria-label={`Talk with ${name}`}>{content}</button>:<span className="creation-ether" role="img" aria-label={`${name}, a silver ether with rainbow particles`}>{content}</span>;
}

function WorldLayer({landscape,pixel}:{landscape:Exclude<CreationLandscape,'space'>;pixel:boolean}){
 const id=useId().replace(/:/g,''),sky=landscape==='sky',coast=landscape==='coast',ruins=landscape==='ruins';
 return <div className="creation-world" data-world={landscape} role="img" aria-label={`${sky?'Floating islands above clouds':coast?'An ocean and distant lighthouse':ruins?'Ancient towers and a ruined gateway':'A forest and distant mountains'} taking shape behind your narrator`}>
  <svg viewBox="0 0 800 700" preserveAspectRatio="xMidYMax slice" shapeRendering={pixel?'crispEdges':undefined} aria-hidden="true">
   <defs><linearGradient id={`${id}-mountains`} x2="0" y2="1"><stop stopColor="var(--scene-primary)" stopOpacity=".32"/><stop offset="1" stopColor="#0b1018"/></linearGradient><linearGradient id={`${id}-mist`} x2="0" y2="1"><stop stopColor="var(--scene-secondary)" stopOpacity=".25"/><stop offset="1" stopColor="var(--scene-secondary)" stopOpacity="0"/></linearGradient></defs>
   <g className="creation-world-far"><circle cx="634" cy="237" r="38" fill="var(--scene-secondary)" opacity=".3"/><circle cx="623" cy="225" r="33" fill="#13151e"/>
   {!sky?<path d={pixel?'M0 452h32v-32h32v-32h32v-32h32v-32h32v32h32v32h32v32h32v32h32v-32h32v-32h32v-32h32v-32h32v-32h32v32h32v32h32v32h32v32h32v32h32v-32h32v-32h32v-32h32v-32h32v32h32v32h32v32h32v32h64V700H0Z':'M0 474 141 312 252 450 395 279 550 446 683 303 800 456V700H0Z'} fill={`url(#${id}-mountains)`}/>:null}</g>
   {sky?<g className="creation-world-mid"><FloatingIsland x={95} y={355} scale={.75} pixel={pixel}/><FloatingIsland x={620} y={440} scale={1} pixel={pixel}/><FloatingIsland x={350} y={560} scale={.6} pixel={pixel}/><g className="creation-clouds" fill="var(--scene-secondary)" opacity=".2"><path d={pixel?'M0 490h64v-16h96v16h80v16H0Zm460-150h64v-16h80v16h196v16H460Z':'M0 496q38-31 68-13 35-46 76-10 44-12 66 26Zm460-140q38-31 68-13 35-46 76-10 44-12 66 26Z'}/><path d="M43 580q98-48 210 0t294 0 250 0v35H0Z" opacity=".4"/></g></g>:coast?<g className="creation-world-mid"><path d="M0 470Q200 456 400 470T800 470V700H0Z" fill="var(--scene-primary)" opacity=".22"/><g className="creation-sea-lines" fill="none" stroke="var(--scene-secondary)" strokeWidth={pixel?3:1.4} opacity=".42"><path d="M30 505h140m50 20h170m170-26h200M70 571h170m190-19h130m70 42h140M280 635h140m100 25h190"/></g><path d="M0 586 170 560 260 610 400 635 565 575 700 548 800 560V700H0Z" fill="#10151c"/><g transform="translate(682 412)" className="creation-landmark"><path d="m-12 135 6-111h24l8 111Z" fill="var(--scene-primary)" opacity=".8"/><path d="M-11 7h34v20h-34Zm-6 0L6-9 28 7Z" fill="var(--scene-secondary)" opacity=".7"/><path d="m8 16-175-36v58Z" fill="var(--scene-secondary)" opacity=".12"/></g></g>:<g className="creation-world-mid"><path d={pixel?'M0 555h80v-16h80v-16h80v16h80v32h80v-16h80v-16h80v16h80v-32h80v16h80v16h80V700H0Z':'M0 551q150-76 300 15t290-10q110-70 210-5V700H0Z'} fill="var(--scene-primary)" opacity=".18"/>{ruins?<g className="creation-landmark" fill="var(--scene-secondary)" opacity=".5"><path d="M93 578V429H80v-23h35v17h32v-17h22v23h-15v149h-18V453h-25v125Zm526-6V409h-10v-24h30v18h23v-18h25v24h-11v163h-18V433h-21v139Z"/><path d="M204 618V506h-8v-20h27v15h24v-15h24v20h-10v112h-19v-89h-19v89Z" opacity=".65"/></g>:<g className="creation-trees" fill="var(--scene-primary)">{[[-10,630,1.7],[62,568,1.35],[140,638,1.1],[210,591,.8],[585,597,.9],[665,635,1.5],[748,574,1.2],[803,653,1.7]].map(([x,y,s],i)=><g key={i} style={{'--tree-delay':`${i*.08}s`} as CSSProperties} transform={`translate(${x} ${y}) scale(${s})`}><path d={pixel?'M-24 0v-12h-12v-12h12v-12h-8v-12h16v-12h-8v-12h16v-12h8v12h16v12h-8v12h16v12h-8v12h12v12H24V0H5v16H-4V0Z':'M0-96 18-64 11-64 28-35 19-35 39 0H7v17H-5V0h-33l20-35h-9l17-29h-8Z'} opacity={.35+i%3*.15}/></g>)}</g>}</g>}
   <path className="creation-ground-mist" d="M0 640q160-50 350-10t450-5v75H0Z" fill={`url(#${id}-mist)`}/>
  </svg>
 </div>;
}

function FloatingIsland({x,y,scale,pixel}:{x:number;y:number;scale:number;pixel:boolean}){
 return <g className="creation-island" transform={`translate(${x} ${y}) scale(${scale})`}><g><path d={pixel?'M-92 0h184v16H64v24H40v24H16v24H-8V64h-24V40h-32V16h-28Z':'M-95 0Q0-27 95 0L54 30 14 85-18 50-64 32Z'} fill="var(--scene-primary)" opacity=".65"/><path d="M-90 0q90-24 180 0-90 21-180 0" fill="var(--scene-secondary)" opacity=".6"/><g fill="var(--scene-secondary)" opacity=".65"><path d="M-45-5v-45h22v45ZM-12-6v-83h25v83ZM28-4v-60h23v60Z"/><path d="m-50-50 16-16 16 16Zm33-39 17-28 18 28Zm40 25 17-20 16 20Z"/></g><path d="M-34 10q10 32 0 61t0 59" stroke="var(--scene-secondary)" opacity=".3" strokeWidth="3" fill="none"/></g></g>;
}
