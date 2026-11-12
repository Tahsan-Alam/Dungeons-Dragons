import type {GameState} from '../../game/types';
import {isBoardDiscontinuity} from './board-motion.ts';

export interface BoardFeedback {
 key:string;
 actorId:string;
 x:number;
 y:number;
 kind:'damage'|'critical'|'miss'|'heal';
 text:string;
}

/** Presentation-only: derives floating results from two validated snapshots. */
export function collectBoardFeedback(before:GameState,after:GameState):BoardFeedback[] {
 if(before===after||after.eventSequence<=before.eventSequence||isBoardDiscontinuity(before,after))return [];
 const items:BoardFeedback[]=[],struck=new Map<string,number>();
 for(const event of after.events){
  if(event.id<=before.eventSequence||!event.attack)continue;
  const target=after.actors.find(a=>a.id===event.attack!.targetId);
  if(!target)continue;
  const {hit,critical,damage}=event.attack;
  if(hit)struck.set(target.id,(struck.get(target.id)??0)+damage);
  items.push({key:`event-${event.id}`,actorId:target.id,x:target.x,y:target.y,kind:!hit?'miss':critical?'critical':'damage',text:!hit?'Miss':critical?`−${damage}!`:`−${damage}`});
 }
 for(const actor of after.actors){
  const earlier=before.actors.find(a=>a.id===actor.id);
  if(!earlier)continue;
  // Health gained beyond what the recorded strikes explain came from a potion, power or revival.
  const expected=Math.max(0,earlier.hp-(struck.get(actor.id)??0)),gained=actor.hp-expected;
  if(gained>0)items.push({key:`heal-${after.eventSequence}-${actor.id}`,actorId:actor.id,x:actor.x,y:actor.y,kind:'heal',text:`+${gained}`});
 }
 return items;
}
