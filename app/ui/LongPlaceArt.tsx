'use client';
import type {GroundMark,SetPieceProp} from '../../game/types';
import {ART_PALETTE as P} from './artPalette';

/* The long built-in tales' middle places (game/set-pieces.ts, LONG_PIECES): Bramble Crossing and the Moonwell,
   the Sunken Archive and the Star Chamber, the Tideglass Steps and the Mistwater Cove. Same conventions as
   PlaceArt.tsx: depth props stand upright from the centre of their left tile (a tile is 50 units, a hero about 89
   tall); flat props and ground marks are tile-local. */

const LAMP='#ffe7a0',LAMP_GLOW='#e8a840',TEAL='#a6e6dc',BRASS='#b8a46a',GOLD='#e8c25a',CLOTH='#b66e80',PAPER='#e6dfcc',SEA='#d5ecea',BERRY='#6f4a86',SAND='#e3d3a8';
const SPINES=[CLOTH,TEAL,PAPER,'#8a85b6',BRASS,'#7c9a7e'];
const shadow=(rx:number,ry=8,cx=0)=><ellipse cx={cx} cy={4} rx={rx} ry={ry} fill={P.ink} opacity=".13"/>;
const stroke={stroke:P.ink,strokeOpacity:.55,strokeWidth:1.4,strokeLinejoin:'round' as const};

/** A bookcase: books on three shelves, or the one emptied shelf with a few loose pages. The water line marks the flood. */
function Shelf({empty=false}:{empty?:boolean}){
 const rows=[-70,-46,-22];
 return <g>{shadow(24,6)}
  <rect x={-22} y={-90} width={44} height={92} fill={P.bark} {...stroke}/><rect x={-18} y={-86} width={36} height={84} fill={P.ink} opacity=".55"/>
  {rows.map((y,r)=><g key={y}><rect x={-20} y={y+18} width={40} height={4} fill={P.barkLight} {...stroke}/>
   {empty?(r===1?<path d={`M-10 ${y+17}l9 -3l8 3l-8 1Z`} fill={PAPER} {...stroke}/>:null)
    :[-15,-9,-4,2,8,13].map((x,i)=><rect key={x} x={x} y={y+(i%3===1?2:0)} width={i%2?5:6} height={18-(i%3===1?2:0)} fill={SPINES[(i+r*2)%SPINES.length]} stroke={P.ink} strokeOpacity=".4" strokeWidth={.8}/>)}</g>)}
  <rect x={-24} y={-95} width={48} height={7} fill={P.barkLight} {...stroke}/>
  {empty?null:<path d="M-22 -14q11 -3 22 0t22 0" fill="none" stroke={P.waterLight} strokeWidth={2} opacity=".8"/>}
 </g>;
}

