'use client';
import type {GroundMark,SetPieceProp} from '../../game/types';
import {ART_PALETTE as P} from './artPalette';

/* The Hollow Reach's and Saltreach Harbour's later chapters (game/set-pieces.ts), redrawn from the approved World
   page boards in the board's own palette. Same conventions as SetPieceArt.tsx: depth props stand upright from the
   centre of their left tile (a tile is 50 units, a hero about 89 tall); flat props and ground marks are tile-local. */

const LAMP='#ffe7a0',LAMP_GLOW='#e8a840',TEAL='#a6e6dc',BRASS='#b8a46a',SALT='#f4f1ea',GOLD='#e8c25a',CLOTH='#b66e80',PAPER='#e6dfcc',SEA='#d5ecea';
const shadow=(rx:number,ry=8,cx=0)=><ellipse cx={cx} cy={4} rx={rx} ry={ry} fill={P.ink} opacity=".13"/>;
const stroke={stroke:P.ink,strokeOpacity:.55,strokeWidth:1.4,strokeLinejoin:'round' as const};
const courses=(x:number,y:number,w:number,h:number,rows:number)=><g stroke={P.stoneDark} strokeOpacity=".55" strokeWidth={1}>
 {Array.from({length:rows-1},(_,i)=><path key={'r'+i} d={`M${x} ${y+h/rows*(i+1)}h${w}`}/>)}
 {Array.from({length:rows},(_,i)=><path key={'c'+i} d={`M${x+w*(.25+(i*.37)%.5)} ${y+h/rows*i}v${h/rows}`}/>)}
</g>;
/** The tide's salt line along the lower masonry. */
const saltLine=(x:number,w:number,y:number)=>{const n=Math.max(2,Math.round(w/12)),step=w/n;return <path d={`M${x} ${y}`+`q${step/2} -2.5 ${step} 0`.repeat(n)} fill="none" stroke={SALT} strokeWidth={2} opacity=".8"/>};
/** The Low-Tide Crew's tally: a wave over a hook. One drawing, wherever it appears. */
export function Tally({x,y,s,color}:{x:number;y:number;s:number;color:string}){
 return <g fill="none" stroke={color} strokeWidth={Math.max(1.2,s*.09)} strokeLinecap="round"><path d={`M${x-s*.35} ${y-s*.08}q${s*.17} ${-s*.15} ${s*.35} 0t${s*.35} 0`}/><path d={`M${x} ${y}v${s*.18}q0 ${s*.1} ${-s*.12} ${s*.1}`}/></g>;
}
function Sign({x,y}:{x:number;y:number}){return <g><rect x={x-9} y={y} width={18} height={9} fill={P.bark} {...stroke}/><path d={`M${x} ${y+2}q3 3 0 5q-3-2 0-5Z`} fill={TEAL}/></g>}
function Shell({x0,x1,h}:{x0:number;x1:number;h:number}){
 return <g><rect x={x0} y={-h} width={x1-x0} height={h+2} fill={P.stone} {...stroke}/>{courses(x0,-h,x1-x0,h+2,4)}<path d={`M${x0-7} ${-h+2}L${x0+(x1-x0)*.3} ${-h-24}L${x1+7} ${-h-2}Z`} fill={P.stoneDeep} {...stroke}/></g>;
}
const shutter=(x:number,y:number,w:number,h:number,n=4)=><g><rect x={x} y={y} width={w} height={h} fill={P.bark} {...stroke}/>{Array.from({length:n-1},(_,i)=><path key={i} d={`M${x} ${y+h/n*(i+1)}h${w}`} stroke={P.ink} strokeOpacity=".3" strokeWidth={1.4}/>)}</g>;
function Pier({repaired=false}:{repaired?:boolean}){
 return <g>{shadow(24,7)}
  <rect x={-19} y={-78} width={38} height={80} fill={P.stone} {...stroke}/>{courses(-19,-78,38,80,4)}
  {repaired?<><rect x={-18} y={-77} width={36} height={26} fill={P.stoneLight}/><rect x={-21} y={-52} width={42} height={5} fill={P.stoneDeep} {...stroke}/>{[-12,0,12].map(x=><circle key={x} cx={x} cy={-49.5} r={1.4} fill={P.metalLight}/>)}</>:null}
  <path d="M19 -78l-5 0l5 6Z" fill={P.stoneDeep}/><path d="M-19 -40l5 0l-5 6Z" fill={P.stoneDeep}/>
  <rect x={-23} y={-86} width={46} height={9} fill={P.stoneLight} {...stroke}/>
  {saltLine(-19,38,-14)}
 </g>;
}

