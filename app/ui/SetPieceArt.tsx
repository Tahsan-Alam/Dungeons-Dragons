'use client';
import type {GroundMark,SetPieceProp} from '../../game/types';
import {ART_PALETTE as P} from './artPalette';

/* The first-chapter landmarks of the built-in tales (game/set-pieces.ts), redrawn from the approved World page
   samples in the board's own palette. Depth props are drawn upright from the centre of their left tile, at the
   board's scale (a tile is 50 units wide, a hero about 89 tall). Flat props and ground marks use tile-local
   coordinates (0 to 50), so ground marks serve both views. */

const LAMP='#ffe7a0',LAMP_GLOW='#e8a840',LENS='#a6e6dc',BRASS='#b8a46a',SALT='#f4f1ea';
const shadow=(rx:number,ry=8,cx=0)=><ellipse cx={cx} cy={4} rx={rx} ry={ry} fill={P.ink} opacity=".13"/>;
const stroke={stroke:P.ink,strokeOpacity:.55,strokeWidth:1.4,strokeLinejoin:'round' as const};

function Courses({x,y,w,h,rows=3,seed=0}:{x:number;y:number;w:number;h:number;rows?:number;seed?:number}){
 const step=h/rows;
 return <g stroke={P.stoneDark} strokeOpacity=".55" strokeWidth={1}>
  {Array.from({length:rows-1},(_,i)=><path key={'r'+i} d={`M${x} ${y+step*(i+1)}h${w}`}/>)}
  {Array.from({length:rows},(_,i)=><path key={'c'+i} d={`M${x+w*(.3+((i+seed)*.37)%.5)} ${y+step*i}v${step}`}/>)}
 </g>;
}
function Awning({x0,x1,y,depth=18,color,skew=0}:{x0:number;x1:number;y:number;depth?:number;color:string;skew?:number}){
 const w=x1-x0,stripes=Math.round(w/12);
 return <g transform={skew?`rotate(${skew} ${x0} ${y})`:undefined}>
  <path d={`M${x0-6} ${y}H${x1+6}L${x1-2} ${y-depth}H${x0+2}Z`} fill={color} {...stroke}/>
  {Array.from({length:stripes-1},(_,i)=>{const t=(i+1)/stripes;return <path key={i} d={`M${x0-6+(w+12)*t} ${y}L${x0+2+(w-4)*t} ${y-depth}`} stroke={P.ink} strokeOpacity=".22" strokeWidth={1.2}/>})}
  <path d={`M${x0-6} ${y}`+Array.from({length:stripes},()=>`q${(w+12)/stripes/2} 6 ${(w+12)/stripes} 0`).join('')} fill={color} {...stroke}/>
 </g>;
}
function Cask({x,y,r}:{x:number;y:number;r:number}){
 return <g><rect x={x-r*1.5} y={y-r} width={r*3} height={r*2} rx={r*.9} fill={P.barkLight} {...stroke}/><path d={`M${x-r*.7} ${y-r}v${r*2}M${x+r*.7} ${y-r}v${r*2}`} stroke={P.stoneDeep} strokeWidth={2}/><ellipse cx={x+r*1.5} cy={y} rx={r*.4} ry={r} fill={P.bark} {...stroke}/></g>;
}
function Cage({lit}:{lit:boolean}){
 const s=24,top=-86;
 return <g>
  {lit?<circle cx={0} cy={top+s/2} r={30} fill={LENS} opacity=".3"/>:null}
  <rect x={-2} y={top+s} width={4} height={-top-s} fill={P.stoneDeep}/>
  <rect x={-s/2} y={top} width={s} height={s} fill={lit?LENS:'none'} stroke={P.stoneDeep} strokeWidth={3}/>
  {lit?<path d={`M0 ${top}v${s}M${-s/2} ${top+s/2}h${s}`} stroke={P.stoneDeep} strokeWidth={1.6}/>:<>
   <path d={`M${s/2} ${top}l14 -3v${s}l-14 3`} fill="none" stroke={P.stoneDeep} strokeWidth={2.4}/>
   {[[-1,-1,top],[1,-1,top],[-1,1,top+s],[1,1,top+s]].map(([dx,dy,y],i)=><path key={i} d={`M${dx*s/2} ${y}l${dx*6} ${dy*2}l${dx*2} ${dy*5}`} fill="none" stroke={BRASS} strokeWidth={2}/>)}
  </>}
 </g>;
}

