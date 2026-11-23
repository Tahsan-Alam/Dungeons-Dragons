import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyAction,createGame,getReachable,LONG_CREATURE,runBots} from './engine.ts';
import {GAME_MASTERS,HEROES,TALES,type TaleId} from './presets.ts';
import {LONG_PLACES,LONG_PLACES_EDITION,LORE_EDITION,chapterPlace} from './lore.ts';
import {LONG_PIECES,LATER_PIECES} from './set-pieces.ts';
import type {GameOptions,GameState,PlayerSpec} from './types.ts';

/* Long built-in tales (lore edition 6): five distinct places, I, II, the region's two new middle places, then the
   Keeper's place, with the region's new creature in the middle two. */
const hero=HEROES[0];
const player:PlayerSpec={id:'p1',name:hero.profile.name,heroClass:hero.profile.heroClass,color:hero.profile.color,bot:false};
const party=(n:number):PlayerSpec[]=>[player,...Array.from({length:n-1},(_,i)=>({...player,id:`p${i+2}`,name:`Friend ${i+2}`,bot:true}))];
const options=(id:TaleId,duration:GameOptions['duration']='long',seed:string=id):GameOptions=>{const tale=TALES.find(t=>t.id===id)!;return {rules:'simple',seed,narrator:'warm',biome:tale.story.biome,companions:0,duration,
 creation:{narrator:GAME_MASTERS[0].profile,story:tale.story,hero:hero.profile}}};
const heroOf=(g:GameState)=>g.actors.find(a=>a.playerId===player.id)!;
const at=(g:GameState,x:number,y:number)=>g.tiles[y*g.width+x];
const open=(g:GameState,x:number,y:number)=>['grass','path'].includes(at(g,x,y)?.kind);
const TALE_IDS:TaleId[]=['lantern','crown','salt'];

/** Clears chapters by the legal chest and gateway actions until the game reaches `scene`. */
function reach(game:GameState,scene:number){
 while(game.scene<scene){
  for(const a of game.actors.filter(a=>a.enemy)){a.hp=0;a.defeated=true;}
  const you=heroOf(game);game.activeActorId=you.id;
  const c=[[game.chest.x-1,game.chest.y],[game.chest.x,game.chest.y+1],[game.chest.x,game.chest.y-1],[game.chest.x+1,game.chest.y]].find(([x,y])=>open(game,x,y))!;you.x=c[0];you.y=c[1];
  game=applyAction(game,player.id,{type:'interact'});
  const me=heroOf(game);game.activeActorId=me.id;
  const e=[[game.exit.x-1,game.exit.y],[game.exit.x,game.exit.y+1],[game.exit.x,game.exit.y-1]].find(([x,y])=>open(game,x,y))!;me.x=e[0];me.y=e[1];
  game=applyAction(game,player.id,{type:'advance'});
 }
 return game;
}
/** Every open tile connected, every figure on reachable ground, the chest and the way on in reach, no sealed pockets. */
function assertPlayable(game:GameState,label:string){
 const solo=structuredClone(game),me=solo.actors.find(a=>!a.enemy)!;solo.actors=[me];me.movement=1000;me.x=3;me.y=7;
 const all=new Set(game.tiles.filter(t=>t.kind==='grass'||t.kind==='path').map(t=>`${t.x},${t.y}`));
 const reached=new Set([...getReachable(solo,me).map(c=>`${c.x},${c.y}`),'3,7']);
 assert.equal(reached.size,all.size,`${label}: every open tile is connected`);
 for(const a of game.actors)assert.ok(reached.has(`${a.x},${a.y}`),`${label}: ${a.name} starts on open, reachable ground`);
 assert.ok([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>reached.has(`${game.chest.x+dx},${game.chest.y+dy}`)),`${label}: the chest can be reached`);
 assert.ok(reached.has(`${game.exit.x},${game.exit.y}`),`${label}: the way on can be reached`);
 assert.equal(new Set(game.actors.map(a=>`${a.x},${a.y}`)).size,game.actors.length,`${label}: no two figures share a tile`);
 return reached.size;
}

test('a long built-in tale plays five places in order and ends at the Keeper’s place',()=>{
 assert.ok(LORE_EDITION>=LONG_PLACES_EDITION);
 for(const id of TALE_IDS){
  const tale=TALES.find(t=>t.id===id)!,names=[tale.story.locations[0],tale.story.locations[1],LONG_PLACES[id][0].name,LONG_PLACES[id][1].name,tale.story.locations[2]];
  let game=runBots(createGame([player],options(id)));
  for(let scene=0;scene<5;scene++){
   game=reach(game,scene);
   assert.equal(game.sceneName,names[scene],`${id} chapter ${scene+1}`);
   assert.equal(chapterPlace(game),[0,1,3,4,2][scene]);
   if(scene===4)assert.ok(game.actors.some(a=>a.keeper),`${id}: the Keeper waits in the last place`);
   else assert.ok(!game.actors.some(a=>a.keeper),`${id} chapter ${scene+1}: no Keeper before the end`);
  }
 }
});

test('the six new places are laid out as drawn, legal and connected, for any party size',()=>{
 for(const id of TALE_IDS)for(const scene of [2,3] as const)for(const size of [1,4,8]){
  const game=reach(runBots(createGame(party(size),options(id,'long',`${id}-${scene}-${size}`))),scene),place=(scene+1) as 3|4;
  const piece=LONG_PIECES[id][place],label=`${LONG_PLACES[id][place-3].name}, party of ${size}`;
  assert.deepEqual(game.exit,piece.exit,label);assert.deepEqual({x:game.chest.x,y:game.chest.y},piece.chest,label);
  for(const p of piece.props)assert.equal(at(game,...p.at).decoration,p.prop,`${label}: ${p.prop} at ${p.at}`);
  assert.ok(game.events.some(e=>e.kind==='story'&&e.text.includes(LONG_PLACES[id][place-3].clue)),`${label}: the opening leads with the place's clue`);
  assertPlayable(game,label);
 }
});

test('each region’s new creature guards its two middle places, and only those',()=>{
 for(const id of TALE_IDS){
  const biome=TALES.find(t=>t.id===id)!.story.biome,creature=LONG_CREATURE[biome as keyof typeof LONG_CREATURE];
  let game=runBots(createGame(party(3),options(id)));
  for(let scene=0;scene<5;scene++){
   game=reach(game,scene);
   const has=game.actors.some(a=>a.enemy&&a.name.startsWith(creature));
   assert.equal(has,scene===2||scene===3,`${id} chapter ${scene+1}: ${creature}`);
  }
 }
});

test('standard tales and saves from before edition 6 keep their places',()=>{
 for(const id of TALE_IDS){
  const standard=reach(runBots(createGame([player],options(id,'standard'))),2);
  assert.equal(standard.sceneName,TALES.find(t=>t.id===id)!.story.locations[2]);
  assert.ok(standard.actors.some(a=>a.keeper));
  let old=createGame([player],options(id));old.lore=5;
  old=reach(old,3);
  assert.equal(old.sceneName,TALES.find(t=>t.id===id)!.story.locations[0],`${id}: an edition-5 long game still repeats its places`);
  assert.ok(!old.tiles.some(t=>['bramble','moonwell','shelf','orrery','wreck','retaining'].includes(String(t.decoration))&&LATER_PIECES[id]?.[1]?.props.every(p=>p.prop!==t.decoration)),id);
 }
});