/** An upright landmark on the 2.5D board; null for props SetPieceArt draws. */
export function DepthPlace({prop}:{prop:SetPieceProp}){
 switch(prop){
  // The Hollow Reach
  case 'parapet':return <g>{shadow(26,5)}<rect x={-25} y={-24} width={50} height={26} fill={P.stone} {...stroke}/>{courses(-25,-24,50,26,2)}<rect x={-27} y={-29} width={54} height={6} fill={P.stoneLight} {...stroke}/><rect x={-14} y={-20} width={12} height={8} fill={P.stoneLight} {...stroke}/><circle cx={10} cy={-14} r={2} fill={P.ink} opacity=".6"/></g>;
  case 'banner':return <g>{shadow(10,4)}<rect x={-2} y={-86} width={4} height={88} fill={P.stoneDeep}/><path d="M2 -84Q16 -88 30 -80L26 -70Q14 -74 2 -66Z" fill={CLOTH} {...stroke}/><path d="M2 -74q12 -3 22 -1" fill="none" stroke={P.stoneLight} strokeWidth={1.2}/></g>;
  case 'retaining':return <g><rect x={-25} y={-16} width={50} height={18} fill={P.stoneDark} {...stroke}/>{courses(-25,-16,50,18,2)}<path d="M-25 -16h50" stroke={P.stoneLight} strokeWidth={2}/></g>;
  case 'slope':return <g fill={P.stoneDark} {...stroke}><path d="M-18 2l3 -7h10l2 7Z"/><path d="M4 0l3 -6h9l2 6Z" fill={P.stone}/></g>;
  case 'pillar':return <g>{shadow(20,7)}<rect x={-15} y={-8} width={30} height={10} fill={P.stoneLight} {...stroke}/><rect x={-9} y={-92} width={18} height={84} fill={P.stone} {...stroke}/>{[-30,-55,-78].map(y=><path key={y} d={`M-9 ${y}h18`} stroke={P.stoneDark} strokeWidth={1}/>)}<path d="M-5 -90v80" stroke={P.metalLight} strokeWidth={1.6} opacity=".6"/><rect x={-15} y={-100} width={30} height={9} fill={P.stoneLight} {...stroke}/></g>;
  case 'treasury':return <g>{shadow(76,10,50)}
   <rect x={-23} y={-96} width={146} height={98} fill={P.stone} {...stroke}/>{courses(-23,-96,146,98,4)}<rect x={-27} y={-104} width={154} height={9} fill={P.stoneLight} {...stroke}/>
   <path d="M30 2V-42A20 20 0 0 1 70 -42V2Z" fill={P.ink} opacity=".85"/><path d="M30 -14h40M30 -32h40" stroke={P.stoneDark} strokeWidth={3}/><circle cx={63} cy={-22} r={2} fill={P.metal}/>
   <circle cx={50} cy={-78} r={11} fill={P.stone} {...stroke}/><circle cx={50} cy={-78} r={7.5} fill="none" stroke={P.stoneDark} strokeWidth={1.3}/><path d="M45 -75v-5l2.5 2.5l2.5 -3.5l2.5 3.5l2.5 -2.5v5Z" fill={P.stoneDark}/>
  </g>;
  case 'crown':return <g>{shadow(16,5)}<circle cx={0} cy={-46} r={20} fill={LAMP_GLOW} opacity=".28"/><path d="M-12 2V-30H12V2Z" fill={P.stone} {...stroke}/><rect x={-15} y={-35} width={30} height={6} fill={P.stoneLight} {...stroke}/><path d="M-9 -36V-50l4.5 6l4.5 -9l4.5 9l4.5 -6V-36Z" fill={GOLD} {...stroke}/><circle cx={0} cy={-40} r={1.6} fill={CLOTH}/></g>;
  case 'wall-torch':case 'wall-banner':return <g>{shadow(26,7)}<rect x={-25} y={-56} width={50} height={58} fill={P.stone} {...stroke}/>{courses(-25,-56,50,58,3)}<rect x={-27} y={-62} width={54} height={7} fill={P.stoneLight} {...stroke}/>
   {prop==='wall-torch'?<><circle cx={0} cy={-46} r={20} fill={LAMP_GLOW} opacity=".3"/><path d="M-3 -32l3 -10l3 10Z" fill={P.stoneDeep}/><path d="M0 -42q-5 -6 0 -13q5 7 0 13Z" fill={LAMP} {...stroke}/></>
    :<><path d="M-10 -52h20" stroke={P.stoneDeep} strokeWidth={2.5}/><path d="M-9 -52H9L10 -20L0 -26L-8 -19Z" fill={CLOTH} {...stroke}/><circle cx={0} cy={-40} r={4} fill="none" stroke={GOLD} strokeWidth={1.3}/></>}
  </g>;
  case 'gatepost':return <g>{shadow(26,7)}<path d="M-24 2V-74l8 -6l10 5l8 -8l8 6l14 -2V2Z" fill={P.stone} {...stroke}/>{courses(-24,-70,48,72,3)}</g>;
  // Saltreach Harbour: glassmakers' row
  case 'workshop':return <g>{shadow(52,10,25)}<Shell x0={-22} x1={72} h={72}/>{shutter(-12,-54,30,22)}<rect x={42} y={-42} width={20} height={44} fill={P.bark} {...stroke}/><path d="M42 -26l20 -10M42 -36l20 8" stroke={P.ink} strokeOpacity=".4" strokeWidth={2}/><Sign x={25} y={-68}/></g>;
  case 'workshop-wide':return <g>{shadow(52,10,25)}<Shell x0={-22} x1={72} h={72}/>
   <path d="M-8 -46q10 -14 4 -22q12 5 16 -4q12 8 22 -2q4 12 14 6q2 10 10 22Z" fill={P.ink} opacity=".35"/>{shutter(-12,-46,74,48,7)}<path d="M25 -46v48" stroke={P.ink} strokeOpacity=".4" strokeWidth={1.6}/><Sign x={25} y={-68}/></g>;
  case 'workshop-narrow':return <g>{shadow(52,10,25)}<rect x={32} y={-58} width={40} height={60} fill={P.stoneDeep} {...stroke}/><Shell x0={-22} x1={32} h={80}/>
   <rect x={-14} y={-42} width={18} height={44} fill={P.bark} {...stroke}/><rect x={9} y={-60} width={18} height={28} fill={P.stoneDark} {...stroke}/>
   {[0,1,2].flatMap(i=>[0,1,2].map(j=><circle key={`${i}${j}`} cx={13+i*5} cy={-55+j*9} r={1.8} fill={P.ink} stroke={BRASS} strokeWidth={.9}/>))}<Sign x={5} y={-76}/></g>;
  case 'workshop-counter':return <g>{shadow(52,10,25)}<Shell x0={-22} x1={72} h={72}/>
   <rect x={-12} y={-54} width={74} height={26} fill={P.ink} opacity=".75"/><rect x={-16} y={-29} width={82} height={5} fill={P.barkLight} {...stroke}/><rect x={-16} y={-24} width={82} height={26} fill={P.bark} {...stroke}/>
   <rect x={-6} y={-46} width={20} height={17} fill={PAPER} {...stroke}/><path d="M-6 -38h20M4 -46v17" stroke={P.bark} strokeWidth={1.6}/>
   <path d="M30 -31h26l-2 -3H32Z" fill={P.bark} {...stroke}/>{[0,1,2,3,4].map(i=><path key={i} d={`M${33+i*5} -33l1.5 -4l2 4Z`} fill={TEAL} stroke={P.ink} strokeWidth={.6}/>)}<Sign x={25} y={-68}/></g>;
  case 'worktable':case 'worktable-invoice':return <g>{shadow(24,7)}<path d="M-18 2v-20M18 2v-20" stroke={P.bark} strokeWidth={3.5}/><path d="M-22 -18h44l-3 -6h-38Z" fill={P.barkLight} {...stroke}/>
   <path d="M-12 -24l5 -6l3 6Z" fill={TEAL} {...stroke}/>
   {prop==='worktable-invoice'?<g><path d="M-6 -19h22l-2 -5h-22Z" fill={PAPER} {...stroke}/><Tally x={3} y={-22.5} s={11} color={P.ink}/><circle cx={12} cy={-21} r={1.3} fill={CLOTH}/></g>:<path d="M6 -26h10" stroke={P.leafDark} strokeWidth={2.5}/>}</g>;
  case 'sandbin':return <g>{shadow(18,6)}<rect x={-15} y={-22} width={30} height={24} fill={P.bark} {...stroke}/><path d="M-15 -22q15 -7 30 0" fill={P.barkLight} {...stroke}/><path d="M-15 -10h30" stroke={P.ink} strokeOpacity=".4"/></g>;
  case 'rack':case 'rack-marked':return <g>{shadow(18,5)}<path d="M-15 2V-58M15 2V-58" stroke={BRASS} strokeWidth={3} strokeLinecap="round"/>
   {[-18,-36,-54].map(y=><g key={y}><path d={`M-15 ${y}h30`} stroke={BRASS} strokeWidth={2}/>{[-10,-3,4,11].map(x=><path key={x} d={`M${x} ${y}v-4`} stroke={P.stoneDark} strokeWidth={1.3}/>)}</g>)}
   {prop==='rack-marked'?<g><rect x={-10} y={-34} width={20} height={13} fill={P.stoneDeep} {...stroke}/><Tally x={0} y={-28.5} s={14} color={SALT}/></g>:null}</g>;
  case 'stairs-down':return <g><rect x={-25} y={-2} width={6} height={4} fill={P.stoneLight} {...stroke}/>
   {[0,1,2].map(i=><g key={i}><rect x={-19+i*12} y={2+i*6} width={12} height={5} fill={[P.stone,P.stoneDark,P.stoneDeep][i]} {...stroke}/></g>)}<rect x={17} y={-2} width={10} height={26} fill={P.ink} opacity=".9"/>
   <path d="M-19 2h12" stroke={TEAL} strokeWidth={2.4}/></g>;
  // Saltreach Harbour: the harbour vaults
  case 'pier':return <Pier/>;
  case 'pier-repaired':return <Pier repaired/>;
  case 'pier-stump':return <g>{shadow(22,6)}<path d="M-19 2V-24l10 -5l9 4l10 -3l9 3V2Z" fill={P.stone} {...stroke}/>{saltLine(-19,38,-8)}</g>;
  case 'niche':return <g>{shadow(26,7)}<rect x={-25} y={-56} width={50} height={58} fill={P.stone} {...stroke}/>{courses(-25,-56,50,58,3)}<rect x={-27} y={-62} width={54} height={7} fill={P.stoneLight} {...stroke}/>
   <path d="M-14 2V-26A14 14 0 0 1 14 -26V2Z" fill={P.ink} opacity=".8"/><rect x={-10} y={-16} width={20} height={17} fill={P.barkLight} {...stroke}/><path d="M-10 -16h20" stroke={SALT} strokeWidth={2.5}/>{saltLine(-25,50,-12)}</g>;
  case 'vault-door':return <g>{shadow(52,9,25)}
   <rect x={-25} y={-86} width={100} height={88} fill={P.stoneLight} {...stroke}/><path d="M-13 2V-70H63V2" fill={P.ink} opacity=".75"/>
   <rect x={-6} y={-64} width={62} height={66} fill={P.stoneDeep} {...stroke}/><path d="M25 -64v66" stroke={P.ink} strokeOpacity=".5"/>
   {[-48,-18].map(y=><g key={y}><rect x={-18} y={y} width={86} height={9} fill={P.stoneDark} {...stroke}/>{[-10,12,38,60].map(x=><circle key={x} cx={x} cy={y+4.5} r={1.5} fill={P.metalLight}/>)}</g>)}
   {saltLine(-25,100,-10)}<circle cx={25} cy={-78} r={4.5} fill={BRASS} {...stroke}/></g>;
  case 'sea-door':return <g><rect x={-12} y={-82} width={38} height={84} fill={SEA} opacity=".9"/><rect x={-12} y={-82} width={38} height={84} fill={TEAL} opacity=".25"/><rect x={-16} y={-90} width={46} height={9} fill={P.stoneDark} {...stroke}/><rect x={-20} y={-2} width={8} height={5} fill={SALT} {...stroke}/></g>;
  case 'stairs-up':return <g>{[0,1,2].map(i=><rect key={i} x={13-(i+1)*12} y={-6-i*7} width={12} height={8+i*7} fill={[P.stoneDark,P.stone,P.stoneLight][i]} {...stroke}/>)}<rect x={13} y={-3} width={6} height={5} fill={P.stoneLight} {...stroke}/></g>;
  default:return null;
 }
}

