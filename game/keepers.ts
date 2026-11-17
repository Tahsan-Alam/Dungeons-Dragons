import type {Actor,Biome,Cell,GameState,KeeperKind,KeeperPlan} from './types.ts';
import {builtInTale} from './lore.ts';

/* The Hollow Keepers (RULES.md, “The Hollow Keepers”). Each built-in tale ends with its own named Keeper; a custom
   tale's final guardian is drawn from its landscape's boss pool and named after the tale's world. Every Keeper has
   a signature attack that is announced on one turn, stored on the Keeper, drawn on the board, and resolved on its
   next turn exactly as stored: heroes who leave the marked tiles avoid it. This module plans and words the attacks;
   game/engine.ts resolves them with its own movement, dice and damage. */

/** Games stamped before this edition keep the earlier untitled Keeper, live and in replay. */
export const KEEPER_EDITION=2;
/** From this edition a custom tale draws its boss from the pool and its chapters from the wider enemy groups. */
export const CUSTOM_BOSS_EDITION=3;

export interface KeeperProfile {
 /** The creature, for a custom tale's title: “The Ridge Giant of Cogmere”. */ creature:string;
 /** A built-in tale's fixed name. */ name?:string;
 speed:number;move?:KeeperPlan['move'];moveName?:string;
 /** After the Keeper's name, when the attack is announced. */ announce?:(target:string)=>string;
 /** After the Keeper's name, when the attack is released. */ release?:string;
 /** Hunt: the strike's verb. */ verb?:string;
 /** Lane and arcs: what catches a hero (arc index from 0). */ source?:(arc:number)=>string;
 /** When a lane catches nobody. */ empty?:string;
 defeat:(name:string)=>string;
}
const ORDINAL=['first','second','third'];
export const KEEPER_PROFILE:Record<KeeperKind,KeeperProfile>={
 wolf:{creature:'Wolf',name:'The Wolf at the Last Light',speed:6,move:'hunt',moveName:'Lantern Hunt',verb:'pounces on',release:'pounces along the marked path.',
  announce:t=>`fixes its eyes on ${t}. Lantern Hunt: on its next turn it pounces along the marked path. Step off the path to escape.`,
  defeat:()=>'The Wolf at the Last Light slinks back beyond the shrine’s light. The way to the chest is clear.'},
 dragon:{creature:'Dragon',name:'The Crown’s Dragon',speed:4,move:'breath',moveName:'Lanternfire Breath',release:'breathes lanternfire down the marked lane.',source:()=>'Lanternfire',empty:'The flames wash over empty ground.',
  announce:()=>'draws in a breath of lanternfire. The marked lane burns on its next turn. Leave it, or put a wall between you.',
  defeat:()=>'The dragon folds its wings beside the crown and lets the party pass.'},
 warden:{creature:'Warden',name:'The Tideglass Warden',speed:5,move:'tide',moveName:'Breaking Tide',release:'looses the Breaking Tide.',source:i=>`The ${ORDINAL[i]} wave`,
  announce:t=>`raises her glass blade toward ${t}. Breaking Tide: on her next turn the marked arcs break, one after another.`,
  defeat:()=>'The Tideglass Warden lowers her glass blade and yields. The vault is the party’s.'},
 hollow:{creature:'Hollow Keeper',name:'The Hollow Keeper',speed:5,defeat:()=>'The Hollow Keeper falls, and the last shard is free.'},
 // The custom-tale boss pool: each uses an attack the named Keepers already have, worded for its creature.
 thornhound:{creature:'Thornhound',speed:6,move:'hunt',moveName:'Thorn Rush',verb:'crashes into',release:'tears along the marked path.',
  announce:t=>`lowers its thorny head at ${t}. Thorn Rush: on its next turn it charges along the marked path. Step off the path to escape.`,
  defeat:n=>`${n} crashes into the brambles and does not rise. The last shard is free.`},
 'grey-wolf':{creature:'Grey Wolf',speed:6,move:'hunt',moveName:'The Hunt',verb:'pounces on',release:'pounces along the marked path.',
  announce:t=>`fixes its eyes on ${t}. The Hunt: on its next turn it pounces along the marked path. Step off the path to escape.`,
  defeat:n=>`${n} limps away into the trees. The last shard is free.`},
 giant:{creature:'Ridge Giant',speed:4,move:'tide',moveName:'Rockfall',release:'brings the stone down.',source:i=>`The ${ORDINAL[i]} blow`,
  announce:t=>`raises both fists over ${t}. Rockfall: on its next turn the marked arcs come down, one after another.`,
  defeat:n=>`${n} sinks to its knees and lets the stone settle. The last shard is free.`},
 drake:{creature:'Old Drake',speed:4,move:'breath',moveName:'Fire Breath',release:'breathes fire down the marked lane.',source:()=>'Drakefire',empty:'The flames wash over empty ground.',
  announce:()=>'draws in a long breath. The marked lane burns on its next turn. Leave it, or put a wall between you.',
  defeat:n=>`${n} curls up among the ruins and lets the party pass. The last shard is free.`},
 eye:{creature:'Glass Eye',speed:4,move:'breath',moveName:'Glaring Gaze',release:'turns its glare down the marked lane.',source:()=>'The glare',empty:'The glare finds only empty ground.',
  announce:()=>'gathers light behind its lens. Glaring Gaze: the marked lane burns on its next turn. Leave it, or put a wall between you.',
  defeat:n=>`${n} cracks and goes dark. The last shard is free.`},
 'tide-warden':{creature:'Tide Warden',speed:5,move:'tide',moveName:'Breaking Tide',release:'looses the Breaking Tide.',source:i=>`The ${ORDINAL[i]} wave`,
  announce:t=>`raises her glass blade toward ${t}. Breaking Tide: on her next turn the marked arcs break, one after another.`,
  defeat:n=>`${n} lowers her blade and yields. The last shard is free.`},
};
/** A custom tale's boss is drawn from its landscape's pool by the adventure seed. */
export const BOSS_POOL:Record<Biome,readonly KeeperKind[]>={woodland:['thornhound','grey-wolf'],ruins:['giant','drake'],coast:['eye','tide-warden']};
/** On top of an ordinary guardian of the same chapter. */
export const KEEPER_HP_BONUS=16,KEEPER_AC_BONUS=2;
/** Keeper strikes: +5 to hit and 1d8 + 2 damage (ordinary guardians: +3 and 1d4 + 1). */
export const KEEPER_STRIKE={bonus:5,die:8,plus:2};
export const HUNT_REACH=8,BREATH_LENGTH=6,TIDE_REACH=5;

