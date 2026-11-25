'use client';
import {memo} from 'react';
import type {Actor,Biome,GameState,SetPieceProp,Tile} from '../../game/types';
import {ART_PALETTE as P,TREE_TONES} from './artPalette';
import {ActorPortrait} from './ActorArt';
import {FlatSetPiece,GroundLight,GroundMarkArt,RefugeEdges} from './SetPieceArt';
import {groundOf,isGroundMark,isSetPieceProp,refugeEdges} from '../../game/set-pieces';
import {NightVeil} from './NightVeil';
import './tactical-art.css';

/* The tactical map: the same board seen from above, painted like the scene. Light falls from the top left, so
   raised things (rock, trees, landmarks) cast their shadow down and to the right. Ground that continues into the
   next tile joins it; only open edges are rounded. Nothing here changes what a tile is or what can stand on it. */

const T=50;
type Sides={n:boolean;e:boolean;s:boolean;w:boolean};
const key=(x:number,y:number)=>`${x},${y}`;

/** A tile-sized shape whose corners are rounded only where both neighbouring sides are open; `inset` pulls open sides in. */
export function joinedTile(sides:Sides,radius:number,inset=0){
 const l=sides.w?0:inset,r=T-(sides.e?0:inset),t=sides.n?0:inset,b=T-(sides.s?0:inset);
 const tl=!sides.n&&!sides.w?radius:0,tr=!sides.n&&!sides.e?radius:0,br=!sides.s&&!sides.e?radius:0,bl=!sides.s&&!sides.w?radius:0;
 return `M${l+tl} ${t}H${r-tr}${tr?`Q${r} ${t} ${r} ${t+tr}`:''}V${b-br}${br?`Q${r} ${b} ${r-br} ${b}`:''}H${l+bl}${bl?`Q${l} ${b} ${l} ${b-bl}`:''}V${t+tl}${tl?`Q${l} ${t} ${l+tl} ${t}`:''}Z`;
}

const ROCK:Record<Biome,{top:string;side:string;edge:string}>={
 woodland:{top:P.stone,side:P.stoneDark,edge:P.stoneDeep},
 ruins:{top:P.stoneLight,side:P.stone,edge:P.stoneDark},
 coast:{top:P.stone,side:P.stoneDeep,edge:P.stoneDeep},
};

/** A bare wall tile: part of one rock mass with its wall neighbours. */
function Wall({sides,seed,biome}:{sides:Sides;seed:number;biome:Biome}){
 const c=ROCK[biome];
 return <g>
  <path d={joinedTile(sides,12,3)} fill={c.side}/>
  <path d={joinedTile(sides,10,7)} fill={c.top} transform="translate(-1.5 -2)"/>
  {biome==='ruins'
   ?<path d={seed%2?'M-1 17h52M-1 34h52M20 0v17M38 17v17M12 34v17':'M-1 16h52M-1 33h52M30 0v16M14 16v17M34 33v17'} fill="none" stroke={c.edge} strokeOpacity=".35" strokeWidth={1.2} transform="translate(-1.5 -2)"/>
   :biome==='coast'
   ?<path d={seed%2?'M12 16l9 5 4 9M33 12l-3 8M30 34l9-3':'M15 30l8-6 10 2M34 14l-5 7M14 12l5 4'} fill="none" stroke={c.edge} strokeOpacity=".45" strokeWidth={1.3} strokeLinecap="round"/>
   :<g>
    <path d={seed%2?'M14 20l7 6M30 14l5 9':'M18 30l8-5M31 30l4-7'} fill="none" stroke={c.edge} strokeOpacity=".4" strokeWidth={1.3} strokeLinecap="round"/>
    {seed%3!==1?<ellipse cx={seed%2?16:32} cy={seed%2?13:16} rx={7} ry={4} fill={P.leaf} opacity=".55"/>:null}
   </g>}
 </g>;
}