/** An upright landmark on the 2.5D board. */
export function DepthSetPiece({prop}:{prop:SetPieceProp}){
 switch(prop){
  case 'span':return null;
  case 'shop':return <g>{shadow(52,10,25)}
   <rect x={-22} y={-62} width={94} height={66} fill={P.stone} {...stroke}/><Courses x={-22} y={-62} w={94} h={66} rows={4} seed={2}/>
   <path d="M-30 -60 L25 -98 L80 -60Z" fill={P.stoneDeep} {...stroke}/>
   <rect x={-10} y={-48} width={30} height={22} fill={P.stoneDark} {...stroke}/><path d="M-10 -41h30M-10 -34h30" stroke={P.stoneDeep} strokeWidth={1.5}/>
   <rect x={42} y={-38} width={20} height={42} fill={P.bark} {...stroke}/><path d="M42 -20 l20 -10" stroke={P.ink} strokeOpacity=".5" strokeWidth={2.5}/>
  </g>;
  case 'stall':case 'stall-skew':{const skew=prop==='stall-skew';return <g>{shadow(50,9,25)}
   <path d="M-16 0V-56M66 0V-56" stroke={P.bark} strokeWidth={4}/>
   <rect x={-20} y={-52} width={90} height={34} fill={P.stoneDark} opacity=".55"/>
   <rect x={-22} y={-22} width={94} height={26} fill={P.barkLight} {...stroke}/><path d="M-22 -13h94" stroke={P.bark} strokeWidth={1.2}/>
   {skew?[0,1,2].map(i=><path key={i} d={`M${-4+i*28} -22q-3 -14 5 -20h8q8 6 5 20Z`} fill={[P.mushroom,P.leafAlternate,P.bark][i]} {...stroke}/>)
    :[0,1].map(i=><g key={i}><ellipse cx={8+i*42} cy={-26} rx={14} ry={6} fill={P.bark} {...stroke}/>{[-7,1,9].map((dx,j)=><circle key={j} cx={8+i*42+dx} cy={-31} r={4.5} fill={j%2?P.flower:P.mushroom} {...stroke}/>)}</g>)}
   <path d={`M66 -22 L${skew?72:66} -56`} stroke={P.bark} strokeWidth={4}/>
   <Awning x0={-18} x1={68} y={-56} color={skew?P.accent:P.flower} skew={skew?7:0}/>
   {skew?null:<><circle cx={-6} cy={-44} r={9} fill={LAMP_GLOW} opacity=".35"/><rect x={-10} y={-50} width={8} height={10} fill={LAMP} {...stroke}/></>}
  </g>;}
  case 'salt-stall':return <g>{shadow(26,8)}
   <path d="M-18 0V-44M18 0V-44" stroke={P.bark} strokeWidth={3.5}/>
   <rect x={-20} y={-16} width={40} height={20} fill={P.barkLight} {...stroke}/>
   {[-10,-6,4,9,13].map((x,i)=><path key={i} d={`M${x} -18h2`} stroke={SALT} strokeWidth={2.5}/>)}
   <path d="M-16 -16q4 -12 14 -9q9 2 13 9Z" fill={P.stoneLight} {...stroke}/>
   {[-8,0,8].map(x=><path key={x} d={`M${x} -40v7q0 4 3 4q3 0 3-3`} fill="none" stroke={P.stoneDark} strokeWidth={1.6}/>)}
   <Awning x0={-18} x1={18} y={-44} depth={12} color={P.flowerLight}/>
   <rect x={-12} y={-70} width={24} height={14} fill={P.bark} {...stroke}/>
   {[[-8,-62],[-2,-62],[4,-62],[-5,-67],[1,-67]].map(([x,y],i)=><rect key={i} x={x} y={y} width={5} height={5} fill={SALT} stroke={P.stoneDark} strokeWidth={.8}/>)}
   <g transform="translate(-8 14)"><path d="M-8 0v-10h16v10Z" fill={P.bark} {...stroke}/><rect x={-5} y={-8} width={10} height={6} fill={P.ink} opacity=".5"/></g>
  </g>;
  case 'oil-cart':return <g>{shadow(50,9,25)}
   <path d="M-22 -14 L-40 2 M-22 -8 L-36 4" stroke={P.bark} strokeWidth={4} strokeLinecap="round"/>
   <rect x={-22} y={-30} width={94} height={12} fill={P.bark} {...stroke}/>
   <Cask x={6} y={-40} r={10}/><Cask x={44} y={-40} r={10}/><Cask x={25} y={-58} r={10}/>
   {[-4,56].map(x=><g key={x}><circle cx={x} cy={-12} r={12} fill={P.stoneDark} {...stroke}/>{[0,1,2,3,4,5].map(i=><path key={i} d={`M${x} -12l${12*Math.cos(i*Math.PI/3)} ${12*Math.sin(i*Math.PI/3)}`} stroke={P.bark} strokeWidth={1.5}/>)}</g>)}
  </g>;
  case 'lamp':return <g>{shadow(12,5)}
   <circle cx={0} cy={-84} r={34} fill={LAMP_GLOW} opacity=".22"/>
   <rect x={-2.5} y={-76} width={5} height={78} fill={P.stoneDeep}/>
   <path d="M-9 -94h18l2 4v12l-2 4h-18l-2 -4v-12Z" fill={LAMP} {...stroke}/><rect x={1} y={-91} width={7} height={14} fill="#cfe6b8"/><path d="M0 -94v20" stroke={P.bark} strokeWidth={1.5}/>
  </g>;
  case 'gate-left':return <g>{shadow(18,7)}
   <rect x={-11} y={-92} width={22} height={94} fill={P.stone} {...stroke}/><Courses x={-11} y={-92} w={22} h={94} rows={5}/>
   <path d="M-14 -94 L44 -100 L46 -88 L-14 -82Z" fill={P.stoneLight} {...stroke}/>
  </g>;
  case 'gate-right':return <g>{shadow(18,7)}
   <path d="M-11 2V-62l6 -8l8 6l8 -4V2Z" fill={P.stone} {...stroke}/><Courses x={-11} y={-60} w={22} h={62} rows={3} seed={1}/>
  </g>;
  case 'gate-rubble':return <g>{shadow(24,7)}<path d="M-22 0l4 -12h40l4 12Z" fill={P.stoneLight} {...stroke}/><path d="M6 -12l5 -9h12l2 9Z" fill={P.stone} {...stroke}/></g>;
  case 'masonry':return <g>{shadow(26,7)}
   <rect x={-25} y={-34} width={50} height={36} fill={P.stone} {...stroke}/><Courses x={-25} y={-34} w={50} h={36} rows={3}/>
   <rect x={-27} y={-40} width={54} height={7} fill={P.stoneLight} {...stroke}/><circle cx={-8} cy={-24} r={2.5} fill={P.ink} opacity=".55"/>
  </g>;
  case 'carving':return <g>{shadow(52,9,25)}
   <path d="M-25 2V-64l14 -6l20 4l26 -10L75 -72V2Z" fill={P.stone} {...stroke}/><Courses x={-25} y={-60} w={100} h={62} rows={3} seed={3}/>
   <rect x={-14} y={-60} width={78} height={34} fill={P.stoneLight} {...stroke}/>
   <rect x={-14} y={-60} width={78} height={34} fill={LAMP_GLOW} opacity=".18"/>
   <g transform="translate(-12 -59) scale(.5)">
    {['M4 62 Q30 60 46 50 Q58 42 62 30 Q64 18 74 14 L88 17 L80 21 L70 23','M72 14 L66 4','M52 42 Q38 20 14 4 Q20 17 27 20 Q27 28 35 30 Q37 38 50 41','M14 4 L29 21 M14 4 L37 31','M104 68 Q106 48 124 44 Q142 48 144 68','M112 22 L114 9 L119 16 L124 6 L129 16 L134 9 L136 22'].map((d,i)=><g key={i}><path d={d} fill="none" stroke={P.stoneDeep} strokeWidth={i===1||i===3||i===5?4:6} strokeLinecap="round" strokeLinejoin="round"/><path d={d} fill="none" stroke={P.metalLight} strokeWidth={1.4} transform="translate(1.4 2)" opacity=".8"/></g>)}
    <circle cx={124} cy={32} r={8.5} fill="none" stroke={P.stoneDeep} strokeWidth={6}/>
   </g>
   <path d={'M-10 -22'+Array.from({length:12},(_,i)=>` L${-10+(i+1)*6} ${-22+(i%2?-2:2)}`).join('')+' L62 -13'+Array.from({length:12},(_,i)=>` L${62-(i+1)*6} ${-13+(i%2?2:-1)}`).join('')+'Z'} fill={P.metalLight} {...stroke}/>
   <circle cx={70} cy={-74} r={20} fill={LAMP_GLOW} opacity=".25"/><path d="M74 -62h-6v-8" stroke={P.ink} strokeWidth={2} fill="none"/><path d="M68 -82c-4 5 -3 9 0 10c3 -1 4 -5 0 -10Z" fill={LAMP_GLOW}/>
  </g>;
  case 'arch':{const cx=50,base=-72,ri=36,ro=60,vs=.8,n=9,blocks=[];
   for(let i=0;i<n;i++){if(i===5||i===6)continue;const a0=Math.PI*(1-i/n),a1=Math.PI*(1-(i+1)/n),r=ro+(i%2?4:-2);
    blocks.push(<polygon key={i} points={[[ri,a0],[r,a0],[r,a1],[ri,a1]].map(([rr,a])=>`${cx+rr*Math.cos(a)},${base-rr*vs*Math.sin(a)}`).join(' ')} fill={i%2?P.stoneLight:P.stone} {...stroke}/>)}
   return <g>{shadow(20,7)}{shadow(20,7,100)}
    <rect x={-12} y={base} width={26} height={-base+2} fill={P.stone} {...stroke}/><Courses x={-12} y={base} w={26} h={-base+2} rows={4}/>
    <rect x={86} y={base} width={26} height={-base+2} fill={P.stone} {...stroke}/><Courses x={86} y={base} w={26} h={-base+2} rows={4} seed={2}/>
    {blocks}
   </g>;}
  case 'rubble':return <g>{shadow(24,7)}<g transform="rotate(-10)"><path d="M-20 0l3 -10h18l3 10Z" fill={P.stone} {...stroke}/></g><g transform="rotate(12 10 0)"><path d="M2 2l3 -12h16l2 12Z" fill={P.stoneLight} {...stroke}/></g><path d="M-6 -10l3 -8h12l2 8Z" fill={P.stone} {...stroke}/></g>;
  case 'cage-empty':return <g>{shadow(10,4)}<Cage lit={false}/></g>;
  case 'cage-lit':return <g>{shadow(10,4)}<Cage lit/></g>;
  case 'crates':return <g>{shadow(24,8)}
   <rect x={-20} y={-30} width={40} height={32} fill={P.barkLight} {...stroke}/><rect x={-20} y={-30} width={40} height={8} fill={SALT} opacity=".55"/><path d="M0 -30v32" stroke={P.ink} strokeOpacity=".5" strokeWidth={2}/>
   <rect x={-12} y={-50} width={26} height={20} fill={P.barkLight} {...stroke}/>
  </g>;
  case 'bollard':return <g>{shadow(14,5)}
   <rect x={-8} y={-26} width={16} height={28} rx={4} fill={P.stoneDeep} {...stroke}/><ellipse cx={0} cy={-26} rx={10} ry={4} fill={P.stoneDark} {...stroke}/>
   <path d="M-8 -16q-10 4 -14 14" fill="none" stroke={P.bark} strokeWidth={3}/><ellipse cx={12} cy={-2} rx={9} ry={3.5} fill="none" stroke={P.bark} strokeWidth={3}/>
  </g>;
  case 'quay':return <g>
   <rect x={-25} y={-48} width={50} height={50} fill={P.stone} {...stroke}/><Courses x={-25} y={-48} w={50} h={50} rows={3}/>
   <rect x={-25} y={-54} width={50} height={7} fill={P.stoneLight} {...stroke}/>
   <path d="M-25 -62h50M-14 -54v-8M10 -54v-8" stroke={P.stoneDeep} strokeWidth={2.4}/>
  </g>;
  case 'stairs':{const steps=5,run=8,rise=9.6;
   const d=`M-24 2 `+Array.from({length:steps},(_,i)=>`V${2-rise*(i+1)} H${-24+run*(i+1)} `).join('')+'H25 V2Z';
   return <g>
    <rect x={-25} y={-48} width={50} height={50} fill={P.stoneDark} {...stroke}/>
    <path d={d} fill={P.stone} {...stroke}/>
    {Array.from({length:steps},(_,i)=><path key={i} d={`M${-24+run*i} ${2-rise*(i+1)}h${run}`} stroke={SALT} strokeWidth={2.5} strokeLinecap="round"/>)}
    <rect x={16} y={-54} width={9} height={6} fill={P.stoneLight} {...stroke}/>
    <path d="M-20 -14 L16 -60 H25" fill="none" stroke={P.stoneDeep} strokeWidth={2.4}/>
   </g>;}
 }
}