/** The same landmarks seen from above on the tactical map, in tile-local units. */
export function FlatPlace({prop}:{prop:SetPieceProp}){
 switch(prop){
  case 'parapet':return <g><rect x={1} y={16} width={48} height={18} fill={P.stone} {...stroke}/><rect x={8} y={20} width={10} height={8} fill={P.stoneLight}/></g>;
  case 'banner':return <g><circle cx={20} cy={25} r={3} fill={P.stoneDeep}/><path d="M20 23l16 3l-16 5Z" fill={CLOTH} {...stroke}/></g>;
  case 'retaining':return <g><rect x={0} y={4} width={50} height={20} fill={P.stoneDark} {...stroke}/><path d="M0 14h50M18 4v10M34 14v10" stroke={P.stoneDeep} strokeWidth={1}/></g>;
  case 'slope':return <g fill={P.stoneDark} {...stroke}><path d="m8 30 5-9h10l2 9Z"/><path d="m28 20 4-7h9l2 7Z" fill={P.stone}/></g>;
  case 'pillar':return <circle cx={25} cy={25} r={13} fill={P.stone} {...stroke}/>;
  case 'treasury':return <g><rect x={2} y={4} width={146} height={40} fill={P.stone} {...stroke}/><path d="M63 44V30a12 12 0 0 1 24 0v14" fill={P.ink} opacity=".8"/><circle cx={75} cy={16} r={6} fill="none" stroke={P.stoneDark} strokeWidth={2}/></g>;
  case 'crown':return <g><circle cx={25} cy={25} r={20} fill={LAMP_GLOW} opacity=".25"/><rect x={14} y={14} width={22} height={22} fill={P.stone} {...stroke}/><path d="M18 31v-10l3.5 4l3.5 -6l3.5 6l3.5 -4v10Z" fill={GOLD} {...stroke}/></g>;
  case 'wall-torch':return <g><rect x={2} y={10} width={46} height={30} fill={P.stone} {...stroke}/><circle cx={25} cy={40} r={14} fill={LAMP_GLOW} opacity=".35"/><circle cx={25} cy={38} r={4} fill={LAMP} {...stroke}/></g>;
  case 'wall-banner':return <g><rect x={2} y={10} width={46} height={30} fill={P.stone} {...stroke}/><path d="M16 40h18l-2 8l-7 -4l-7 4Z" fill={CLOTH} {...stroke}/></g>;
  case 'gatepost':return <rect x={8} y={8} width={34} height={34} fill={P.stone} {...stroke}/>;
  case 'workshop':case 'workshop-wide':case 'workshop-narrow':case 'workshop-counter':{const narrow=prop==='workshop-narrow';return <g>
   <rect x={4} y={6} width={narrow?54:92} height={38} fill={P.stoneDeep} {...stroke}/>{narrow?<rect x={58} y={10} width={38} height={30} fill={P.ink} opacity=".5"/>:null}
   <path d={`M4 25h${narrow?54:92}`} stroke={P.stoneLight} strokeWidth={2}/>{prop==='workshop-counter'?<rect x={14} y={38} width={72} height={9} fill={P.bark} {...stroke}/>:null}
   {prop==='workshop-wide'?<rect x={14} y={36} width={72} height={8} fill={P.bark} {...stroke}/>:null}<circle cx={narrow?31:50} cy={16} r={3.5} fill={TEAL}/></g>;}
  case 'worktable':case 'worktable-invoice':return <g><rect x={6} y={12} width={38} height={26} fill={P.barkLight} {...stroke}/>{prop==='worktable-invoice'?<g><rect x={14} y={26} width={22} height={11} fill={PAPER} {...stroke}/><Tally x={25} y={31} s={14} color={P.ink}/></g>:<path d="M14 20l5-5 3 5Z" fill={TEAL}/>}</g>;
  case 'sandbin':return <rect x={10} y={10} width={30} height={30} fill={P.barkLight} {...stroke}/>;
  case 'rack':case 'rack-marked':return <g><path d="M8 14h34M8 25h34M8 36h34" stroke={BRASS} strokeWidth={2.5}/>{prop==='rack-marked'?<g><rect x={16} y={19} width={18} height={13} fill={P.stoneDeep}/><Tally x={25} y={25} s={14} color={SALT}/></g>:null}</g>;
  case 'stairs-down':return <g>{[0,1,2].map(i=><rect key={i} x={6+i*12} y={0} width={12} height={50} fill={[P.stone,P.stoneDark,P.stoneDeep][i]} {...stroke}/>)}<rect x={42} y={0} width={8} height={50} fill={P.ink}/><path d="M6 0v50" stroke={TEAL} strokeWidth={2.5}/></g>;
  case 'pier':case 'pier-repaired':return <g><rect x={7} y={7} width={36} height={36} fill={prop==='pier'?P.stone:P.stoneLight} {...stroke}/>{prop==='pier-repaired'?<path d="M7 25h36" stroke={P.stoneDeep} strokeWidth={4}/>:null}</g>;
  case 'pier-stump':return <path d="M8 42V14l12-4 10 4 12-3v31Z" fill={P.stone} {...stroke}/>;
  case 'niche':return <g><rect x={2} y={10} width={46} height={30} fill={P.stone} {...stroke}/><rect x={14} y={30} width={22} height={14} fill={P.barkLight} {...stroke}/></g>;
  case 'vault-door':return <g><rect x={4} y={6} width={92} height={38} fill={P.stoneLight} {...stroke}/><rect x={16} y={14} width={68} height={30} fill={P.stoneDeep} {...stroke}/><path d="M16 22h68M16 34h68" stroke={P.stoneDark} strokeWidth={4}/><circle cx={50} cy={10} r={3} fill={BRASS}/></g>;
  case 'sea-door':return <g><rect x={8} y={0} width={42} height={50} fill={SEA}/><rect x={2} y={0} width={8} height={50} fill={SALT} {...stroke}/></g>;
  case 'stairs-up':return <g>{[0,1,2].map(i=><rect key={i} x={32-i*12} y={0} width={12} height={50} fill={[P.stoneDark,P.stone,P.stoneLight][i]} {...stroke}/>)}<rect x={44} y={0} width={6} height={50} fill={P.stoneLight} {...stroke}/></g>;
  default:return null;
 }
}