/** A tree seen from above: a shadow on the ground, a crown of overlapping leaves and sunlit tops. */
export function Canopy({x,y,size=1,tone=0}:{x:number;y:number;size?:number;tone?:number}){
 const leaf=TREE_TONES[Math.abs(tone)%TREE_TONES.length],r=17*size;
 return <g className="tactical-tree" transform={`translate(${x} ${y})`} aria-hidden="true">
  <ellipse cx={r*.32} cy={r*.42} rx={r*1.05} ry={r} fill={P.ink} opacity=".2"/>
  <circle r={r} fill={P.leafDark}/>
  <circle cx={-r*.28} cy={-r*.2} r={r*.72} fill={leaf}/>
  <circle cx={r*.3} cy={-r*.05} r={r*.55} fill={leaf}/>
  <circle cx={-r*.1} cy={r*.3} r={r*.5} fill={leaf}/>
  <circle cx={-r*.38} cy={-r*.36} r={r*.3} fill={P.leafLight} opacity=".75"/>
  <circle cx={r*.22} cy={-r*.28} r={r*.18} fill={P.leafLight} opacity=".55"/>
 </g>;
}

/** Small things on open ground, from above. */
function Decoration({tile,seed}:{tile:Tile;seed:number}){
 switch(tile.decoration){
  case 'flower':return <g>{[[16,22,3],[31,34,2.6],[24,30,2]].map(([x,y,r],i)=><g key={i}><circle cx={x} cy={y} r={r+1.6} fill={P.leaf} opacity=".5"/><circle cx={x} cy={y} r={r} fill={i===1?P.flowerLight:P.flower}/></g>)}</g>;
  case 'mushroom':return <g><ellipse cx={29} cy={36} rx={9} ry={4} fill={P.ink} opacity=".16"/><circle cx={26} cy={32} r={7} fill={P.mushroom}/><circle cx={24} cy={30} r={1.6} fill={P.flowerLight}/><circle cx={28} cy={34} r={1.2} fill={P.flowerLight}/><circle cx={36} cy={27} r={4} fill={P.mushroom}/></g>;
  case 'rock':return <g><path d="m17 34 3-14 15-2 7 11-6 10Z" fill={P.ink} opacity=".2" transform="translate(3 4)"/><path d="m15 32 4-14 15-2 7 11-7 10Z" fill={P.stoneDark}/><path d="m18 28 3-9 12-2 4 7-6 6Z" fill={P.stone}/></g>;
  case 'ruin':return <g><rect x={13} y={13} width={26} height={26} rx={3} fill={P.ink} opacity=".2" transform="translate(3 4)"/><rect x={12} y={12} width={26} height={26} rx={3} fill={P.stone}/><path d="M12 25h26M24 12v13M30 25v13" stroke={P.stoneDark} strokeOpacity=".5" strokeWidth={1.2}/><path d="m36 38 6 4-5 3" fill={P.stoneLight}/></g>;
  default:return null;
 }
}

const LAMP='#ffe7a0',LAMP_GLOW='#e8a840',SALT='#f4f1ea',DARK_GLASS='#39424a';
const edge={stroke:P.ink,strokeOpacity:.45,strokeWidth:1.2,strokeLinejoin:'round' as const};

