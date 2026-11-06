import type {Actor,GameState} from '../../game/types';
import {getQuestAction,getValidTargets} from '../../game/engine.ts';
import {CLASS_INFO} from '../../game/types.ts';

/** Presentation copy derives availability from the same rules as the board. */
export function turnGuidance(game:GameState,actor:Actor|undefined,myTurn:boolean,tool:'move'|'attack'|'ability'):string {
 if(game.status!=='playing')return game.status==='victory'?'Adventure complete. All three shards recovered.':'The party has fallen. Your adventure is saved.';
 if(!myTurn||!actor)return `Waiting for ${actor?.name??'the party'}. You can inspect characters or read the log.`;
 const quest=getQuestAction(game,actor);
 if(quest){
  if(!quest.available&&actor.movement===0)return `End your turn to recover movement, then reach the ${game.chest.opened?'gateway':'chest'}.`;
  if(!quest.available&&tool!=='move')return `Choose Move. ${quest.hint}`;
  return quest.hint;
 }
 if(actor.actionUsed)return actor.movement>0?'Action used. Reposition or end your turn.':'Turn complete. End your turn to continue.';
 if(tool==='attack'||tool==='ability'){
  const healing=tool==='ability'&&actor.heroClass==='cleric';
  const targets=getValidTargets(game,actor,tool==='ability');
  if(!targets.length){
   if(healing&&!game.actors.some(a=>!a.enemy&&!a.defeated&&a.hp<a.maxHp))return 'Your allies are at full health. Choose another action.';
   if(actor.movement===0)return healing?'No injured ally in reach. Choose another action or end your turn.':'No enemy in reach. Guard, use a potion, or end your turn.';
   return healing?'No injured ally in reach. Choose Move to get closer with a clear line of sight.':'No enemy in reach. Choose Move to get closer with a clear line of sight.';
  }
  const count=`${targets.length} ${targets.length===1?'target':'targets'} available`;
  return `${tool==='ability'?CLASS_INFO[actor.heroClass].ability:'Attack'}: ${count}. Select a highlighted ${healing?'ally':'enemy'}.`;
 }
 return actor.movement>0?'Select a highlighted tile to move, or an enemy to attack.':'Movement used. Attack, use a power, or guard; then end turn.';
}