/** An upright landmark on the 2.5D board; null for props drawn elsewhere. */
export function DepthLong({prop}:{prop:SetPieceProp}){
 switch(prop){
  // Bramble Crossing: a thorny bush taller than a hound, with dark berries.
  case 'bramble':return <g>{shadow(24,7)}
   <path d="M-23 2q-6 -16 4 -26q-2 -14 12 -16q6 -12 18 -4q14 -4 14 12q10 8 2 22q4 8 -4 12Z" fill={P.leafDark} {...stroke}/>
   <path d="M-14 -8q-2 -12 8 -16q4 -10 14 -4q10 0 8 12q4 6 -2 10Z" fill={P.leaf}/>
   <g fill="none" stroke={P.ink} strokeOpacity=".6" strokeWidth={1.2} strokeLinecap="round">{[[-18,-20,-24,-24],[-8,-36,-10,-43],[10,-34,14,-41],[22,-18,28,-21],[-2,-22,2,-27],[14,-10,19,-12],[-12,-6,-17,-3]].map(([x1,y1,x2,y2],i)=><path key={i} d={`M${x1} ${y1}L${x2} ${y2}`}/>)}</g>
   {[[-6,-14],[6,-24],[14,-16],[-12,-26],[2,-8]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={2.6} fill={BERRY} stroke={P.ink} strokeOpacity=".5" strokeWidth={.8}/>)}
  </g>;
  // The Moonwell: a round stone well with shining water, and a lantern hook above it that holds nothing.
  case 'moonwell':return <g>{shadow(44,10,25)}
   <circle cx={25} cy={-30} r={34} fill={TEAL} opacity=".22"/>
   <path d="M-9 -16v16q34 12 68 0v-16" fill={P.stone} {...stroke}/>
   <g stroke={P.stoneDark} strokeOpacity=".55" strokeWidth={1}><path d="M-9 -8q34 11 68 0"/>{[2,14,26,38,50].map((x,i)=><path key={x} d={`M${x} ${i%2?-6:-2}v${i%2?8:6}`}/>)}</g>
   <ellipse cx={25} cy={-16} rx={34} ry={11} fill={P.stoneLight} {...stroke}/><ellipse cx={25} cy={-16} rx={27} ry={7.5} fill={TEAL} stroke={P.ink} strokeOpacity=".4"/>
   <ellipse cx={20} cy={-17} rx={12} ry={2.2} fill={SEA} opacity=".85"/>
   <path d="M53 -14V-82M53 -82H24" fill="none" stroke={P.bark} strokeWidth={4} strokeLinecap="round"/>
   <path d="M26 -82v8q0 4 -4 4" fill="none" stroke={P.metal} strokeWidth={1.8} strokeLinecap="round"/>
  </g>;
  // The Sunken Archive
  case 'shelf':return <Shelf/>;
  case 'shelf-empty':return <Shelf empty/>;
  case 'lectern':return <g>{shadow(18,6)}<path d="M-4 2V-34h8V2Z" fill={P.bark} {...stroke}/><path d="M-12 2h24" stroke={P.bark} strokeWidth={4}/>
   <path d="M-20 -36l40 -8l2 8l-40 8Z" fill={P.barkLight} {...stroke}/><path d="M-15 -37l14 -3l1 6l-14 3Z M2 -41l14 -3l1 6l-14 3Z" fill={PAPER} {...stroke}/>
   <circle cx={16} cy={-56} r={13} fill={LAMP_GLOW} opacity=".3"/><rect x={14} y={-52} width={4} height={10} fill={PAPER} {...stroke}/><path d="M16 -53q-3 -4 0 -8q3 4 0 8Z" fill={LAMP}/></g>;
  // The Star Chamber: the brass orrery, its sun at the centre and one arm without its star.
  case 'orrery':return <g>{shadow(44,11,25)}
   <circle cx={25} cy={-104} r={40} fill={LAMP_GLOW} opacity=".2"/>
   <path d="M5 2l8 -26h24l8 26Z" fill={P.stoneDeep} {...stroke}/><rect x={1} y={-28} width={48} height={7} fill={P.stoneLight} {...stroke}/><rect x={21} y={-88} width={8} height={62} fill={BRASS} {...stroke}/>
   <path d="M25 -88L-8 -72M25 -88L60 -74" stroke={BRASS} strokeWidth={1.6}/>
   <ellipse cx={25} cy={-104} rx={56} ry={17} fill="none" stroke={BRASS} strokeWidth={2.6}/><ellipse cx={25} cy={-104} rx={36} ry={11} fill="none" stroke={BRASS} strokeWidth={2}/>
   <circle cx={25} cy={-104} r={13} fill={GOLD} {...stroke}/><circle cx={21} cy={-108} r={4} fill={LAMP} opacity=".8"/>
   <circle cx={-31} cy={-100} r={6} fill={TEAL} {...stroke}/><circle cx={58} cy={-112} r={4.5} fill={CLOTH} {...stroke}/><circle cx={74} cy={-96} r={6.5} fill="#8a85b6" {...stroke}/>
   <path d="M25 -104L-9 -116" stroke={BRASS} strokeWidth={1.6}/><circle cx={-10} cy={-116} r={5} fill="none" stroke={BRASS} strokeWidth={1.4} strokeDasharray="2 2"/>
  </g>;
  // The Mistwater Cove: the smugglers' boat on its keel in the sand, a stub mast, and a lantern with a cloth over it.
  case 'wreck':return <g>{shadow(70,10,50)}
   <path d="M-22 -26Q50 -14 122 -30L112 -4Q50 8 -12 -2Z" fill={P.bark} {...stroke}/>
   <path d="M-18 -20Q50 -8 118 -24M-14 -11Q50 0 115 -14" fill="none" stroke={P.ink} strokeOpacity=".35" strokeWidth={1.4}/>
   <path d="M-22 -26Q50 -20 122 -30" fill="none" stroke={P.barkLight} strokeWidth={3}/>
   <path d="M44 -24V-86" stroke={P.bark} strokeWidth={5} strokeLinecap="round"/><path d="M44 -82l22 34H44Z" fill={P.stoneLight} opacity=".7" {...stroke}/>
   <rect x={78} y={-40} width={22} height={13} fill={P.barkLight} {...stroke}/><rect x={84} y={-46} width={18} height={8} fill={P.bark} {...stroke}/>
   <circle cx={-6} cy={-44} r={10} fill={LAMP_GLOW} opacity=".16"/><path d="M-9 -30v-14h8v14" fill={LAMP} opacity=".6" {...stroke}/><path d="M-13 -40q8 -10 16 0l-2 11h-12Z" fill={P.stoneDeep} {...stroke}/><path d="M-11 -31h12" stroke={LAMP} strokeWidth={1.6} opacity=".8"/>
  </g>;
  default:return null;
 }
}

