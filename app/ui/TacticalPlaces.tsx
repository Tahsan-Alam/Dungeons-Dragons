'use client';
import type {ReactNode} from 'react';
import type {SetPieceProp} from '../../game/types';
import {ART_PALETTE as P} from './artPalette';
import {Tally} from './PlaceArt';

/* Chapter landmarks seen from above on the tactical map, painted like the rest of it: light from the top left, a
   raised thing shows its sunlit top over a darker body, wood shows its planks, glass and flame glow. Footprints are
   the same as the flat drawings they replace (tile-local units, a tile is 50), so nothing moves on the board. */

const LAMP='#ffe7a0',LAMP_GLOW='#e8a840',TEAL='#a6e6dc',BRASS='#b8a46a',GOLD='#e8c25a',CLOTH='#b66e80',PAPER='#e6dfcc',SEA='#d5ecea',SALT='#f4f1ea',BERRY='#6f4a86',DARK_GLASS='#39424a';
const SPINES=[CLOTH,TEAL,PAPER,'#8a85b6',BRASS,'#7c9a7e'];
const edge={stroke:P.ink,strokeOpacity:.42,strokeWidth:1.2,strokeLinejoin:'round' as const};

/** A raised block: its body, then its sunlit top a little up and to the left. */
function Block({x,y,w,h,r=3,top=P.stone,side=P.stoneDark,lift=2,children}:{x:number;y:number;w:number;h:number;r?:number;top?:string;side?:string;lift?:number;children?:ReactNode}){
 return <g><rect x={x} y={y} width={w} height={h} rx={r} fill={side} {...edge}/><rect x={x+2-lift*.6} y={y+2-lift} width={w-4} height={h-4} rx={Math.max(0,r-1)} fill={top}/>{children}</g>;
}
/** Courses of dressed stone across a top face. */
const courses=(x:number,y:number,w:number,h:number,rows=2,tone:string=P.stoneDark)=><g stroke={tone} strokeOpacity=".45" strokeWidth={1}>
 {Array.from({length:rows-1},(_,i)=><path key={'r'+i} d={`M${x} ${y+h/rows*(i+1)}h${w}`}/>)}
 {Array.from({length:rows},(_,i)=><path key={'c'+i} d={`M${x+w*(.3+(i*.41)%.45)} ${y+h/rows*i}v${h/rows}`}/>)}
</g>;
const glow=(cx:number,cy:number,r:number,color=LAMP_GLOW,o=.28)=><><circle cx={cx} cy={cy} r={r} fill={color} opacity={o*.6}/><circle cx={cx} cy={cy} r={r*.55} fill={color} opacity={o}/></>;
const flame=(cx:number,cy:number,r=4)=><><circle cx={cx} cy={cy} r={r} fill={LAMP}/><circle cx={cx-r*.3} cy={cy-r*.3} r={r*.4} fill="#fff"/></>;
const planks=(x:number,y:number,w:number,h:number,n:number,vertical=false)=><g stroke={P.ink} strokeOpacity=".22" strokeWidth={1}>{Array.from({length:n-1},(_,i)=>vertical?<path key={i} d={`M${x+w/n*(i+1)} ${y}v${h}`}/>:<path key={i} d={`M${x} ${y+h/n*(i+1)}h${w}`}/>)}</g>;
/** A flight of steps seen from above: treads get darker as they go down toward `down`. */
function Steps({x,y,w,h,n,down}:{x:number;y:number;w:number;h:number;n:number;down:'left'|'right'|'up'}){
 const tones=[P.stoneLight,P.stone,P.stoneDark,P.stoneDeep];
 return <g>{Array.from({length:n},(_,i)=>{const t=tones[Math.min(tones.length-1,i)];
  if(down==='up'){const s=h/n;return <g key={i}><rect x={x} y={y+h-s*(i+1)} width={w} height={s} fill={t}/><path d={`M${x} ${y+h-s*(i+1)}h${w}`} stroke={P.ink} strokeOpacity=".3"/></g>}
  const s=w/n,at=down==='right'?x+s*i:x+w-s*(i+1);return <g key={i}><rect x={at} y={y} width={s} height={h} fill={t}/><path d={`M${down==='right'?at+s:at} ${y}v${h}`} stroke={P.ink} strokeOpacity=".3"/></g>;
 })}<rect x={x} y={y} width={w} height={h} fill="none" {...edge}/></g>;
}

