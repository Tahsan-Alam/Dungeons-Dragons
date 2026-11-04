import type {Actor,GameEvent,GameState} from '../../game/types';
import {CLASS_INFO} from '../../game/types.ts';

export interface SharedRoll {
 event:GameEvent;
 actorName:string;
 targetName?:string;
 description:string;
}
export interface RollFeed {
 gameId:string|null;
 seen:number;
 actors:Record<string,Actor>;
 queue:SharedRoll[];
}
const actorsById=(game:GameState)=>Object.fromEntries(game.actors.map(a=>[a.id,a]));

/** Opening a saved table starts here; its historical rolls stay in the journal. */
export function startRollFeed(gameId:string|null,game:GameState|null,includeOpeningRolls=false):RollFeed {
 return {gameId,seen:includeOpeningRolls?0:game?.eventSequence??0,actors:game?actorsById(game):{},queue:[]};
}

export function collectSharedRolls(feed:RollFeed,gameId:string|null,game:GameState|null,playerId:string,includeOpeningRolls=false):RollFeed {
 if(feed.gameId!==gameId)feed=startRollFeed(gameId,game,includeOpeningRolls);
 if(!game||game.eventSequence<=feed.seen)return feed;
 const actors={...feed.actors,...actorsById(game)};
 const fresh=game.events.filter(e=>e.id>feed.seen&&e.kind==='roll'&&e.roll!==undefined).sort((a,b)=>a.id-b.id);
 const queue=[...feed.queue];
 for(const event of fresh){
  const actor=actors[event.actorId??''];
  // The human's own attack already has its interactive roll/result dialog.
  // Their automatic death saves, and all companion/enemy rolls, still belong here.
  if(event.attack&&actor?.playerId===playerId&&!actor.bot)continue;
  const source=actor?.enemy?'Enemy':actor?.bot?'Companion':'Player';
  const action=event.attack?.action==='ability'&&actor?CLASS_INFO[actor.heroClass].ability:event.attack?'Attack':'d20 roll';
  queue.push({event,actorName:actor?.name??'Character',targetName:event.attack?actors[event.attack.targetId]?.name:undefined,description:`${source} · ${action}`});
 }
 return {gameId,seen:game.eventSequence,actors,queue};
}

export function dismissSharedRoll(feed:RollFeed,eventId:number):RollFeed {
 // A late animation callback must never dismiss the next item in the queue.
 return feed.queue[0]?.event.id===eventId?{...feed,queue:feed.queue.slice(1)}:feed;
}