/** Which Keeper guards this game's final shard, or undefined for games stamped before the Keepers.
    `pick` is a seeded whole number that chooses from a custom tale's boss pool. */
export function keeperFor(game:GameState,pick=0):KeeperKind|undefined {
 if((game.lore??0)<KEEPER_EDITION)return undefined;
 const tale=builtInTale(game.options.creation?.story);
 if(tale)return tale==='lantern'?'wolf':tale==='crown'?'dragon':'warden';
 if((game.lore??0)<CUSTOM_BOSS_EDITION)return 'hollow';
 const pool=BOSS_POOL[game.options.biome];return pool[pick%pool.length];
}

/** A built-in Keeper's own name; a pool boss is named after the tale's world when that name is short enough. */
export function keeperName(kind:KeeperKind,world:string|undefined):string {
 const profile=KEEPER_PROFILE[kind];
 if(profile.name)return profile.name;
 const place=world?.trim();
 return place&&place.length<=24?`The ${profile.creature} of ${place}`:`The ${profile.creature}`;
}

/** The wider enemy groups a custom tale's chapters draw from, on top of the landscape's four guardians. */
export const WIDER_ENEMIES:Record<Biome,readonly string[]>={woodland:['Thornhound','Dawn sentinel'],ruins:['Oathbound guard','Sealwax ooze'],coast:['Glass eye']};
/** Four enemies for one chapter of a custom tale, shuffled by `pick(n)` (a seeded whole number below n).
    The boss's own creature is left out. */
export function chapterEnemies(base:readonly string[],biome:Biome,boss:KeeperKind|undefined,pick:(n:number)=>number):string[] {
 const bossCreature=boss?KEEPER_PROFILE[boss].creature.toLowerCase():'';
 const pool=[...base,...WIDER_ENEMIES[biome].filter(n=>n.toLowerCase()!==bossCreature)];
 for(let i=pool.length-1;i>0;i--){const j=pick(i+1);[pool[i],pool[j]]=[pool[j],pool[i]]}
 return pool.slice(0,4);
}

/** A Keeper whose pounce missed is exposed: −3 Armor Class until its next turn. */
export const EXPOSED_AC=3;
export const armorOf=(actor:Pick<Actor,'ac'|'exposed'>)=>actor.ac-(actor.exposed?EXPOSED_AC:0);

/** The standing Keepers whose announced attack covers this tile, for the board and turn guidance. */
export function threatsAt(game:GameState,at:Cell):Actor[] {
 return game.actors.filter(a=>a.keeper&&a.plan&&!a.defeated&&a.hp>0&&onTiles(a.plan.tiles,at));
}

