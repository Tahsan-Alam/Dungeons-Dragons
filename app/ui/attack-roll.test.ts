import assert from 'node:assert/strict';
import test from 'node:test';
import {applyAction,createGame} from '../../game/engine.ts';
import {DEFAULT_OPTIONS} from '../../game/types.ts';
import {appendReplay,newReplay,reconstructReplay} from '../../game/replay.ts';
import {prepareAttackRoll,canStartAttackRoll,findAttackRollResult} from './attack-roll.ts';
import type {HeroClass} from '../../game/types';

function fixture(heroClass:HeroClass='ranger'){
 const game=createGame([{id:'you',name:'Clover',heroClass,color:'#9dc3e6',bot:false}],{...DEFAULT_OPTIONS,companions:0,seed:'manual-dice'});
 const actor=game.actors.find(a=>a.playerId==='you')!,target=game.actors.find(a=>a.enemy)!;
 target.x=actor.x+1;target.y=actor.y;
 game.tiles[target.y*game.width+target.x].kind='path';
 const action={type:'attack' as const,targetId:target.id};
 return {game,actor,target,action};
}

test('target preparation and cancellation do not roll, spend an action, or change game state',()=>{
 const {game,actor,action}=fixture(),before=structuredClone(game);
 const request=prepareAttackRoll(game,actor,action)!;
 assert.ok(request);assert.equal(canStartAttackRoll(game,request),true);
 assert.equal(findAttackRollResult(game,request),undefined);
 assert.deepEqual(game,before);
 assert.deepEqual(prepareAttackRoll(game,actor,action),request);
});

test('stale turns, state changes, invalid targets and depleted powers cannot start a roll',()=>{
 const {game,actor,target,action}=fixture(),request=prepareAttackRoll(game,actor,action)!;
 for(const mutate of [()=>{game.round++},()=>{game.scene++},()=>{game.eventSequence++},()=>{game.activeActorId=target.id},()=>{actor.actionUsed=true},()=>{actor.bot=true},()=>{target.hp=0}]){
  const before=structuredClone(game);mutate();assert.equal(canStartAttackRoll(game,request),false);
  Object.assign(game,before);Object.assign(actor,before.actors.find(a=>a.id===actor.id));Object.assign(target,before.actors.find(a=>a.id===target.id));
  // Keep local actor references attached after restoring the game snapshot.
  game.actors=game.actors.map(a=>a.id===actor.id?actor:a.id===target.id?target:a);
 }
 target.x=game.width-2;target.y=1;assert.equal(prepareAttackRoll(game,actor,action),null);
 target.x=actor.x+1;target.y=actor.y;actor.abilityUses=0;
 assert.equal(prepareAttackRoll(game,actor,{...action,type:'ability'}),null);
});

test('confirmed hits, misses and criticals expose actual rolled damage, including overkill',()=>{
 const observed=new Set<string>();
 for(let seed=1;seed<=300&&observed.size<3;seed++){
  const {game,actor,target,action}=fixture();game.rng=(seed*102394717)>>>0;target.hp=1;
  const request=prepareAttackRoll(game,actor,action)!,next=applyAction(game,'you',action),result=findAttackRollResult(next,request)!;
  assert.ok(result?.attack);assert.equal(result.attack.targetId,target.id);
  const category=result.attack.critical?'critical':result.attack.hit?'hit':'miss';observed.add(category);
  assert.equal(result.attack.critical,result.roll===20);
  assert.equal(result.attack.hit,result.roll!==1);
  if(result.attack.hit){assert.ok(result.attack.damage>1);assert.ok(result.text.includes(`for ${result.attack.damage} damage`));assert.equal(next.actors.find(a=>a.id===target.id)!.hp,0)}
  else{assert.equal(result.attack.damage,0);assert.equal(next.actors.find(a=>a.id===target.id)!.hp,1)}
  assert.equal(game.actors.find(a=>a.id===actor.id)!.actionUsed,false);
  assert.throws(()=>applyAction(next,'you',action),/action is used/);
 }
 assert.deepEqual([...observed].sort(),['critical','hit','miss']);
});

test('offensive powers share the roll flow while cleric healing stays separate',()=>{
 for(const heroClass of ['knight','ranger','mage'] as const){
  const {game,actor,action}=fixture(heroClass),power={...action,type:'ability' as const};
  const request=prepareAttackRoll(game,actor,power)!;assert.ok(request);
  const result=findAttackRollResult(applyAction(game,'you',power),request)!;
  assert.equal(result.attack?.action,'ability');
 }
 const {game,actor}=fixture('cleric');actor.hp--;
 assert.equal(prepareAttackRoll(game,actor,{type:'ability',targetId:actor.id}),null);
});

test('roll results never attach another actor, target, action, old event or later turn',()=>{
 const {game,actor,action}=fixture(),request=prepareAttackRoll(game,actor,action)!;
 const next=applyAction(game,'you',action),result=findAttackRollResult(next,request)!;
 assert.ok(result);
 const wrong=[{...result,actorId:'other'},{...result,id:request.eventSequence},{...result,id:request.eventSequence+2},{...result,attack:{...result.attack!,targetId:actor.id}},{...result,attack:{...result.attack!,action:'ability' as const}},{...result,attack:undefined}];
 for(const e of wrong)assert.equal(findAttackRollResult({...next,events:[e]},request),undefined);
});

test('classic armor checks and replay use the same authoritative structured result',()=>{
 const {game,actor,target,action}=fixture();game.options.rules='classic';target.ac=100;
 const request=prepareAttackRoll(game,actor,action)!;
 const next=applyAction(game,'you',action),result=findAttackRollResult(next,request)!;
 assert.equal(result.attack!.hit,result.roll===20);
 const frames=reconstructReplay(appendReplay(newReplay(game),{type:'action',playerId:'you',action}));
 assert.deepEqual(findAttackRollResult(frames.at(-1)!,request),result);
});