/** Landmarks repainted from above; any other keeps its own flat drawing. Footprints match FlatSetPiece, tile-local. */
export function TacticalPiece({prop}:{prop:SetPieceProp}){
 switch(prop){
  // A roof seen from above: two slopes meeting at a ridge, the sunlit one paler.
  case 'shop':return <g><path d="M3 5h94v40H3Z" fill={P.stoneDark} {...edge}/><path d="M3 5h94v19H3Z" fill={P.stone}/><path d="M3 24h94" stroke={P.stoneDeep} strokeWidth={2}/>{[16,30,44,58,72,86].map(x=><path key={x} d={`M${x} 5v19M${x-7} 24v21`} stroke={P.stoneDeep} strokeOpacity=".3" strokeWidth={1}/>)}<rect x={70} y={28} width={10} height={10} fill={P.stoneDeep}/></g>;
  // Market awnings: striped cloth over the stall, a little sag at the front.
  case 'stall':case 'stall-skew':{const cloth=prop==='stall'?P.flower:P.accent;return <g transform={prop==='stall-skew'?'rotate(6 50 25)':undefined}><path d="M4 8h92v31q-23 5-46 0t-46 0Z" fill={P.flowerLight} {...edge}/>{[0,1,2,3,4,5].map(i=>i%2?null:<path key={i} d={`M${4+i*15.3} 8h15.3v${31+(i%3)}h-15.3Z`} fill={cloth}/>)}<path d="M4 39q23 5 46 0t46 0" fill="none" stroke={P.ink} strokeOpacity=".35" strokeWidth={1.2}/><path d="M4 8h92" stroke={P.metalLight} strokeOpacity=".5" strokeWidth={1.5}/></g>;}
  case 'salt-stall':return <g><rect x={8} y={9} width={34} height={30} rx={2} fill={P.barkLight} {...edge}/>{[[15,17],[25,15],[34,19],[19,29],[31,30]].map(([x,y],i)=><g key={i}><circle cx={x} cy={y} r={5} fill={P.bark}/><circle cx={x-.6} cy={y-.8} r={3.4} fill={SALT}/></g>)}</g>;
  // The oil cart from above: a plank bed, three barrel tops and its shafts.
  case 'oil-cart':return <g><path d="M8 20h-9M8 30h-9" stroke={P.bark} strokeWidth={3} strokeLinecap="round"/><rect x={6} y={10} width={88} height={30} rx={3} fill={P.bark} {...edge}/><path d="M6 20h88M6 30h88" stroke={P.ink} strokeOpacity=".2"/>{[24,50,76].map(x=><g key={x}><circle cx={x} cy={25} r={11} fill={P.barkLight} {...edge}/><circle cx={x} cy={25} r={7.5} fill="none" stroke={P.bark} strokeWidth={1.5}/><circle cx={x-3} cy={22} r={2} fill={P.metalLight} opacity=".6"/></g>)}</g>;
  case 'lamp':return <g><circle cx={25} cy={25} r={22} fill={LAMP_GLOW} opacity=".22"/><circle cx={25} cy={25} r={9} fill={P.stoneDeep} {...edge}/><circle cx={25} cy={25} r={5.5} fill={LAMP}/><circle cx={23.5} cy={23.5} r={2} fill="#fff"/></g>;
  case 'gate-left':return <g><rect x={11} y={11} width={28} height={28} rx={3} fill={P.stoneDark} {...edge}/><rect x={13} y={12} width={22} height={22} rx={2} fill={P.stone}/><path d="M39 20h22v10H39" fill={P.stoneLight} {...edge}/></g>;
  case 'gate-right':return <g><rect x={13} y={13} width={24} height={24} rx={3} fill={P.stoneDark} {...edge}/><rect x={15} y={14} width={18} height={18} rx={2} fill={P.stone}/></g>;
  case 'crates':return <g><rect x={7} y={7} width={36} height={36} rx={2} fill={P.bark} {...edge}/><rect x={10} y={9} width={30} height={30} fill={P.barkLight}/><path d="M10 19h30M10 29h30" stroke={P.bark} strokeWidth={1.4}/><path d="M10 9l30 30" stroke={P.bark} strokeOpacity=".7" strokeWidth={2}/></g>;
  case 'bollard':return <g><circle cx={25} cy={25} r={10} fill={P.stoneDeep} {...edge}/><circle cx={23.5} cy={23.5} r={6} fill={P.stoneDark}/><path d="M33 31q8 4 4 10t-10 0" fill="none" stroke={P.barkLight} strokeWidth={2.5} strokeLinecap="round"/></g>;
  case 'standing-stone':return <g><ellipse cx={25} cy={26} rx={14} ry={11} fill={P.stoneDark} {...edge}/><ellipse cx={23} cy={24} rx={10} ry={7.5} fill={P.stone}/><path d="M19 22q4-3 8 0" fill="none" stroke={P.leaf} strokeWidth={2.5} strokeLinecap="round" opacity=".7"/></g>;
  case 'waymark-lit':case 'waymark-dark':{const lit=prop==='waymark-lit';return <g>{lit?<circle cx={25} cy={25} r={24} fill={LAMP_GLOW} opacity=".25"/>:null}<rect x={14} y={14} width={22} height={22} rx={4} fill={P.stoneDark} {...edge}/><rect x={16} y={15} width={17} height={17} rx={3} fill={P.stone}/><circle cx={24.5} cy={23.5} r={5} fill={lit?LAMP:DARK_GLASS}/>{lit?<circle cx={23} cy={22} r={1.8} fill="#fff"/>:null}</g>;}
  default:return <FlatSetPiece prop={prop}/>;
 }
}

