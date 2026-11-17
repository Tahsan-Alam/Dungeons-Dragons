import type {Actor,Cell,GameState,KeeperKind,KeeperPlan} from './types.ts';
import {builtInTale} from './lore.ts';

/* The Hollow Keepers (RULES.md, “Hollow Keepers”). Each built-in tale ends with its own named Keeper and signature
   attack; a custom tale's final guardian keeps the title. A signature attack is announced on one turn, stored on
   the Keeper, drawn on the board, and resolved on its next turn exactly as stored: heroes who leave the marked
   tiles avoid it. This module plans; game/engine.ts resolves with its own movement, dice and damage. */

/** Games stamped before this edition keep the earlier untitled Keeper, live and in replay. */
export const KEEPER_EDITION=2;

export interface KeeperProfile {name:string;speed:number;move?:KeeperPlan['move'];moveName?:string;defeat:string}
export const KEEPER_PROFILE:Record<KeeperKind,KeeperProfile>={
 wolf:{name:'The Wolf at the Last Light',speed:6,move:'hunt',moveName:'Lantern Hunt',defeat:'The Wolf at the Last Light slinks back beyond the shrine’s light. The way to the chest is clear.'},
 dragon:{name:'The Crown’s Dragon',speed:4,move:'breath',moveName:'Lanternfire Breath',defeat:'The dragon folds its wings beside the crown and lets the party pass.'},
 warden:{name:'The Tideglass Warden',speed:5,move:'tide',moveName:'Breaking Tide',defeat:'The Tideglass Warden lowers her glass blade and yields. The vault is the party’s.'},
 hollow:{name:'The Hollow Keeper',speed:5,defeat:'The Hollow Keeper falls, and the last shard is free.'},
};
/** On top of an ordinary guardian of the same chapter. */
export const KEEPER_HP_BONUS=16,KEEPER_AC_BONUS=2;
/** Keeper strikes: +5 to hit and 1d8 + 2 damage (ordinary guardians: +3 and 1d4 + 1). */
export const KEEPER_STRIKE={bonus:5,die:8,plus:2};
export const HUNT_REACH=8,BREATH_LENGTH=6,TIDE_REACH=5;

/** Which Keeper guards this game's final shard, or undefined for games stamped before the Keepers. */
export function keeperFor(game:GameState):KeeperKind|undefined {
 if((game.lore??0)<KEEPER_EDITION)return undefined;
 const tale=builtInTale(game.options.creation?.story);
 return tale==='lantern'?'wolf':tale==='crown'?'dragon':tale==='salt'?'warden':'hollow';
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
