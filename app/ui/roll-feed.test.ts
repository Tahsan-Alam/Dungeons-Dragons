import assert from 'node:assert/strict';
import test from 'node:test';
import {applyAction,createGame,runBots} from '../../game/engine.ts';
import {DEFAULT_OPTIONS} from '../../game/types.ts';
import type {GameEvent,GameState} from '../../game/types';
import {collectSharedRolls,dismissSharedRoll,startRollFeed} from './roll-feed.ts';

function fixture(){
 const game=createGame([
  {id:'you',name:'Clover',heroClass:'ranger',color:'#9dc3e6',bot:false},
  {id:'friend',name:'Rowan',heroClass:'ranger',color:'#9dc3e6',bot:false},
  {id:'companion',name:'Pip',heroClass:'ranger',color:'#9dc3e6',bot:true},
 ],{...DEFAULT_OPTIONS,companions:1,seed:'shared-dice'});
 game.tiles.forEach(t=>{if(t.x>0&&t.x<game.width-1&&t.y>0&&t.y<game.height-1)t.kind='path'});
 game.actors.forEach((a,i)=>{a.x=3+i;a.y=7;a.hp=a.maxHp=100});
 return game;
}
function addRoll(game:GameState,actorId:string,targetId:string):GameEvent {
 const event:GameEvent={id:++game.eventSequence,kind:'roll',actorId,roll:17,text:'Confirmed hit for 8 damage.',attack:{targetId,action:'attack',hit:true,critical:false,damage:8}};
 game.events.push(event);return event;
}

test('opening or resuming a table does not replay historical rolls',()=>{
 const game=fixture();addRoll(game,game.actors[1].id,game.actors[3].id);
 const feed=startRollFeed('game-a',game);
 assert.equal(feed.queue.length,0);assert.equal(collectSharedRolls(feed,'game-a',game,'you'),feed);
});

test('a newly created adventure includes opening computer turns without replaying them twice',()=>{
 const game=fixture();addRoll(game,game.actors[3].id,game.actors[0].id);
 const feed=collectSharedRolls(startRollFeed(null,null),'new-game',game,'you',true);
 assert.equal(feed.queue.length,1);
 assert.equal(collectSharedRolls(feed,'new-game',structuredClone(game),'you',true),feed);
});

test('another human attack is shown to the observer, not duplicated for the attacker',()=>{
 const game=fixture(),feed=startRollFeed('game-a',game);
 game.activeActorId=game.actors[1].id;
 const next=applyAction(game,'friend',{type:'attack',targetId:game.actors[3].id});
 const observer=collectSharedRolls(feed,'game-a',next,'you');
 assert.equal(observer.queue.length,1);assert.equal(observer.queue[0].actorName,'Rowan');
 assert.equal(observer.queue[0].targetName,game.actors[3].name);
 assert.equal(observer.queue[0].event.roll,next.events.at(-1)!.roll);
 assert.equal(collectSharedRolls(feed,'game-a',next,'friend').queue.length,0);
});

test('a batch of real companion and enemy turns queues every roll in event order',()=>{
 const game=fixture();game.actors.find(a=>a.playerId==='friend')!.bot=true;
 const before=structuredClone(game),feed=startRollFeed('game-a',game);
 const next=runBots(applyAction(game,'you',{type:'end'}));
 const expected=next.events.filter(e=>e.id>game.eventSequence&&e.kind==='roll'&&e.roll!==undefined);
 const collected=collectSharedRolls(feed,'game-a',next,'you');
 assert.ok(expected.length>=3);assert.deepEqual(collected.queue.map(r=>r.event),expected);
 assert.ok(collected.queue.some(r=>r.description.startsWith('Companion')));
 assert.ok(collected.queue.some(r=>r.description.startsWith('Enemy')));
 assert.deepEqual(game,before);
});

test('repeat polls, stale snapshots and late dismissal callbacks cannot duplicate or skip rolls',()=>{
 const game=fixture();let feed=startRollFeed('game-a',game);const stale=structuredClone(game);
 const first=addRoll(game,game.actors[1].id,game.actors[3].id),second=addRoll(game,game.actors[2].id,game.actors[3].id);
 feed=collectSharedRolls(feed,'game-a',game,'you');
 assert.equal(collectSharedRolls(feed,'game-a',structuredClone(game),'you'),feed);
 assert.equal(collectSharedRolls(feed,'game-a',stale,'you'),feed);
 feed=dismissSharedRoll(feed,first.id);assert.equal(feed.queue[0].event.id,second.id);
 assert.equal(dismissSharedRoll(feed,first.id),feed);
 assert.equal(collectSharedRolls(feed,'game-a',game,'you').queue.length,1);
});

test('new incoming rolls append while an earlier result remains on screen',()=>{
 const game=fixture();let feed=startRollFeed('game-a',game);
 addRoll(game,game.actors[1].id,game.actors[3].id);feed=collectSharedRolls(feed,'game-a',game,'you');
 const shown=feed.queue[0];addRoll(game,game.actors[3].id,game.actors[0].id);
 feed=collectSharedRolls(feed,'game-a',game,'you');assert.equal(feed.queue[0],shown);assert.equal(feed.queue.length,2);
});

test('own automatic death saves are shown but own manually triggered attacks are not',()=>{
 const game=fixture(),feed=startRollFeed('game-a',game);
 addRoll(game,game.actors[0].id,game.actors[3].id);
 game.events.push({id:++game.eventSequence,kind:'roll',actorId:game.actors[0].id,roll:12,text:'Clover succeeds on a death save.'});
 const collected=collectSharedRolls(feed,'game-a',game,'you');
 assert.equal(collected.queue.length,1);assert.equal(collected.queue[0].event.roll,12);assert.equal(collected.queue[0].actorName,'Clover');
});

test('scene changes preserve names for removed enemies and switching tables clears the queue',()=>{
 const game=fixture(),feed=startRollFeed('game-a',game),enemy=game.actors[3];
 addRoll(game,enemy.id,game.actors[0].id);game.actors=game.actors.filter(a=>a.id!==enemy.id);game.scene++;
 const collected=collectSharedRolls(feed,'game-a',game,'you');
 assert.equal(collected.queue[0].actorName,enemy.name);assert.ok(collected.queue[0].description.startsWith('Enemy'));
 assert.equal(collectSharedRolls(collected,'game-b',fixture(),'you').queue.length,0);
 assert.equal(collectSharedRolls(collected,null,null,'you').queue.length,0);
});

test('final attacks remain queued after defeat and historical events without structured results still display',()=>{
 const game=fixture(),feed=startRollFeed('game-a',game);
 game.events.push({id:++game.eventSequence,kind:'roll',actorId:game.actors[3].id,roll:20,text:'An enemy lands the final blow.'});game.status='defeat';
 const collected=collectSharedRolls(feed,'game-a',game,'you');
 assert.equal(collected.queue.length,1);assert.equal(collected.queue[0].event.roll,20);
});
