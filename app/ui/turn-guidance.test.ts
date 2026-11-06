import assert from 'node:assert/strict';
import test from 'node:test';
import {createGame,getValidTargets} from '../../game/engine.ts';
import {DEFAULT_OPTIONS} from '../../game/types.ts';
import {turnGuidance} from './turn-guidance.ts';

function fixture(heroClass:'ranger'|'cleric'='ranger'){
 const game=createGame([{id:'you',name:'Rowan',heroClass,color:'#9dc3e6',bot:false}],{...DEFAULT_OPTIONS,companions:0,seed:'guidance'});
 const actor=game.actors.find(a=>a.playerId==='you')!;
 game.activeActorId=actor.id;
 return {game,actor};
}

test('target guidance distinguishes no targets from legal choices without mutating the game',()=>{
 const {game,actor}=fixture(),before=structuredClone(game);
 assert.match(turnGuidance(game,actor,true,'attack'),/No enemy in reach/);
 assert.match(turnGuidance(game,actor,true,'attack'),/Choose Move/);
 assert.deepEqual(game,before);
 const enemy=game.actors.find(a=>a.enemy)!;enemy.x=actor.x+1;enemy.y=actor.y;
 game.tiles[enemy.y*game.width+enemy.x].kind='path';
 assert.ok(getValidTargets(game,actor).length>0);
 assert.match(turnGuidance(game,actor,true,'attack'),/target.*available/);
});

test('healing guidance distinguishes healthy allies and a legal healing target',()=>{
 const {game,actor}=fixture('cleric');
 assert.match(turnGuidance(game,actor,true,'ability'),/full health/);
 actor.hp--;
 assert.match(turnGuidance(game,actor,true,'ability'),/Select a highlighted ally/);
});

test('spent turns, waiting and cleared objectives provide the appropriate next action',()=>{
 const {game,actor}=fixture();actor.actionUsed=true;
 assert.match(turnGuidance(game,actor,true,'attack'),/Reposition or end/);
 actor.movement=0;
 assert.match(turnGuidance(game,actor,true,'move'),/Turn complete/);
 assert.match(turnGuidance(game,actor,false,'move'),/Waiting for Rowan/);
 game.actors.filter(a=>a.enemy).forEach(a=>{a.hp=0;a.defeated=true});
 assert.match(turnGuidance(game,actor,true,'move'),/chest/);
 assert.match(turnGuidance(game,actor,true,'move'),/End your turn to recover movement/);
 actor.x=game.chest.x-1;actor.y=game.chest.y;
 assert.match(turnGuidance(game,actor,true,'move'),/Loot the chest/);
 game.status='victory';
 assert.match(turnGuidance(game,actor,false,'move'),/Adventure complete/);
 game.status='defeat';
 assert.match(turnGuidance(game,actor,false,'move'),/party has fallen/);
});