/** Ground marks for these chapters, in tile-local units; the same drawing serves both views. */
export function PlaceMark({mark,seed=0}:{mark:GroundMark;seed?:number}){
 switch(mark){
  // The drop: the void past the ridge's edge, with cold mist far below. Movement treats it as water.
  case 'drop':return <g><rect width={50} height={50} fill={P.stoneDeep}/><rect width={50} height={50} fill={P.ink} opacity=".55"/><ellipse cx={22+seed%3*3} cy={18} rx={18} ry={2.5} fill={P.stoneLight} opacity=".18"/><ellipse cx={28} cy={36} rx={15} ry={2.5} fill={P.stoneLight} opacity=".24"/></g>;
  case 'rut':return <path d={seed%2?'M4 17h18M28 17h16M2 33h14M22 33h24':'M2 17h24M32 17h14M6 33h18M30 33h16'} stroke={P.stoneDark} strokeOpacity=".3" strokeWidth={2.4} strokeLinecap="round"/>;
  case 'wind':return <g fill="none" stroke={P.grassDetail} strokeWidth={2} strokeLinecap="round">{[12,19,26,33].map(x=><path key={x} d={`M${x} 38q2 -6 8 -11`}/>)}</g>;
  case 'ashlar':return <g><rect width={50} height={50} fill={P.stoneLight} opacity=".45"/><path d={seed%2?'M0 25h50M15 0v25M35 25v25':'M0 25h50M35 0v25M15 25v25'} fill="none" stroke={P.stoneDark} strokeOpacity=".45" strokeWidth={1}/></g>;
  case 'slate':return <g><rect width={50} height={50} fill={P.stoneDark} opacity=".28"/><path d="M0 25h50M0 12h50M0 37h50" stroke={P.stoneDark} strokeOpacity=".4" strokeWidth={1}/>{seed%3===0?<ellipse cx={25} cy={34} rx={12} ry={2} fill={P.metalLight} opacity=".4"/>:null}</g>;
  case 'tally':return <Tally x={25} y={23} s={30} color={SALT}/>;
  case 'vault':return <g><rect width={50} height={50} fill={P.stoneDark} opacity=".22"/><path d={seed%2?'M0 25h50M18 0v25M32 25v25':'M0 25h50M32 0v25M18 25v25'} fill="none" stroke={P.stoneDeep} strokeOpacity=".4" strokeWidth={1}/>{seed%3===0?<path d="M10 46h28" stroke={SALT} strokeWidth={1.4} opacity=".6"/>:null}</g>;
  case 'grate':return <g><rect x={13} y={16} width={24} height={18} fill={P.stoneDeep} stroke={P.stoneDark} strokeWidth={1.4}/>{[19,25,31].map(x=><path key={x} d={`M${x} 16v18`} stroke={P.stoneDark} strokeWidth={1.2}/>)}</g>;
  default:return null;
 }
}

