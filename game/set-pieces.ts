import type {GameState,GroundMark,SetPieceProp,Tile} from './types.ts';
import {builtInTale,chapterPlace,LONG_PLACES_EDITION} from './lore.ts';
import type {TaleId} from './presets.ts';

/* Authored first chapters of the three built-in tales, from the approved World page samples (design canvas,
   version 113): Starfall Market, the broken arch and the lantern pier. Each layout replaces the generated
   interior of chapter I; its props are walls, so movement, line of sight and map validation treat them like
   any other wall. Seeded generation still runs first, so dice and the random sequence are unchanged. */

export const SET_PIECE_PROPS:readonly SetPieceProp[]=['span','shop','stall','salt-stall','stall-skew','oil-cart','lamp','gate-left','gate-right','gate-rubble','masonry','carving','arch','rubble','cage-empty','cage-lit','crates','bollard','quay','stairs',
 'fence','waymark-lit','waymark-dark','standing-stone','shrine','road-on','threshold','wolf-eyes',
 'parapet','banner','retaining','slope','pillar','treasury','crown','wall-torch','wall-banner','gatepost',
 'workshop','workshop-wide','workshop-narrow','workshop-counter','worktable','worktable-invoice','sandbin','rack','rack-marked','stairs-down',
 'pier','pier-repaired','pier-stump','niche','vault-door','sea-door','stairs-up',
 'bramble','moonwell','shelf','shelf-empty','lectern','orrery','wreck'];
export const GROUND_MARKS:readonly GroundMark[]=['cobble','groove','deck','loading','glass','hollow','refuge','flagstone','trampled','drop','rut','wind','ashlar','slate','tally','vault','grate','stones','pages','stars','steps','sand','bridge'];
export const isSetPieceProp=(d:Tile['decoration']):d is SetPieceProp=>!!d&&(SET_PIECE_PROPS as readonly string[]).includes(d);
export const isGroundMark=(d:Tile['decoration']):d is GroundMark=>!!d&&(GROUND_MARKS as readonly string[]).includes(d);
/** How many tiles wide a prop is drawn, from its left tile. The arch's middle tile is its open, walkable gateway. */
export const PROP_WIDTH:Partial<Record<SetPieceProp,number>>={shop:2,stall:2,'stall-skew':2,'oil-cart':2,carving:2,arch:3,shrine:3,treasury:3,
 workshop:2,'workshop-wide':2,'workshop-narrow':2,'workshop-counter':2,'vault-door':2,moonwell:2,orrery:2,wreck:3};
