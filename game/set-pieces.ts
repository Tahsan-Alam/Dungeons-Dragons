import type {GameState,GroundMark,SetPieceProp,Tile} from './types.ts';
import {builtInTale} from './lore.ts';
import type {TaleId} from './presets.ts';

/* Authored first chapters of the three built-in tales, from the approved World page samples (design canvas,
   version 113): Starfall Market, the broken arch and the lantern pier. Each layout replaces the generated
   interior of chapter I; its props are walls, so movement, line of sight and map validation treat them like
   any other wall. Seeded generation still runs first, so dice and the random sequence are unchanged. */

export const SET_PIECE_PROPS:readonly SetPieceProp[]=['span','shop','stall','salt-stall','stall-skew','oil-cart','lamp','gate-left','gate-right','gate-rubble','masonry','carving','arch','rubble','cage-empty','cage-lit','crates','bollard','quay','stairs',
 'fence','waymark-lit','waymark-dark','standing-stone','shrine','road-on','threshold','wolf-eyes'];
export const GROUND_MARKS:readonly GroundMark[]=['cobble','groove','deck','loading','glass','hollow','refuge','flagstone','trampled'];
export const isSetPieceProp=(d:Tile['decoration']):d is SetPieceProp=>!!d&&(SET_PIECE_PROPS as readonly string[]).includes(d);
export const isGroundMark=(d:Tile['decoration']):d is GroundMark=>!!d&&(GROUND_MARKS as readonly string[]).includes(d);
/** How many tiles wide a prop is drawn, from its left tile. The arch's middle tile is its open, walkable gateway. */
export const PROP_WIDTH:Partial<Record<SetPieceProp,number>>={shop:2,stall:2,'stall-skew':2,'oil-cart':2,carving:2,arch:3,shrine:3};
/** Props that stand on the forest floor or flagstones, not on the ground in front of them. */
const STANDS_ON_OWN_GROUND:readonly SetPieceProp[]=['fence','waymark-lit','waymark-dark','standing-stone','shrine'];

type Cell=[x:number,y:number];
export interface SetPiece {
 /** Interior rectangle that is reset before the layout is drawn. */
 clear:{x0:number;y0:number;x1:number;y1:number;kind:Tile['kind'];decoration?:Tile['decoration']};
 ground:{cells:Cell[];kind:Tile['kind'];mark?:GroundMark}[];
 props:{at:Cell;prop:SetPieceProp}[];
 /** Natural walls drawn after clearing (forest edge, rocks). */
 walls?:{cells:Cell[];decoration:Tile['decoration']}[];
 exit:{x:number;y:number};chest:{x:number;y:number};
 /** Where the chapter's Keeper stands at the start, whatever the party's size. */
 keeper?:{x:number;y:number};
}
const rect=(x0:number,y0:number,x1:number,y1:number):Cell[]=>{const out:Cell[]=[];for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)out.push([x,y]);return out};
const wide=(x:number,y:number,prop:SetPieceProp,width=PROP_WIDTH[prop]??1)=>[{at:[x,y] as Cell,prop},...Array.from({length:width-1},(_,i)=>({at:[x+i+1,y] as Cell,prop:'span' as const}))];

export const SET_PIECES:Record<TaleId,SetPiece>={
 // The square: shop and stalls on the far side, the empty salt stall among them, the oil cart where the party
 // arrives, and the last lamp lighting a cobbled way to the broken gateway at the far right.
 lantern:{
  clear:{x0:1,y0:1,x1:18,y1:12,kind:'grass'},
  walls:[{cells:rect(1,1,18,1),decoration:'tree'}],
  ground:[{cells:rect(4,3,16,9),kind:'path',mark:'cobble'},{cells:rect(1,6,18,8),kind:'path'},{cells:rect(17,3,17,5),kind:'path',mark:'cobble'},{cells:[[17,2]],kind:'path'}],
  props:[...wide(2,2,'shop'),...wide(5,2,'stall'),{at:[8,2],prop:'salt-stall'},...wide(10,2,'stall-skew'),{at:[15,3],prop:'lamp'},
   {at:[16,2],prop:'gate-left'},{at:[18,2],prop:'gate-right'},{at:[18,4],prop:'gate-rubble'},...wide(6,10,'oil-cart')],
  exit:{x:17,y:2},chest:{x:10,y:7}},
 // The broken arch stands on the far side with the carved wall beside it; the retaining wall breaks behind the
 // opening, and cart grooves run up through it. Fallen blocks lie beside the right pillar.
 crown:{
  clear:{x0:3,y0:1,x1:16,y1:11,kind:'grass'},
  walls:[{cells:[...rect(1,1,9,1),...rect(11,1,18,1)],decoration:'masonry'}],
  ground:[{cells:rect(1,6,18,8),kind:'path'},{cells:[[10,1],...rect(10,2,10,8)],kind:'path',mark:'groove'}],
  props:[...wide(7,2,'carving'),{at:[9,2],prop:'arch'},{at:[11,2],prop:'span'},{at:[12,2],prop:'masonry'},{at:[12,3],prop:'rubble'}],
  exit:{x:10,y:2},chest:{x:10,y:7}},
 // The pier deck over open water: the stripped cage with a shard at its foot, the working lens, crates as cover
 // beside a painted loading square, a mooring post at the front edge, and quay stairs at the far right.
 salt:{
  clear:{x0:1,y0:1,x1:18,y1:12,kind:'water'},
  ground:[{cells:rect(1,2,18,11),kind:'path',mark:'deck'},{cells:[[6,3]],kind:'path',mark:'glass'},{cells:[[11,3],[12,3]],kind:'path',mark:'loading'}],
  props:[{at:[5,2],prop:'cage-empty'},{at:[13,2],prop:'cage-lit'},{at:[8,5],prop:'crates'},{at:[8,6],prop:'crates'},{at:[2,11],prop:'bollard'},
   {at:[16,1],prop:'quay'},{at:[17,1],prop:'quay'},{at:[18,1],prop:'stairs'}],
  exit:{x:18,y:2},chest:{x:10,y:7}},
};