export function TacticalPlace({prop}:{prop:SetPieceProp}):ReactNode{
 switch(prop){
  // Lanternwood and the market
  case 'gate-rubble':case 'rubble':return <g>{[[8,18,22,15],[27,10,17,13],[22,28,14,11]].map(([x,y,w,h],i)=><Block key={i} x={x} y={y} w={w} h={h} r={4} top={i===1?P.stoneLight:P.stone}/>)}</g>;
  case 'fence':return <g><path d="M0 21h50M0 30h50" stroke={P.bark} strokeWidth={4} strokeLinecap="round"/><path d="M0 20h50M0 29h50" stroke={P.barkLight} strokeWidth={2}/>{[7,43].map(x=><g key={x}><circle cx={x} cy={25} r={5} fill={P.bark} {...edge}/><circle cx={x-1} cy={24} r={2.6} fill={P.barkLight}/></g>)}</g>;
  case 'cage-empty':case 'cage-lit':{const lit=prop==='cage-lit';return <g>{lit?glow(25,25,22,TEAL,.3):null}<circle cx={25} cy={25} r={12} fill={lit?TEAL:P.stoneDeep} opacity={lit?.85:.35}/><circle cx={25} cy={25} r={12} fill="none" stroke={BRASS} strokeWidth={2.5}/>{[0,1,2,3].map(i=><path key={i} d={`M${25+12*Math.cos(i*Math.PI/2+.4)} ${25+12*Math.sin(i*Math.PI/2+.4)}L25 25`} stroke={BRASS} strokeWidth={1.5} opacity=".8"/>)}{lit?<circle cx={22} cy={22} r={3} fill="#fff" opacity=".8"/>:<path d="M37 17l7-3M37 33l7 3" stroke={BRASS} strokeWidth={2} strokeLinecap="round"/>}</g>;}
  case 'masonry':case 'quay':return <Block x={1} y={9} w={48} h={32} r={2}>{courses(1,7,46,30,2)}{prop==='quay'?<path d="M2 39q6-3 12 0t12 0t12 0t10 0" fill="none" stroke={SALT} strokeWidth={1.8} opacity=".8"/>:null}</Block>;
  case 'carving':return <Block x={2} y={9} w={96} h={32} r={3}><path d="M16 30q14-12 26-14l8-6M70 32v-12m-6 0h12" fill="none" stroke={P.stoneDeep} strokeWidth={3} strokeLinecap="round" transform="translate(-1 -2)"/>{glow(48,24,14,LAMP_GLOW,.22)}</Block>;
  case 'arch':return <g><Block x={5} y={11} w={28} h={28} r={4}/><Block x={117} y={11} w={28} h={28} r={4}/><path d="M33 22q42-14 84 0" fill="none" stroke={P.stoneDark} strokeWidth={10} strokeLinecap="round"/><path d="M33 20q42-14 84 0" fill="none" stroke={P.stone} strokeWidth={6} strokeLinecap="round" strokeDasharray="22 10 40 8"/></g>;
  case 'stairs':return <Steps x={4} y={4} w={42} h={42} n={4} down="up"/>;
  case 'shrine':return <g>{glow(75,30,30,LAMP_GLOW,.3)}<Block x={3} y={5} w={144} h={40} r={4}>{courses(3,3,140,36,2)}</Block><path d="M64 45V31a11 11 0 0 1 22 0v14" fill={P.stoneDeep} {...edge}/>{flame(75,34,5)}</g>;
  case 'wolf-eyes':return <g><ellipse cx={25} cy={24} rx={22} ry={14} fill={P.leafDark} opacity=".85"/><ellipse cx={18} cy={20} rx={9} ry={7} fill={P.leafDark}/><ellipse cx={34} cy={19} rx={9} ry={7} fill={P.leafDark}/><circle cx={22} cy={28} r={2.2} fill={LAMP}/><circle cx={29} cy={28} r={2.2} fill={LAMP}/></g>;
  case 'bramble':return <g><path d="M7 31q-4-13 7-19q4-8 15-4q12-2 12 10q6 9-2 15q-2 8-13 6q-12 4-19-8Z" fill={P.leafDark} {...edge}/><path d="M13 27q-1-9 8-12q9-2 12 6q4 6-2 10q-6 5-12 2q-5-1-6-6Z" fill={P.leaf}/><path d="M12 16l-4-3M38 20l5-2M30 38l2 5M10 34l-5 2" stroke={P.leafDark} strokeWidth={1.6} strokeLinecap="round"/>{[[18,21],[29,19],[25,30],[34,27]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={2.3} fill={BERRY}/>)}</g>;
  case 'moonwell':return <g>{glow(50,25,30,TEAL,.26)}<circle cx={50} cy={25} r={22} fill={P.stoneDark} {...edge}/><circle cx={49} cy={23.5} r={19} fill={P.stoneLight}/><circle cx={50} cy={25} r={13.5} fill={TEAL} stroke={P.ink} strokeOpacity=".35"/><ellipse cx={46} cy={21} rx={6} ry={3} fill="#fff" opacity=".55"/><path d="M73 9H54" stroke={P.bark} strokeWidth={3} strokeLinecap="round"/><circle cx={74} cy={9} r={4} fill={P.bark} {...edge}/></g>;
  // The Hollow Reach
  case 'parapet':return <Block x={1} y={15} w={48} h={20} r={2}>{[6,22,38].map(x=><rect key={x} x={x} y={14} width={9} height={7} fill={P.stoneLight} stroke={P.stoneDark} strokeOpacity=".5"/>)}</Block>;
  case 'banner':return <g><circle cx={19} cy={25} r={4} fill={P.stoneDeep} {...edge}/><path d="M20 22l17 3l-17 6Z" fill={CLOTH} {...edge}/><path d="M20 22l17 3" stroke="#fff" strokeOpacity=".35"/></g>;
  case 'retaining':return <Block x={0} y={4} w={50} h={21} r={1} top={P.stone} side={P.stoneDeep}>{courses(0,2,48,19,2)}</Block>;
  case 'slope':return <g>{[[7,20,18,12],[27,12,16,11],[19,30,13,9]].map(([x,y,w,h],i)=><Block key={i} x={x} y={y} w={w} h={h} r={5} top={i===1?P.stoneLight:P.stone}/>)}</g>;
  case 'pillar':return <g><circle cx={26} cy={27} r={14} fill={P.stoneDark} {...edge}/><circle cx={24.5} cy={24.5} r={11.5} fill={P.stone}/><circle cx={24.5} cy={24.5} r={6.5} fill="none" stroke={P.stoneLight} strokeWidth={2} opacity=".8"/></g>;
  case 'treasury':return <g><Block x={2} y={4} w={146} h={40} r={3}>{courses(2,2,142,36,2)}</Block><path d="M62 44V30a13 13 0 0 1 26 0v14" fill={P.ink} opacity=".75"/><circle cx={75} cy={15} r={6.5} fill="none" stroke={GOLD} strokeWidth={2}/></g>;
  case 'crown':return <g>{glow(25,25,22,LAMP_GLOW,.3)}<Block x={13} y={13} w={24} h={24} r={3}/><path d="M17 30v-10l3.5 4l3.5-6l3.5 6l3.5-4v10Z" fill={GOLD} {...edge}/><path d="M19 28h11" stroke="#fff" strokeOpacity=".5"/></g>;
  case 'wall-torch':return <g><Block x={1} y={9} w={48} h={32} r={2}>{courses(1,7,46,30,2)}</Block>{glow(25,41,15,LAMP_GLOW,.35)}<circle cx={25} cy={39} r={5} fill={P.bark} {...edge}/>{flame(25,38,3.5)}</g>;
  case 'wall-banner':return <g><Block x={1} y={9} w={48} h={32} r={2}>{courses(1,7,46,30,2)}</Block><path d="M15 39h20l-2 9l-8-4l-8 4Z" fill={CLOTH} {...edge}/><path d="M15 39h20" stroke={GOLD} strokeWidth={2}/></g>;
  case 'gatepost':return <Block x={7} y={7} w={36} h={36} r={3}><rect x={14} y={12} width={20} height={20} rx={2} fill="none" stroke={P.stoneDark} strokeOpacity=".45"/></Block>;
  // Saltreach Harbour: glassmakers' row and the vaults
  case 'workshop':case 'workshop-wide':case 'workshop-narrow':case 'workshop-counter':{const narrow=prop==='workshop-narrow',w=narrow?54:92;return <g>
   <rect x={4} y={5} width={w} height={40} rx={2} fill={P.stoneDeep} {...edge}/><rect x={4} y={5} width={w} height={19} fill={P.stoneDark}/><path d={`M4 24h${w}`} stroke={P.ink} strokeOpacity=".45" strokeWidth={2}/>
   {Array.from({length:Math.floor(w/12)},(_,i)=><path key={i} d={`M${10+i*12} 5v19M${16+i*12} 24v21`} stroke={P.ink} strokeOpacity=".18"/>)}
   {narrow?<rect x={58} y={9} width={38} height={32} rx={2} fill={P.ink} opacity=".45"/>:null}
   {glow(narrow?31:50,15,9,TEAL,.4)}<circle cx={narrow?31:50} cy={15} r={3.5} fill={TEAL}/>
   {prop==='workshop-counter'?<Block x={13} y={37} w={74} h={10} r={1} top={P.barkLight} side={P.bark} lift={1}/>:prop==='workshop-wide'?<Block x={13} y={35} w={74} h={9} r={1} top={P.barkLight} side={P.bark} lift={1}/>:null}</g>;}
  case 'worktable':case 'worktable-invoice':return <g><Block x={5} y={11} w={40} h={28} r={2} top={P.barkLight} side={P.bark}>{planks(4,9,38,26,3)}</Block>{prop==='worktable-invoice'?<g><rect x={14} y={24} width={22} height={12} fill={PAPER} {...edge}/><Tally x={25} y={29} s={14} color={P.ink}/></g>:<g><path d="M13 19l6-6 4 6Z" fill={TEAL} {...edge}/><circle cx={32} cy={26} r={4} fill={TEAL} opacity=".7"/></g>}</g>;
  case 'sandbin':return <Block x={9} y={9} w={32} h={32} r={2} top={P.bark} side={P.bark}><rect x={12} y={10} width={24} height={24} fill="#e3d3a8"/><path d="M15 18q5-3 10 0t9 0M15 27q5-3 10 0" fill="none" stroke={P.barkLight} strokeWidth={1.2}/></Block>;
  case 'rack':case 'rack-marked':return <g>{[13,25,37].map(y=><g key={y}><path d={`M7 ${y}h36`} stroke={P.bark} strokeWidth={4} strokeLinecap="round"/><path d={`M7 ${y-1}h36`} stroke={BRASS} strokeWidth={1.6}/></g>)}{[10,22,34].map(x=><circle key={x} cx={x+3} cy={19} r={2.4} fill={TEAL} opacity=".8"/>)}{prop==='rack-marked'?<g><rect x={15} y={19} width={20} height={14} rx={1} fill={P.stoneDeep}/><Tally x={25} y={25} s={14} color={SALT}/></g>:null}</g>;
  case 'stairs-down':return <g><Steps x={6} y={0} w={44} h={50} n={4} down="right"/><path d="M6 0v50" stroke={TEAL} strokeWidth={2.5}/></g>;
  case 'stairs-up':return <Steps x={0} y={0} w={50} h={50} n={4} down="left"/>;
  case 'pier':case 'pier-repaired':return <Block x={6} y={6} w={38} h={38} r={3} top={prop==='pier'?P.stone:P.stoneLight}>{courses(6,4,34,34,2)}{prop==='pier-repaired'?<path d="M6 23h34" stroke={P.stoneDeep} strokeWidth={4}/>:null}</Block>;
  case 'pier-stump':return <g><path d="M8 43V14l12-4 10 4 12-3v32Z" fill={P.stoneDark} {...edge}/><path d="M10 38V16l10-3 9 3 11-2v24Z" fill={P.stone}/><path d="M10 38h30" stroke={SALT} strokeWidth={1.6} opacity=".7"/></g>;
  case 'niche':return <g><Block x={1} y={9} w={48} h={32} r={2}>{courses(1,7,46,30,2)}</Block><Block x={13} y={29} w={24} h={15} r={1} top={P.barkLight} side={P.bark} lift={1}/></g>;
  case 'vault-door':return <g><Block x={3} y={5} w={94} h={40} r={2} top={P.stoneLight}/><rect x={16} y={13} width={68} height={31} rx={2} fill={P.stoneDeep} {...edge}/><path d="M16 21h68M16 33h68" stroke={P.ink} strokeOpacity=".5" strokeWidth={3}/>{[22,50,78].map(x=><circle key={x} cx={x} cy={27} r={2.2} fill={BRASS}/>)}<circle cx={50} cy={9} r={3} fill={BRASS}/></g>;
  case 'sea-door':return <g><rect x={8} y={0} width={42} height={50} fill={SEA}/><path d="M14 12q6-3 12 0t12 0M18 30q6-3 12 0t12 0" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth={1.4}/><rect x={1} y={0} width={9} height={50} fill={P.stoneDark} {...edge}/><rect x={2} y={0} width={6} height={50} fill={SALT}/></g>;
  // The long tales' middle places
  case 'shelf':case 'shelf-empty':return <g><Block x={2} y={13} w={46} h={24} r={1} top={P.bark} side={P.bark}/>{prop==='shelf'?[6,12,18,24,30,36,42].map((x,i)=><rect key={x} x={x} y={15} width={5} height={18} fill={SPINES[i%SPINES.length]} stroke={P.ink} strokeOpacity=".25" strokeWidth={.6}/>):<g><rect x={6} y={15} width={38} height={18} fill={P.ink} opacity=".45"/><rect x={15} y={21} width={12} height={7} fill={PAPER} transform="rotate(-8 21 24)"/></g>}</g>;
  case 'lectern':return <g>{glow(39,13,10,LAMP_GLOW,.35)}<Block x={12} y={15} w={26} h={20} r={2} top={P.barkLight} side={P.bark}/><path d="M15 18h9v13h-9ZM25 18h9v13h-9Z" fill={PAPER} {...edge}/><path d="M24.5 18v13" stroke={P.ink} strokeOpacity=".4"/>{flame(39,13,2.6)}</g>;
  case 'orrery':return <g>{glow(50,25,26,LAMP_GLOW,.22)}<circle cx={50} cy={25} r={23} fill="none" stroke={P.ink} strokeOpacity=".3" strokeWidth={4}/><circle cx={50} cy={25} r={23} fill="none" stroke={BRASS} strokeWidth={2.4}/><circle cx={50} cy={25} r={14} fill="none" stroke={BRASS} strokeWidth={2}/><circle cx={50} cy={25} r={7.5} fill={GOLD} {...edge}/><circle cx={48} cy={23} r={2.5} fill="#fff" opacity=".7"/><circle cx={27} cy={25} r={4} fill={TEAL} {...edge}/><circle cx={64} cy={25} r={3.4} fill={CLOTH} {...edge}/><circle cx={50} cy={11} r={3} fill="none" stroke={BRASS} strokeDasharray="2 2"/></g>;
  case 'wreck':return <g><path d="M6 27Q30 7 120 15Q147 26 120 37Q30 45 6 27Z" fill={P.bark} {...edge}/><path d="M14 27Q34 13 118 19Q138 26 118 33Q34 40 14 27Z" fill={P.barkLight}/>{planks(20,15,96,24,4)}<path d="M20 27H130" stroke={P.ink} strokeOpacity=".3" strokeWidth={1.4}/><circle cx={70} cy={26} r={4.5} fill={P.bark} {...edge}/>{glow(12,27,9,LAMP_GLOW,.25)}<circle cx={12} cy={27} r={4} fill={DARK_GLASS} {...edge}/></g>;
  default:return null;
 }
}