/** A landmark seen from above on the tactical map, in tile-local units. */
export function FlatSetPiece({prop}:{prop:SetPieceProp}){
 switch(prop){
  case 'span':return null;
  case 'shop':return <g><rect x={4} y={6} width={92} height={38} fill={P.stoneDeep} {...stroke}/><path d="M4 25h92" stroke={P.stoneLight} strokeWidth={2}/></g>;
  case 'stall':case 'stall-skew':return <g transform={prop==='stall-skew'?'rotate(6 50 25)':undefined}><rect x={4} y={8} width={92} height={34} fill={prop==='stall'?P.flower:P.accent} {...stroke}/>{[1,2,3,4,5,6].map(i=><path key={i} d={`M${4+i*13} 8v34`} stroke={P.ink} strokeOpacity=".2" strokeWidth={1.5}/>)}</g>;
  case 'salt-stall':return <g><rect x={8} y={10} width={34} height={24} fill={P.flowerLight} {...stroke}/><rect x={8} y={34} width={34} height={8} fill={P.barkLight} {...stroke}/>{[14,22,30,36].map(x=><path key={x} d={`M${x} 38h2`} stroke={SALT} strokeWidth={2}/>)}</g>;
  case 'oil-cart':return <g><rect x={8} y={14} width={84} height={22} fill={P.bark} {...stroke}/>{[24,50,76].map(x=><circle key={x} cx={x} cy={25} r={9} fill={P.barkLight} {...stroke}/>)}<path d="M8 20h-8M8 30h-8" stroke={P.bark} strokeWidth={3}/></g>;
  case 'lamp':return <g><circle cx={25} cy={25} r={22} fill={LAMP_GLOW} opacity=".25"/><rect x={19} y={19} width={12} height={12} fill={LAMP} {...stroke}/></g>;
  case 'gate-left':return <g><rect x={13} y={13} width={24} height={24} fill={P.stone} {...stroke}/><path d="M37 21h22v8H37" fill={P.stoneLight} {...stroke}/></g>;
  case 'gate-right':return <rect x={15} y={15} width={20} height={20} fill={P.stone} {...stroke}/>;
  case 'gate-rubble':case 'rubble':return <g fill={P.stone} {...stroke}><path d="m8 30 6-12 14 2 2 12-14 4Z"/><path d="m28 14 10-4 6 8-8 6Z" fill={P.stoneLight}/></g>;
  case 'masonry':case 'quay':return <g><rect x={2} y={10} width={46} height={30} fill={P.stone} {...stroke}/><path d="M2 25h46M18 10v15M34 25v15" stroke={P.stoneDark} strokeWidth={1.2}/></g>;
  case 'carving':return <g><rect x={2} y={10} width={96} height={30} fill={P.stone} {...stroke}/><path d="M18 30q14 -12 26 -14l8 -6M70 32v-12m-6 0h12" fill="none" stroke={P.stoneDeep} strokeWidth={3} strokeLinecap="round"/></g>;
  case 'arch':return <g><rect x={6} y={12} width={26} height={26} fill={P.stone} {...stroke}/><rect x={118} y={12} width={26} height={26} fill={P.stone} {...stroke}/><path d="M32 25q43 -22 86 0" fill="none" stroke={P.stoneDark} strokeWidth={6} strokeDasharray="30 12 60"/></g>;
  case 'cage-empty':case 'cage-lit':return <g>{prop==='cage-lit'?<circle cx={25} cy={25} r={20} fill={LENS} opacity=".35"/>:null}<rect x={15} y={15} width={20} height={20} fill={prop==='cage-lit'?LENS:'none'} stroke={P.stoneDeep} strokeWidth={3}/>{prop==='cage-empty'?<path d="M35 15l8 -3M35 35l8 3" stroke={BRASS} strokeWidth={2}/>:null}</g>;
  case 'crates':return <g><rect x={8} y={8} width={34} height={34} fill={P.barkLight} {...stroke}/><path d="M8 8l34 34M42 8 8 42" stroke={P.bark} strokeWidth={1.5}/></g>;
  case 'bollard':return <g><circle cx={25} cy={25} r={9} fill={P.stoneDeep} {...stroke}/><circle cx={36} cy={34} r={6} fill="none" stroke={P.bark} strokeWidth={2.5}/></g>;
  case 'stairs':return <g><rect x={4} y={4} width={42} height={42} fill={P.stone} {...stroke}/>{[12,20,28,36].map(y=><path key={y} d={`M4 ${y}h42`} stroke={P.stoneDark} strokeWidth={1.5}/>)}</g>;
 }
}