const trees=(cells:Cell[])=>({cells,decoration:'tree' as const});
/** Chapters II and III of the Lantern Road, from the approved World page boards (design canvas, version 125). The
    tile data is the same that drew the boards' overhead plans and was checked there against the game's movement. */
export const LATER_PIECES:Partial<Record<TaleId,Record<number,SetPiece>>>={
 lantern:{
  // The forest road: raised cobbles three rows deep, a split-rail fence with one gap, the lit and the dark waymark,
  // low water on both sides, the chest on the road and the cobbles running out between two trunks.
  1:{clear:{x0:1,y0:1,x1:18,y1:12,kind:'grass'},
   walls:[trees([...rect(1,1,18,1),[1,2],[2,2],[3,2],[8,2],[13,2],[17,2],[18,2],[16,3],[2,12],[5,12],[9,12],[14,12],[18,12]])],
   ground:[{cells:rect(1,6,18,8),kind:'path',mark:'cobble'},
    {cells:[...rect(5,3,7,4),[9,2],[10,2],[9,3],[10,3],[10,9],[11,9],[16,9],[17,9],[6,10],[7,10],[7,11],[11,10],[12,10],[11,11]],kind:'water',mark:'hollow'},
    {cells:[[12,5],[12,4],[12,3]],kind:'grass',mark:'trampled'}],
   props:[{at:[9,5],prop:'waymark-lit'},{at:[10,5],prop:'fence'},{at:[11,5],prop:'fence'},{at:[13,5],prop:'fence'},{at:[14,5],prop:'fence'},{at:[16,5],prop:'waymark-dark'},
    {at:[13,9],prop:'fence'},{at:[14,9],prop:'fence'},{at:[19,6],prop:'road-on'},{at:[19,7],prop:'road-on'},{at:[19,8],prop:'road-on'},
    // Beyond the dark waymark the wolf watches from between two trunks: seen, never fought here.
    {at:[17,2],prop:'wolf-eyes'}],
   exit:{x:18,y:7},chest:{x:13,y:7}},
  // The lantern shrine: the turnoff's cobbles give onto flagstones; the shrine at the back with its six lit refuge
  // tiles before it and the chest inside; four standing stones; a threshold out through the trees on the right.
  2:{clear:{x0:1,y0:1,x1:18,y1:12,kind:'grass'},
   walls:[trees([...rect(1,1,14,1),[18,1],[2,2],[3,2],[5,2],[6,2],[1,3],[4,3],[2,11],[1,12],[5,12],[6,11],[8,12],[12,12],[17,12],[18,12],[18,11],[18,10],[18,2],[18,3]])],
   ground:[{cells:[...rect(7,2,17,11),...rect(18,4,18,9)],kind:'grass',mark:'flagstone'},{cells:rect(1,6,7,8),kind:'path',mark:'cobble'},{cells:rect(15,2,17,3),kind:'path',mark:'refuge'}],
   props:[...wide(15,1,'shrine'),{at:[9,3],prop:'standing-stone'},{at:[12,2],prop:'standing-stone'},{at:[10,8],prop:'standing-stone'},{at:[13,9],prop:'standing-stone'},
    {at:[19,6],prop:'threshold'},{at:[19,7],prop:'threshold'},{at:[19,8],prop:'threshold'}],
   exit:{x:18,y:7},chest:{x:16,y:2},keeper:{x:13,y:5}},
 },
};
/** Games stamped from this edition get the authored later chapters (and the shrine's light in Lantern Hunt). */
export const LATER_PIECES_EDITION=4;

