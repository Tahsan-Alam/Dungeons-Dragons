import assert from 'node:assert/strict';
import test from 'node:test';
import {applyAction,createGame,encounterCleared,getReachable,getValidTargets,hasLineOfSight,runBots} from './engine.ts';
import {newReplay,appendReplay,reconstructReplay} from './replay.ts';
import type {Actor,GameAction,GameOptions,GameState,PlayerSpec} from './types.ts';

const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const classes=['ranger','cleric','knight','mage'] as const;
function players(count:number,bots=true):PlayerSpec[]{return Array.from({length:count},(_,i)=>({id:`hero-${i}`,name:`Hero ${i}`,heroClass:classes[i%4],color:'#a3bd91',bot:bots&&i>0}));}
/** Chooses legal player inputs; no HP, map, RNG, or position is changed by the test. */
function chooseAction(game:GameState):GameAction{
 const actor=game.actors.find(a=>a.id===game.activeActorId)!;
 if(encounterCleared(game)){
  const goal=game.chest.opened?game.exit:game.chest;
  if(distance(actor,goal)<=1)return {type:game.chest.opened?'advance':'interact'};
  return approach(game,actor,goal,1)??{type:'end'};
 }
 if(!actor.actionUsed){
  if(actor.hp<actor.maxHp*.4&&actor.potions>0)return {type:'potion'};
  const abilities=getValidTargets(game,actor,true).sort((a,b)=>actor.heroClass==='cleric'?a.hp/a.maxHp-b.hp/b.maxHp:a.hp-b.hp);
  if(abilities.length&&(actor.heroClass!=='cleric'||abilities[0].hp<abilities[0].maxHp*.7))return {type:'ability',targetId:abilities[0].id};
  const targets=getValidTargets(game,actor).sort((a,b)=>a.hp-b.hp);
  if(targets.length)return {type:'attack',targetId:targets[0].id};
  const enemy=game.actors.filter(a=>a.enemy&&a.hp>0&&!a.defeated).sort((a,b)=>distance(actor,a)-distance(actor,b))[0];
  if(enemy){const move=approach(game,actor,enemy,actor.heroClass==='ranger'?5:actor.heroClass==='mage'?4:1);if(move)return move;}
  return {type:'guard'};
 }
 return {type:'end'};
}
function approach(game:GameState,actor:Actor,target:{x:number;y:number},range:number):GameAction|null{
 const score=(p:{x:number;y:number})=>Math.max(0,distance(p,target)-range)*100+(hasLineOfSight(game,p,target)?0:20)+distance(actor,p);
 const move=getReachable(game,actor).sort((a,b)=>score(a)-score(b))[0];
 return move&&score(move)<score(actor)?{type:'move',...move}:null;
}

for(const rules of ['simple','classic'] as const)for(const biome of ['woodland','ruins','coast'] as const){
 test(`complete ${rules} ${biome} adventure replays every accepted action and companion turn exactly`,()=>{
  const options:GameOptions={rules,biome,seed:`replay-${rules}-${biome}`,narrator:'warm',companions:3};
  const initial=createGame(players(4),options);let archive=newReplay(initial),game=runBots(initial),steps=0;
  while(game.status==='playing'&&steps++<500){
   const playerId=game.actors.find(a=>a.id===game.activeActorId)!.playerId!;
   const action=chooseAction(game);game=runBots(applyAction(game,playerId,action));archive=appendReplay(archive,{type:'action',playerId,action});
  }
  assert.notEqual(game.status,'playing','A normal playthrough must terminate');
  assert.equal(game.status,'victory','The legal player strategy should finish all three scenes');
  const stored=JSON.stringify(archive);const frames=reconstructReplay(JSON.parse(stored));
  assert.deepEqual(frames[0],initial);assert.deepEqual(frames.at(-1),game);assert.equal(JSON.stringify(archive),stored);
  assert.ok(frames.length>archive.commands.length,'Bots must have visible intermediate replay frames');
  assert.equal(new Set(frames.map(f=>f.scene)).size,3);
  for(let i=1;i<frames.length;i++){
   assert.ok(frames[i].eventSequence>=frames[i-1].eventSequence,'Replay event numbers cannot go backward');
   assert.ok(frames[i].scene>=frames[i-1].scene,'Scene order cannot go backward');
   if(frames[i].scene===frames[i-1].scene)assert.equal(frames[i].tiles,frames[i-1].tiles,'Static scene map is shared instead of duplicated per frame');
  }
  assert.deepEqual(reconstructReplay(JSON.parse(stored)).at(-1),game,'Reloading the archive produces the same outcome');
 });
}

test('ten human seats can complete a full classic game and reconstruct the same state',()=>{
 const initial=createGame(players(10,false),{rules:'classic',biome:'ruins',seed:'ten-replay-seats',narrator:'dramatic',companions:0});
 let game=runBots(initial),archive=newReplay(initial),steps=0;
 while(game.status==='playing'&&steps++<1000){const playerId=game.actors.find(a=>a.id===game.activeActorId)!.playerId!;const action=chooseAction(game);game=runBots(applyAction(game,playerId,action));archive=appendReplay(archive,{type:'action',playerId,action});}
 assert.equal(game.status,'victory');assert.deepEqual(reconstructReplay(archive).at(-1),game);
});

test('a loss and a disconnected player takeover reconstruct without resurrecting heroes',()=>{
 const initial=createGame(players(1),{rules:'simple',biome:'coast',seed:'defeat-replay',narrator:'warm',companions:0});
 let game=runBots(initial),archive=newReplay(initial),steps=0;
 while(game.status==='playing'&&steps++<100){const playerId=game.actors.find(a=>a.id===game.activeActorId)!.playerId!;const action:GameAction={type:game.actors.find(a=>a.id===game.activeActorId)!.actionUsed?'end':'guard'};game=runBots(applyAction(game,playerId,action));archive=appendReplay(archive,{type:'action',playerId,action});}
 assert.equal(game.status,'defeat');assert.deepEqual(reconstructReplay(archive).at(-1),game);
 const party=createGame(players(3,false),{rules:'classic',biome:'woodland',seed:'depart-replay',narrator:'wry',companions:0});
 let active=runBots(party);const leaving=active.actors.find(a=>a.id===active.activeActorId)!.playerId!;
 const replay=appendReplay(newReplay(party),{type:'depart',playerId:leaving,run:true});
 active=structuredClone(active);active.actors.find(a=>a.playerId===leaving)!.bot=true;active=runBots(active);
 assert.deepEqual(reconstructReplay(replay).at(-1),active);
});