/** The ground, its marks and everything that rises from it, seen from above. */
export const TacticalTerrain=memo(function TacticalTerrain({game,grid}:{game:GameState;grid:boolean}){
 const biome=game.options.biome,w=game.width*T,h=game.height*T;
 const tiles=new Map(game.tiles.map(t=>[key(t.x,t.y),t]));
 const grounds=new Map(game.tiles.map(t=>[key(t.x,t.y),groundOf(game,t)]));
 const kindAt=(x:number,y:number)=>grounds.get(key(x,y))?.kind;
 // Bare walls and the rock or ruin walls that frame most boards are one joined mass of stone.
 const bare=(t:Tile|undefined)=>!!t&&t.kind==='wall'&&(!t.decoration||t.decoration==='rock'||t.decoration==='ruin');
 // Off the board counts as joined, so ground and rock run out under the frame instead of stopping short.
 const same=(x:number,y:number,test:(x:number,y:number)=>boolean)=>({n:y===0||test(x,y-1),e:x===game.width-1||test(x+1,y),s:y===game.height-1||test(x,y+1),w:x===0||test(x-1,y)});
 const base=biome==='ruins'?P.ruinGrass:biome==='coast'?P.coastGrass:P.grass;
 return <g className={`tactical-terrain tactical-${biome}`}>
  <rect width={w} height={h} fill={base}/>
  {/* Soft patches of lighter and darker growth, so open ground reads as painted rather than flat. */}
  {game.tiles.map(t=>{const s=(t.x*37+t.y*61)%13;return s<5?<ellipse key={`patch${t.x},${t.y}`} cx={t.x*T+10+s*6} cy={t.y*T+14+(s*7)%22} rx={24+s*2} ry={14+s} fill={s%2?P.leafLight:P.grassDetail} opacity={s%2?.16:.12}/>:null})}
  {game.tiles.map(t=>{
   const g=grounds.get(key(t.x,t.y))!,seed=(t.x*17+t.y*31)%11;
   const path=g.kind==='path',water=g.kind==='water';
   return <g key={`${t.x},${t.y}`} transform={`translate(${t.x*T} ${t.y*T})`}>
    {path?<><path d={joinedTile(same(t.x,t.y,(x,y)=>kindAt(x,y)==='path'),16,2)} fill={P.road}/>{seed<4?<path d={seed%2?'M12 15h5M33 34h7M28 12h3':'M30 13h6M11 36h5M22 26h3'} stroke={P.roadDetail} strokeWidth={1.6} strokeLinecap="round"/>:null}</>
     :water?<><path d={joinedTile(same(t.x,t.y,(x,y)=>kindAt(x,y)==='water'),16,0)} fill={P.shore}/><path d={joinedTile(same(t.x,t.y,(x,y)=>kindAt(x,y)==='water'),14,5)} fill={P.water}/><path d={seed%2?'M9 18q6-3 12 0t12 0M20 34q5-3 10 0':'M14 14q6-3 12 0M12 31q6-3 12 0t12 0'} fill="none" stroke={P.waterLight} strokeOpacity=".7" strokeWidth={1.3} strokeLinecap="round"/></>
     :g.kind==='grass'&&!t.decoration&&seed<2?<path d="m18 34-3-6m5 6 2-8m0 8 4-4" fill="none" stroke={P.grassDetail} strokeOpacity=".7" strokeWidth={1.4} strokeLinecap="round"/>:null}
    {g.base?<GroundMarkArt mark={g.base} seed={seed}/>:null}{g.mark?<GroundMarkArt mark={g.mark} seed={seed}/>:null}
   </g>;
  })}
  {game.tiles.map(t=>isSetPieceProp(t.decoration)?<g key={`light${t.x},${t.y}`} className="ground-light" transform={`translate(${t.x*T} ${t.y*T})`}><GroundLight prop={t.decoration}/></g>:null)}
  {game.tiles.map(t=>t.decoration&&!bare(t)&&!isSetPieceProp(t.decoration)&&!isGroundMark(t.decoration)&&t.decoration!=='tree'?<g key={`deco${t.x},${t.y}`} transform={`translate(${t.x*T} ${t.y*T})`}><Decoration tile={t} seed={(t.x*7+t.y*13)%5}/></g>:null)}
  <NightVeil game={game}/>
  <RefugeEdges edges={refugeEdges(game)}/>
  {/* Rock: every shadow first, so one wall never shades its neighbour. */}
  <g className="tactical-shadows" fill={P.ink} opacity=".24">{game.tiles.filter(bare).map(t=><path key={`shade${t.x},${t.y}`} transform={`translate(${t.x*T+5} ${t.y*T+6})`} d={joinedTile(same(t.x,t.y,(x,y)=>bare(tiles.get(key(x,y)))),12,3)}/>)}</g>
  <g className="tactical-walls">{game.tiles.filter(bare).map(t=><g key={`wall${t.x},${t.y}`} className="tactical-wall" transform={`translate(${t.x*T} ${t.y*T})`}><Wall sides={same(t.x,t.y,(x,y)=>bare(tiles.get(key(x,y))))} seed={(t.x*7+t.y*13)%5} biome={t.decoration==='ruin'&&biome!=='ruins'?'ruins':biome}/></g>)}</g>
  {game.tiles.map(t=>isSetPieceProp(t.decoration)?<g key={`piece${t.x},${t.y}`} className="tactical-piece" transform={`translate(${t.x*T} ${t.y*T})`}><TacticalPiece prop={t.decoration}/></g>:null)}
  {grid?<path d={[...Array(game.width+1)].map((_,x)=>`M${x*T} 0V${h}`).join('')+[...Array(game.height+1)].map((_,y)=>`M0 ${y*T}H${w}`).join('')} stroke={P.ink} strokeOpacity=".13" strokeWidth={1}/>:null}
  {game.tiles.filter(t=>t.decoration==='tree').map(t=>{const j=(t.x*13+t.y*7)%5;return <Canopy key={`tree${t.x}-${t.y}`} x={t.x*T+25+(j-2)*2.5} y={t.y*T+24+((j*3)%5-2)*2} size={1.4+(j%3)*.08} tone={t.x*2+t.y}/>})}
 </g>;
});

/** A figure on the tactical map: a round token cut from the character's own painting, ringed in their colour. */
export function TacticalToken({actor,biome,ring}:{actor:Actor;biome:Biome;ring:string}){
 const id=`token-${actor.id.replace(/[^a-zA-Z0-9_-]/g,'')}`;
 return <g className={`tactical-token${actor.enemy?' foe':''}`}>
  <circle cx={3} cy={4} r={20} fill={P.ink} opacity=".28"/>
  <circle r={20} fill={P.stoneDeep}/>
  <clipPath id={id}><circle r={17.5}/></clipPath>
  <g clipPath={`url(#${id})`}><svg x={-17.5} y={-17.5} width={35} height={35} overflow="hidden"><ActorPortrait actor={actor} biome={biome}/></svg></g>
  <circle r={18.6} fill="none" stroke={ring} strokeWidth={3}/>
  <circle r={20.4} fill="none" stroke={P.ink} strokeOpacity=".45" strokeWidth={1}/>
 </g>;
}