/** Marks painted on walkable ground, in tile-local units; the same drawing serves the flat board and the depth ground plane. */
export function GroundMarkArt({mark,seed=0}:{mark:GroundMark;seed?:number}){
 switch(mark){
  case 'cobble':return <g fill="none" stroke={P.roadDetail} strokeWidth={1.3}>{[[10,12],[30,10],[20,28],[40,30],[12,42],[34,44]].map(([x,y],i)=><ellipse key={i} cx={(x+seed*3)%46+2} cy={y} rx={5} ry={3.5}/>)}</g>;
  case 'groove':return <path d="M17 0v50M33 0v50" stroke={P.stoneDark} strokeOpacity=".55" strokeWidth={3}/>;
  case 'deck':return <g stroke={P.bark} strokeOpacity=".7" strokeWidth={1.2}><rect width={50} height={50} fill={P.barkLight}/><path d="M0 12.5h50M0 25h50M0 37.5h50"/><path d={seed%2?'M18 0v12.5M40 12.5v12.5M10 25v12.5M30 37.5v12.5':'M34 0v12.5M12 12.5v12.5M38 25v12.5M20 37.5v12.5'}/></g>;
  case 'loading':return <g stroke={SALT} strokeWidth={3} fill="none" opacity=".85"><path d="M4 14V4h10M36 4h10v10M46 36v10H36M14 46H4V36"/></g>;
  case 'glass':return <g><path d="M20 30l12 -4l-4 -10Z" fill={LENS} stroke={P.stoneDark} strokeWidth={1}/><path d="M24 26l4 -3" stroke={P.metalLight} strokeWidth={1}/></g>;
 }
}

/** Lamps that light the ground around them, as ground-plane glows in tile-local units of their own tile. */
export function GroundLight({prop}:{prop:SetPieceProp}){
 if(prop==='lamp')return <g><circle cx={45} cy={10} r={80} fill={LAMP_GLOW} opacity=".09"/><circle cx={40} cy={15} r={50} fill={LAMP_GLOW} opacity=".1"/><circle cx={30} cy={20} r={26} fill={LAMP_GLOW} opacity=".12"/></g>;
 if(prop==='cage-lit')return <g><circle cx={25} cy={40} r={46} fill={LENS} opacity=".14"/><circle cx={25} cy={40} r={24} fill={LENS} opacity=".16"/></g>;
 if(prop==='carving')return <circle cx={75} cy={45} r={40} fill={LAMP_GLOW} opacity=".1"/>;
 return null;
}