/** Light these landmarks cast on the ground, in tile-local units of their own tile. */
export function PlaceLight({prop}:{prop:SetPieceProp}){
 if(prop==='crown')return <circle cx={25} cy={45} r={40} fill={LAMP_GLOW} opacity=".12"/>;
 if(prop==='wall-torch')return <g><circle cx={25} cy={60} r={50} fill={LAMP_GLOW} opacity=".08"/><circle cx={25} cy={55} r={28} fill={LAMP_GLOW} opacity=".1"/></g>;
 // The district lamp's teal catches the top of the stairs down; the stairwell runs out into the dark.
 if(prop==='stairs-down')return <g><rect x={20} width={30} height={50} fill={P.ink} opacity=".3"/><circle cx={-6} cy={25} r={34} fill={TEAL} opacity=".14"/></g>;
 if(prop==='sea-door')return <g><circle cx={0} cy={25} r={60} fill={SEA} opacity=".16"/><circle cx={10} cy={25} r={30} fill={TEAL} opacity=".14"/></g>;
 if(prop==='stairs-up')return <rect width={30} height={50} fill={P.ink} opacity=".2"/>;
 if(prop==='vault-door')return <circle cx={50} cy={95} r={44} fill={LAMP_GLOW} opacity=".1"/>;
 return null;
}