/** Props that stand on the forest floor or flagstones, not on the ground in front of them. */
const STANDS_ON_OWN_GROUND:readonly SetPieceProp[]=['fence','waymark-lit','waymark-dark','standing-stone','shrine'];
/** The ground each way-on, stair and wall-foot prop shows, whatever is in front of it. */
const OWN_GROUND:Partial<Record<SetPieceProp,{kind:Tile['kind'];base?:GroundMark}>>={'road-on':{kind:'path',base:'cobble'},threshold:{kind:'grass',base:'flagstone'},
 'stairs-down':{kind:'path',base:'slate'},'sea-door':{kind:'path',base:'vault'},'stairs-up':{kind:'path',base:'vault'},retaining:{kind:'grass'},slope:{kind:'grass'}};

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
 // Chapters II and III of the Hollow Reach and Saltreach Harbour, from the approved World page boards (design
 // canvas, version 132), checked there against the game's movement and the Keepers' own attack rules.
 crown:{
  // The ridge road: the trail runs along the drop behind a patched parapet with two gaps (8 and 10), above a
  // retaining wall, then opens into the turn where the guardians wait. Cart ruts run its full length.
  1:{clear:{x0:1,y0:1,x1:18,y1:12,kind:'path'},
   walls:[{cells:[...rect(6,9,12,9),...rect(1,12,5,12),...rect(13,12,18,12)],decoration:'retaining'},{cells:[...rect(6,10,12,12)],decoration:'slope'}],
   ground:[{cells:[...rect(1,1,18,2),...rect(6,3,12,5)],kind:'water',mark:'drop'},{cells:rect(1,7,18,7),kind:'path',mark:'rut'},
    {cells:[[2,9],[3,10],[14,3],[17,4],[15,11],[4,3],[18,9]],kind:'path',mark:'wind'}],
   props:[{at:[6,5],prop:'parapet'},{at:[7,5],prop:'parapet'},{at:[9,5],prop:'parapet'},{at:[11,5],prop:'parapet'},{at:[12,5],prop:'parapet'},
    {at:[13,3],prop:'banner'},{at:[5,9],prop:'banner'},{at:[16,3],prop:'rubble'},{at:[13,10],prop:'rubble'},{at:[18,10],prop:'rubble'},
    {at:[19,6],prop:'road-on'},{at:[19,7],prop:'road-on'},{at:[19,8],prop:'road-on'}],
   exit:{x:18,y:7},chest:{x:10,y:7}},
  // The hollow keep: through the broken west wall into an ashlar courtyard; two pairs of pillars frame the aisle
  // to the dragon; the treasury under the worn royal seal, the crown on its plinth, the postern out on the right.
  2:{clear:{x0:1,y0:1,x1:18,y1:12,kind:'path',decoration:'ashlar'},
   walls:[{cells:[...rect(1,1,18,1),...rect(1,12,18,12),[5,2],...rect(18,2,18,5),...rect(18,9,18,11)],decoration:'masonry'}],
   ground:[{cells:rect(1,2,4,11),kind:'path'},{cells:rect(1,6,7,8),kind:'path',mark:'rut'}],
   props:[...wide(13,1,'treasury'),{at:[16,3],prop:'crown'},{at:[8,7],prop:'pillar'},{at:[8,9],prop:'pillar'},{at:[11,7],prop:'pillar'},{at:[11,9],prop:'pillar'},
    {at:[9,1],prop:'wall-torch'},{at:[17,1],prop:'wall-torch'},{at:[7,1],prop:'wall-banner'},{at:[11,1],prop:'wall-banner'},{at:[5,3],prop:'gatepost'},{at:[5,11],prop:'gatepost'},
    {at:[19,6],prop:'road-on'},{at:[19,7],prop:'road-on'},{at:[19,8],prop:'road-on'}],
   exit:{x:18,y:7},chest:{x:14,y:3},keeper:{x:14,y:8}},
 },
 salt:{
  // Glassmakers' row: six shuttered workshops (three fronts differ), worktables, sand bins and empty racks for
  // cover, the matching mark chalked toward the stairs down, a timber quay over the harbour and a short jetty.
  1:{clear:{x0:1,y0:1,x1:18,y1:12,kind:'path',decoration:'slate'},
   walls:[{cells:rect(1,1,18,1),decoration:'masonry'}],
   ground:[{cells:[...rect(1,10,18,10),...rect(15,11,17,11)],kind:'path',mark:'deck'},{cells:[...rect(1,11,14,12),...rect(18,11,18,12),...rect(15,12,17,12)],kind:'water'},
    {cells:[[8,7],[11,7],[14,8],[17,7]],kind:'path',mark:'tally'}],
   props:[...wide(1,2,'workshop'),...wide(4,2,'workshop-wide'),...wide(7,2,'workshop'),...wide(10,2,'workshop-narrow'),...wide(13,2,'workshop-counter'),...wide(16,2,'workshop'),
    {at:[6,3],prop:'worktable'},{at:[7,3],prop:'worktable'},{at:[10,3],prop:'sandbin'},{at:[9,4],prop:'rack'},{at:[12,3],prop:'rack-marked'},{at:[13,4],prop:'rack'},
    {at:[16,3],prop:'worktable-invoice'},{at:[17,3],prop:'sandbin'},{at:[5,10],prop:'bollard'},{at:[11,10],prop:'bollard'},
    // The two gaps between shops boxed in by the worktable and the marked rack hold stacked crates, not a stray pocket.
    {at:[6,2],prop:'crates'},{at:[12,2],prop:'crates'},
    {at:[19,6],prop:'stairs-down'},{at:[19,7],prop:'stairs-down'},{at:[19,8],prop:'stairs-down'}],
   exit:{x:18,y:7},chest:{x:10,y:7}},
  // The harbour vaults: arch piers (one repaired) and the stumps of a fallen arcade frame a three-tile aisle with
  // side exits between them; crates in niches and bays; the barred rear door with the chest before it; the party
  // arrives down the stairs at the left and leaves by the sea door at the right.
  2:{clear:{x0:1,y0:1,x1:18,y1:12,kind:'path',decoration:'vault'},
   walls:[{cells:[...rect(1,1,18,1),...rect(1,12,18,12)],decoration:'masonry'}],
   ground:[{cells:[[7,7],[10,7],[13,7],[9,3],[11,11]],kind:'path',mark:'grate'}],
   props:[{at:[6,5],prop:'pier'},{at:[8,5],prop:'pier'},{at:[10,5],prop:'pier-repaired'},{at:[12,5],prop:'pier'},{at:[14,5],prop:'pier'},
    ...[6,8,10,12,14].map(x=>({at:[x,9] as Cell,prop:'pier-stump' as const})),
    {at:[7,3],prop:'crates'},{at:[11,3],prop:'crates'},{at:[9,11],prop:'crates'},{at:[12,10],prop:'crates'},{at:[3,3],prop:'crates'},
    {at:[3,1],prop:'niche'},{at:[7,1],prop:'niche'},{at:[11,1],prop:'niche'},...wide(16,1,'vault-door'),
    {at:[19,6],prop:'sea-door'},{at:[19,7],prop:'sea-door'},{at:[19,8],prop:'sea-door'},{at:[0,6],prop:'stairs-up'},{at:[0,7],prop:'stairs-up'},{at:[0,8],prop:'stairs-up'}],
   exit:{x:18,y:7},chest:{x:16,y:3},keeper:{x:13,y:7}},
 },
};
/** A long built-in tale's two middle places per region (lore edition 6): III and IV between the road and the Keeper.
    The party arrives on the left and leaves on the right like every chapter; the guardians' starts stay open. */
