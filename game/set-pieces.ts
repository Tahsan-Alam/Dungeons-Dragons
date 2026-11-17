import type {GameState,GroundMark,SetPieceProp,Tile} from './types.ts';
import {builtInTale} from './lore.ts';
import type {TaleId} from './presets.ts';

/* Authored first chapters of the three built-in tales, from the approved World page samples (design canvas,
   version 113): Starfall Market, the broken arch and the lantern pier. Each layout replaces the generated
   interior of chapter I; its props are walls, so movement, line of sight and map validation treat them like
   any other wall. Seeded generation still runs first, so dice and the random sequence are unchanged. */

export const SET_PIECE_PROPS:readonly SetPieceProp[]=['span','shop','stall','salt-stall','stall-skew','oil-cart','lamp','gate-left','gate-right','gate-rubble','masonry','carving','arch','rubble','cage-empty','cage-lit','crates','bollard','quay','stairs'];
export const GROUND_MARKS:readonly GroundMark[]=['cobble','groove','deck','loading','glass'];
export const isSetPieceProp=(d:Tile['decoration']):d is SetPieceProp=>!!d&&(SET_PIECE_PROPS as readonly string[]).includes(d);
export const isGroundMark=(d:Tile['decoration']):d is GroundMark=>!!d&&(GROUND_MARKS as readonly string[]).includes(d);
/** How many tiles wide a prop is drawn, from its left tile. The arch's middle tile is its open, walkable gateway. */
export const PROP_WIDTH:Partial<Record<SetPieceProp,number>>={shop:2,stall:2,'stall-skew':2,'oil-cart':2,carving:2,arch:3};

type Cell=[x:number,y:number];
interface SetPiece {
 /** Interior rectangle that is reset before the layout is drawn. */
 clear:{x0:number;y0:number;x1:number;y1:number;kind:Tile['kind'];decoration?:Tile['decoration']};
 ground:{cells:Cell[];kind:Tile['kind'];mark?:GroundMark}[];
 props:{at:Cell;prop:SetPieceProp}[];
 /** Natural walls drawn after clearing (forest edge, rocks). */
 walls?:{cells:Cell[];decoration:Tile['decoration']}[];
 exit:{x:number;y:number};chest:{x:number;y:number};
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

/** What ground a tile shows under its prop or mark: a prop stands on the ground in front of it, and the loading
    square and the glass shard lie on pier planks. Presentation only; movement uses the tile's own kind. */
export function groundOf(game:GameState,tile:Tile):{kind:Tile['kind'];base?:GroundMark;mark?:GroundMark}{
 if(isSetPieceProp(tile.decoration)){
  const front=game.tiles[(tile.y+1)*game.width+tile.x];
  if(front?.kind==='path'){const m=front.decoration;return {kind:'path',base:m==='loading'||m==='glass'?'deck':isGroundMark(m)?m:undefined};}
  return {kind:tile.kind==='wall'?'grass':tile.kind};
 }
 if(tile.decoration==='loading'||tile.decoration==='glass')return {kind:tile.kind,base:'deck',mark:tile.decoration};
 return {kind:tile.kind,base:isGroundMark(tile.decoration)?tile.decoration:undefined};
}

/** The authored layout for this chapter, if it has one: chapter I of a built-in tale in a current game. */
export function setPieceFor(game:GameState):TaleId|undefined {
 if((game.lore??0)<1||game.scene!==0)return undefined;
 return builtInTale(game.options.creation?.story);
}

export function applySetPiece(game:GameState,id:TaleId){
 const piece=SET_PIECES[id],at=(x:number,y:number)=>game.tiles[y*game.width+x];
 const set=(x:number,y:number,kind:Tile['kind'],decoration?:Tile['decoration'])=>{const tile=at(x,y);if(!tile)return;tile.kind=kind;if(decoration)tile.decoration=decoration;else delete tile.decoration;};
 const c=piece.clear;
 for(const [x,y] of rect(c.x0,c.y0,c.x1,c.y1))set(x,y,c.kind,c.decoration);
 for(const w of piece.walls??[])for(const [x,y] of w.cells)set(x,y,'wall',w.decoration);
 for(const g of piece.ground)for(const [x,y] of g.cells)set(x,y,g.kind,g.mark);
 for(const p of piece.props)set(p.at[0],p.at[1],'wall',p.prop);
 game.exit={...piece.exit};game.chest={...piece.chest,opened:false};
}