const DIRS:Cell[]=[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
const add=(a:Cell,b:Cell,k=1):Cell=>({x:a.x+b.x*k,y:a.y+b.y*k});
const same=(a:Cell,b:Cell)=>a.x===b.x&&a.y===b.y;
export const onTiles=(cells:readonly Cell[],c:Cell)=>cells.some(t=>same(t,c));

/** What the planner may ask of the board. `wall` blocks fire and arcs; `free` is a legal tile to move through or land on. */
export interface KeeperBoard {inside:(c:Cell)=>boolean;wall:(c:Cell)=>boolean;free:(c:Cell)=>boolean}

/** Lantern Hunt: mark the nearest hero the wolf can reach and the whole route to the tile beside them. */
export function planHunt(keeper:Actor,heroes:readonly Actor[],board:KeeperBoard,round:number):KeeperPlan|null {
 const start={x:keeper.x,y:keeper.y},key=(c:Cell)=>`${c.x},${c.y}`,prev=new Map<string,Cell|null>([[key(start),null]]),queue=[start],depth=new Map([[key(start),0]]);
 for(let i=0;i<queue.length;i++){const c=queue[i],d=depth.get(key(c))!;if(d>=HUNT_REACH)continue;
  for(const dir of DIRS){const n=add(c,dir),k=key(n);if(prev.has(k)||!board.inside(n)||!board.free(n))continue;prev.set(k,c);depth.set(k,d+1);queue.push(n)}}
 let best:{target:Actor;landing:Cell;steps:number}|null=null;
 for(const hero of heroes){
  const landings=DIRS.map(d=>add(hero,d)).filter(c=>prev.has(key(c))||same(c,start));
  for(const landing of landings){const steps=depth.get(key(landing))??0;if(!best||steps<best.steps||(steps===best.steps&&hero.hp<best.target.hp))best={target:hero,landing,steps}}
 }
 if(!best)return null;
 const route:Cell[]=[];for(let c:Cell|null=best.landing;c&&!same(c,start);c=prev.get(key(c))??null)route.unshift(c);
 return {move:'hunt',targetId:best.target.id,route,landing:best.landing,tiles:[...route,{x:best.target.x,y:best.target.y}],round};
}

/** Lanternfire Breath: a lane three tiles wide and six long, cut short by walls, aimed where it catches the most heroes. */
export function planBreath(keeper:Actor,heroes:readonly Actor[],board:KeeperBoard,round:number):KeeperPlan|null {
 let best:{tiles:Cell[];caught:number}|null=null;
 for(const dir of DIRS){
  const side={x:dir.y,y:dir.x},tiles:Cell[]=[];
  for(const offset of [-1,0,1]){for(let step=1;step<=BREATH_LENGTH;step++){const c=add(add(keeper,dir,step),side,offset);if(!board.inside(c)||board.wall(c))break;tiles.push(c)}}
  const caught=heroes.filter(h=>onTiles(tiles,h)).length;
  if(caught&&(!best||caught>best.caught))best={tiles,caught};
 }
 return best?{move:'breath',tiles:best.tiles,round}:null;
}

/** Breaking Tide: an arc in front, a step of two tiles, a second arc; a third step and arc once the Warden is hurt.
    Null unless the hero she faces stands on one of the arcs. */
export function planTide(keeper:Actor,heroes:readonly Actor[],board:KeeperBoard,round:number):KeeperPlan|null {
 const dist=(h:Actor)=>Math.abs(h.x-keeper.x)+Math.abs(h.y-keeper.y);
 const target=[...heroes].filter(h=>dist(h)<=TIDE_REACH).sort((a,b)=>dist(a)-dist(b)||a.hp-b.hp)[0];
 if(!target)return null;
 const dx=target.x-keeper.x,dy=target.y-keeper.y,dir:Cell=Math.abs(dx)>=Math.abs(dy)?{x:Math.sign(dx)||1,y:0}:{x:0,y:Math.sign(dy)};
 const side={x:dir.y,y:dir.x};
 const arc=(at:Cell)=>[add(at,dir),add(add(at,dir),side),add(add(at,dir),side,-1)].filter(c=>board.inside(c)&&!board.wall(c));
 const step=(from:Cell)=>{const a=add(from,dir),b=add(from,dir,2);return board.inside(a)&&board.free(a)&&board.inside(b)&&board.free(b)?b:null};
 // `route` lists the step landings in order: the Warden steps to route[i] before arc i + 1.
 const start={x:keeper.x,y:keeper.y},arcs=[arc(start)],route:Cell[]=[];
 const second=step(start);if(second){route.push(second);arcs.push(arc(second));
  const third=keeper.hp<=keeper.maxHp/2?step(second):null;if(third){route.push(third);arcs.push(arc(third))}}
 // She announces only a tide that would catch the hero she faces; otherwise she closes in first.
 if(!arcs.some(a=>onTiles(a,target)))return null;
 return {move:'tide',targetId:target.id,arcs,route,landing:route.at(-1)??start,tiles:arcs.flat(),round};
}