/** The same landmarks seen from above on the tactical map, in tile-local units. */
export function FlatLong({prop}:{prop:SetPieceProp}){
 switch(prop){
  case 'bramble':return <g><path d="M8 30q-4-12 6-18q4-8 14-4q12-2 12 10q6 8-2 14q-2 8-12 6q-12 4-18-8Z" fill={P.leafDark} {...stroke}/><path d="M16 26q0-8 8-10q8 0 8 8" fill="none" stroke={P.leaf} strokeWidth={4}/>{[[18,20],[30,18],[26,30]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={2.4} fill={BERRY}/>)}</g>;
  case 'moonwell':return <g><circle cx={50} cy={25} r={28} fill={TEAL} opacity=".2"/><circle cx={50} cy={25} r={21} fill={P.stoneLight} {...stroke}/><circle cx={50} cy={25} r={14} fill={TEAL} stroke={P.ink} strokeOpacity=".4"/><circle cx={74} cy={10} r={3.5} fill={P.bark}/><path d="M74 10H52" stroke={P.bark} strokeWidth={2.5}/></g>;
  case 'shelf':case 'shelf-empty':return <g><rect x={3} y={14} width={44} height={22} fill={P.bark} {...stroke}/>{prop==='shelf'?[8,14,20,26,32,38].map((x,i)=><rect key={x} x={x} y={17} width={5} height={16} fill={SPINES[i%SPINES.length]}/>):<rect x={14} y={22} width={12} height={7} fill={PAPER}/>}</g>;
  case 'lectern':return <g><rect x={13} y={16} width={24} height={18} fill={P.barkLight} {...stroke}/><path d="M16 19h8v12h-8ZM26 19h8v12h-8Z" fill={PAPER}/><circle cx={38} cy={14} r={5} fill={LAMP_GLOW} opacity=".4"/><circle cx={38} cy={14} r={2} fill={LAMP}/></g>;
  case 'orrery':return <g><circle cx={50} cy={25} r={23} fill="none" stroke={BRASS} strokeWidth={2.2}/><circle cx={50} cy={25} r={14} fill="none" stroke={BRASS} strokeWidth={1.8}/><circle cx={50} cy={25} r={7} fill={GOLD} {...stroke}/><circle cx={27} cy={25} r={3.5} fill={TEAL}/><circle cx={64} cy={25} r={3} fill={CLOTH}/><circle cx={50} cy={11} r={3} fill="none" stroke={BRASS} strokeDasharray="2 2"/></g>;
  case 'wreck':return <g><path d="M6 26Q30 6 120 14Q146 25 120 36Q30 44 6 26Z" fill={P.bark} {...stroke}/><path d="M16 26H132" stroke={P.ink} strokeOpacity=".3" strokeWidth={1.4}/><circle cx={70} cy={25} r={4} fill={P.barkLight} {...stroke}/><circle cx={12} cy={26} r={4} fill={CLOTH}/></g>;
  default:return null;
 }
}