/** The shrine's refuge: lit tiles where Lantern Hunt cannot go. */
export const isRefuge=(game:GameState,x:number,y:number)=>game.tiles[y*game.width+x]?.decoration==='refuge';
/** Where the light ends: tile edges between a refuge tile and any other, in board units (50 per tile). */
export function refugeEdges(game:GameState):[number,number,number,number][]{
 const out:[number,number,number,number][]=[];
 for(const t of game.tiles)if(t.decoration==='refuge'){
  const X=t.x*50,Y=t.y*50,lit=(x:number,y:number)=>isRefuge(game,x,y),above=game.tiles[(t.y-1)*game.width+t.x];
  if(!lit(t.x,t.y-1)&&above?.decoration!=='shrine'&&above?.decoration!=='span')out.push([X,Y,X+50,Y]);
  if(!lit(t.x,t.y+1))out.push([X,Y+50,X+50,Y+50]);
  if(!lit(t.x-1,t.y))out.push([X,Y,X,Y+50]);
  if(!lit(t.x+1,t.y))out.push([X+50,Y,X+50,Y+50]);
 }
 return out;
}

/** What ground a tile shows under its prop or mark: a prop stands on the ground in front of it, and the loading
    square and the glass shard lie on pier planks. Presentation only; movement uses the tile's own kind. */
export function groundOf(game:GameState,tile:Tile):{kind:Tile['kind'];base?:GroundMark;mark?:GroundMark}{
 // Low water sits in the forest floor: its own art draws the bank and the water. Movement still treats it as water.
 if(tile.decoration==='hollow')return {kind:'grass',base:'hollow'};
 if(tile.decoration==='road-on')return {kind:'path',base:'cobble'};
 if(tile.decoration==='threshold')return {kind:'grass',base:'flagstone'};
 if(isSetPieceProp(tile.decoration)&&STANDS_ON_OWN_GROUND.includes(tile.decoration)){
  // Stand on flagstones where the clearing has them, otherwise on the forest floor.
  const near=[[0,1],[1,0],[-1,0],[0,-1]].map(([dx,dy])=>game.tiles[(tile.y+dy)*game.width+tile.x+dx]?.decoration);
  return {kind:'grass',base:near.some(d=>d==='flagstone'||d==='refuge'||d==='threshold')?'flagstone':undefined};
 }
 if(isSetPieceProp(tile.decoration)){
  const front=game.tiles[(tile.y+1)*game.width+tile.x];
  if(front?.kind==='path'){const m=front.decoration;return {kind:'path',base:m==='loading'||m==='glass'?'deck':isGroundMark(m)?m:undefined};}
  return {kind:tile.kind==='wall'?'grass':tile.kind};
 }
 if(tile.decoration==='loading'||tile.decoration==='glass')return {kind:tile.kind,base:'deck',mark:tile.decoration};
 return {kind:tile.kind,base:isGroundMark(tile.decoration)?tile.decoration:undefined};
}

/** The authored layout for this chapter, if it has one. Chapter I of each built-in tale from lore edition 1; the
    Lantern Road's later chapters from LATER_PIECES_EDITION, so saves made before them keep their generated maps. */
export function setPieceFor(game:GameState):SetPiece|undefined {
 const tale=builtInTale(game.options.creation?.story),lore=game.lore??0;
 if(!tale)return undefined;
 if(game.scene===0)return lore>=1?SET_PIECES[tale]:undefined;
 return lore>=LATER_PIECES_EDITION?LATER_PIECES[tale]?.[game.scene]:undefined;
}

export function applySetPiece(game:GameState,piece:SetPiece){
 const at=(x:number,y:number)=>game.tiles[y*game.width+x];
 const set=(x:number,y:number,kind:Tile['kind'],decoration?:Tile['decoration'])=>{const tile=at(x,y);if(!tile)return;tile.kind=kind;if(decoration)tile.decoration=decoration;else delete tile.decoration;};
 const c=piece.clear;
 for(const [x,y] of rect(c.x0,c.y0,c.x1,c.y1))set(x,y,c.kind,c.decoration);
 for(const w of piece.walls??[])for(const [x,y] of w.cells)set(x,y,'wall',w.decoration);
 for(const g of piece.ground)for(const [x,y] of g.cells)set(x,y,g.kind,g.mark);
 for(const p of piece.props)set(p.at[0],p.at[1],'wall',p.prop);
 game.exit={...piece.exit};game.chest={...piece.chest,opened:false};
}