export const LONG_PIECES:Record<TaleId,Record<3|4,SetPiece>>={
 lantern:{
  // Bramble Crossing: a stream runs the board top to bottom. A new plank bridge carries the path over it, and two
  // rows of stepping stones cross higher and lower. Brambles crowd the west bank; on the east bank they are cut back.
  3:{clear:{x0:1,y0:1,x1:18,y1:12,kind:'grass'},
   walls:[trees([...rect(1,1,7,1),...rect(12,1,18,1),[1,2],[2,2],[17,2],[18,2],[1,12],[2,12],[5,12],[13,12],[17,12],[18,12],[18,11]])],
   ground:[{cells:[...rect(9,1,10,5),...rect(9,9,10,12)],kind:'water'},{cells:[[9,3],[10,3],[9,11],[10,11]],kind:'path',mark:'stones'},
    {cells:rect(9,6,10,8),kind:'path',mark:'bridge'},{cells:[...rect(1,7,8,7),...rect(11,7,18,7)],kind:'path'},
    {cells:[[5,3],[6,3],[14,11],[15,11]],kind:'water',mark:'hollow'}],
   props:[{at:[8,2],prop:'bramble'},{at:[8,4],prop:'bramble'},{at:[8,5],prop:'bramble'},{at:[7,5],prop:'bramble'},{at:[8,9],prop:'bramble'},{at:[8,10],prop:'bramble'},{at:[7,10],prop:'bramble'},
    {at:[11,2],prop:'bramble'},{at:[11,12],prop:'bramble'},{at:[12,12],prop:'bramble'},
    {at:[19,6],prop:'road-on'},{at:[19,7],prop:'road-on'},{at:[19,8],prop:'road-on'}],
   exit:{x:18,y:7},chest:{x:13,y:3}},
  // The Moonwell: a clearing among the trees. The well shines at its centre inside a ring of standing stones on old
  // flagstones; the lantern hook above it is empty. Flowers and mushrooms grow where the light falls.
  4:{clear:{x0:1,y0:1,x1:18,y1:12,kind:'grass'},
   walls:[trees([...rect(1,1,18,1),[1,2],[2,2],[5,2],[13,2],[17,2],[18,2],[18,3],[1,11],[1,12],[2,12],[6,12],[7,12],[12,12],[16,12],[17,12],[18,12],[18,11]])],
   ground:[{cells:rect(7,4,12,9),kind:'grass',mark:'flagstone'},
    {cells:[[15,3],[16,3],[4,11],[5,11]],kind:'water',mark:'hollow'}],
   props:[...wide(9,6,'moonwell'),{at:[7,4],prop:'standing-stone'},{at:[12,4],prop:'standing-stone'},{at:[7,9],prop:'standing-stone'},{at:[12,9],prop:'standing-stone'},
    {at:[19,6],prop:'road-on'},{at:[19,7],prop:'road-on'},{at:[19,8],prop:'road-on'}],
   exit:{x:18,y:7},chest:{x:10,y:8}},
 },
 crown:{
  // The Sunken Archive: a reading hall gone under. Shelves line the walls above two flooded channels, each with a
  // dry crossing in the middle; the one emptied shelf stands dry; a lectern and fallen pages in the aisle.
  3:{clear:{x0:1,y0:1,x1:18,y1:12,kind:'path',decoration:'ashlar'},
   walls:[{cells:[...rect(1,1,18,1),...rect(1,12,18,12)],decoration:'masonry'}],
   ground:[{cells:[...rect(5,4,8,4),...rect(11,4,13,4),...rect(5,10,8,10),...rect(11,10,13,10)],kind:'water'},
    {cells:[[7,7],[11,6],[12,8],[5,8],[10,9],[15,3]],kind:'path',mark:'pages'}],
   props:[...[5,6,7,8,11,13].map(x=>({at:[x,2] as Cell,prop:'shelf' as const})),{at:[12,2],prop:'shelf-empty'},...[5,6,7,8,11,12,13].map(x=>({at:[x,11] as Cell,prop:'shelf' as const})),
    {at:[9,7],prop:'lectern'},{at:[3,1],prop:'wall-torch'},{at:[16,1],prop:'wall-torch'},
    {at:[19,6],prop:'road-on'},{at:[19,7],prop:'road-on'},{at:[19,8],prop:'road-on'}],
   exit:{x:18,y:7},chest:{x:16,y:3}},
  // The Star Chamber: a round observatory floor inlaid with the stars. The brass orrery turns at its centre with
  // one star missing; four pillars hold the dome; torches and banners on the far wall.
  4:{clear:{x0:1,y0:1,x1:18,y1:12,kind:'path',decoration:'ashlar'},
   walls:[{cells:[...rect(1,1,18,1),...rect(1,12,18,12),[1,2],[18,2],[1,11],[18,11]],decoration:'masonry'}],
   // The inlaid floor is round: the corners of its square stay plain ashlar.
   ground:[{cells:([...rect(7,5,12,9),[8,4],[9,4],[10,4],[11,4],[8,10],[9,10],[10,10],[11,10]] as Cell[]).filter(([x,y])=>!(y===7&&(x===9||x===10))&&!((x===7||x===12)&&(y===5||y===9))),kind:'path',mark:'stars'}],
   props:[...wide(9,7,'orrery'),{at:[6,4],prop:'pillar'},{at:[13,4],prop:'pillar'},{at:[6,10],prop:'pillar'},{at:[13,10],prop:'pillar'},
    {at:[4,1],prop:'wall-torch'},{at:[15,1],prop:'wall-torch'},{at:[8,1],prop:'wall-banner'},{at:[11,1],prop:'wall-banner'},
    {at:[19,6],prop:'road-on'},{at:[19,7],prop:'road-on'},{at:[19,8],prop:'road-on'}],
   exit:{x:18,y:7},chest:{x:10,y:3}},
 },
 salt:{
  // The Tideglass Steps: three terraces down to the harbour. Low walls edge the upper terrace with a flight through
  // the middle; a broad flight runs down to the landing; fresh glass glitters on every step.
  3:{clear:{x0:1,y0:1,x1:18,y1:12,kind:'path',decoration:'slate'},
   walls:[{cells:rect(1,1,18,1),decoration:'masonry'}],
   ground:[{cells:[[9,5],[10,5],...rect(5,9,15,10)],kind:'path',mark:'steps'},{cells:rect(1,11,18,11),kind:'path',mark:'deck'},
    {cells:rect(1,12,18,12),kind:'water'}],
   props:[...[6,7,8,11,12,13].map(x=>({at:[x,5] as Cell,prop:'retaining' as const})),{at:[9,2],prop:'cage-lit'},{at:[12,2],prop:'crates'},{at:[17,2],prop:'crates'},
    {at:[4,11],prop:'bollard'},{at:[15,11],prop:'bollard'},
    {at:[19,6],prop:'road-on'},{at:[19,7],prop:'road-on'},{at:[19,8],prop:'road-on'}],
   exit:{x:18,y:7},chest:{x:16,y:4}},
  // The Mistwater Cove: a sandy cove under the cliffs. The smugglers' boat lies beached with its lantern hooded,
  // their cargo stacked behind rocks; the harbour laps along the bottom.
  4:{clear:{x0:1,y0:1,x1:18,y1:12,kind:'path',decoration:'sand'},
   walls:[{cells:[...rect(1,1,18,1),[1,2],[2,2],[6,2],[7,2],[12,2],[17,2],[18,2],[18,3],[6,4],[12,3],[15,10],[4,11]],decoration:'rock'}],
   ground:[{cells:[...rect(1,12,18,12),...rect(5,11,12,11)],kind:'water'}],
   props:[...wide(8,9,'wreck'),{at:[11,5],prop:'crates'},{at:[12,5],prop:'crates'},{at:[12,6],prop:'crates'},{at:[3,11],prop:'bollard'},
    {at:[19,6],prop:'road-on'},{at:[19,7],prop:'road-on'},{at:[19,8],prop:'road-on'}],
   exit:{x:18,y:7},chest:{x:12,y:9}},
 },
};
/** Games stamped from this edition get the Lantern Road's authored later chapters (and the shrine's light in Lantern Hunt). */
export const LATER_PIECES_EDITION=4;
/** The lore edition from which each tale's later chapters are authored. Older saves keep their generated maps. */
export const LATER_PIECES_SINCE:Record<TaleId,number>={lantern:LATER_PIECES_EDITION,crown:5,salt:5};

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
 if(isSetPieceProp(tile.decoration)&&OWN_GROUND[tile.decoration])return OWN_GROUND[tile.decoration]!;
 // Marks that lie on a paved floor: the chalked tally on wet slate, a grate in the vault floor.
 if(tile.decoration==='tally')return {kind:tile.kind,base:'slate',mark:'tally'};
 if(tile.decoration==='grate')return {kind:tile.kind,base:'vault',mark:'grate'};
 // The Sunken Archive's fallen pages lie on its ashlar floor.
 if(tile.decoration==='pages')return {kind:tile.kind,base:'ashlar',mark:'pages'};
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
    later chapters from the edition each tale's were authored in (LATER_PIECES_SINCE), so older saves keep their generated maps. */
export function setPieceFor(game:GameState):SetPiece|undefined {
 const tale=builtInTale(game.options.creation?.story),lore=game.lore??0;
 if(!tale)return undefined;
 const place=chapterPlace(game);
 if(place===0)return lore>=1?SET_PIECES[tale]:undefined;
 if(place>=3)return lore>=LONG_PLACES_EDITION?LONG_PIECES[tale][place as 3|4]:undefined;
 return lore>=LATER_PIECES_SINCE[tale]?LATER_PIECES[tale]?.[place]:undefined;
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