/** Ground marks for these places, in tile-local units; the same drawing serves both views. */
export function LongMark({mark,seed=0}:{mark:GroundMark;seed?:number}){
 switch(mark){
  // Stepping stones across the stream: the water still runs between them, but the stones are walkable.
  case 'stones':return <g><rect width={51} height={51} fill={P.water}/><path d="M4 12q6-3 12 0t10 0M28 40q6-3 12 0" fill="none" stroke={P.waterLight} strokeOpacity=".6" strokeWidth={1.4}/>
   {[[14,18,10],[33,24,11],[19,36,9]].map(([x,y,r],i)=><g key={i}><ellipse cx={x} cy={y+2} rx={r} ry={r*.6} fill={P.ink} opacity=".2"/><ellipse cx={x} cy={y} rx={r} ry={r*.62} fill={P.stoneLight} {...stroke}/></g>)}</g>;
  case 'pages':return <g>{[[12,18,-14],[30,30,10],[22,38,-4]].slice(0,2+seed%2).map(([x,y,a],i)=><rect key={i} x={x-6} y={y-4} width={12} height={8} fill={PAPER} stroke={P.ink} strokeOpacity=".4" strokeWidth={.8} transform={`rotate(${a} ${x} ${y})`}/>)}</g>;
  // The Star Chamber's floor: dark slate inlaid with brass stars and the arc of an orbit.
  case 'stars':return <g><rect width={50} height={50} fill={P.stoneDeep} opacity=".55"/><path d={['M0 40Q25 30 50 40','M0 10Q25 20 50 10','M10 0Q20 25 10 50','M40 0Q30 25 40 50'][seed%4]} fill="none" stroke={BRASS} strokeOpacity=".55" strokeWidth={1.2}/>
   {[[14,14],[36,30],[24,40]].slice(0,1+seed%3).map(([x,y],i)=><path key={i} d={`M${x} ${y-4}l1.2 2.8l2.8 1.2l-2.8 1.2l-1.2 2.8l-1.2 -2.8l-2.8 -1.2l2.8 -1.2Z`} fill={GOLD}/>)}</g>;
  // Stone steps down toward the water; fresh glass glitters on the treads.
  case 'steps':return <g><rect width={50} height={50} fill={P.stone} opacity=".5"/>{[0,1,2].map(i=><g key={i}><rect y={i*16.7} width={50} height={11} fill={P.stoneLight} opacity=".7"/><rect y={i*16.7+11} width={50} height={5.7} fill={P.stoneDeep} opacity=".45"/><path d={`M0 ${i*16.7}h50`} stroke={P.metalLight} strokeOpacity=".5" strokeWidth={1}/></g>)}
   <path d={`M${8+seed%5*7} ${10+seed%3*12}l3 -2l1 3Z`} fill={TEAL} stroke={P.ink} strokeOpacity=".4" strokeWidth={.6}/></g>;
  case 'bridge':return <g><rect x={-1} width={52} height={50} fill={P.bark}/>{[0,1,2,3,4].map(i=><path key={i} d={`M${2+i*10} 0v50`} stroke={P.ink} strokeOpacity=".35" strokeWidth={1.2}/>)}<path d={`M${6+seed%3*10} 14h5M${24+seed%2*10} 34h5`} stroke={P.barkLight} strokeWidth={2}/></g>;
  case 'sand':return <g><rect width={51} height={51} fill={SAND} opacity=".42"/><path d={seed%2?'M6 16q8-3 16 0t16 0M14 36q8-3 16 0':'M10 22q8-3 16 0t16 0M4 40q8-3 16 0'} fill="none" stroke={P.barkLight} strokeOpacity=".6" strokeWidth={1.2}/>{seed%7===0?<path d="M34 12q4 -5 8 0Z" fill={PAPER} stroke={P.ink} strokeOpacity=".3" strokeWidth={.6}/>:null}</g>;
  default:return null;
 }
}

/** Light these landmarks cast on the ground, in tile-local units of their own tile. */
export function LongLight({prop}:{prop:SetPieceProp}){
 if(prop==='moonwell')return <g><circle cx={50} cy={20} r={70} fill={TEAL} opacity=".1"/><circle cx={50} cy={22} r={40} fill={TEAL} opacity=".12"/></g>;
 if(prop==='orrery')return <circle cx={50} cy={20} r={56} fill={LAMP_GLOW} opacity=".1"/>;
 if(prop==='lectern')return <circle cx={38} cy={22} r={34} fill={LAMP_GLOW} opacity=".1"/>;
 if(prop==='wreck')return <circle cx={-6} cy={20} r={30} fill={LAMP_GLOW} opacity=".08"/>;
 return null;
}
