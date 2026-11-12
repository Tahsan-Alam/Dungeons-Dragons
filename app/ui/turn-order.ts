import type {Actor,GameState} from '../../game/types';

export interface TurnSlot {
 actor:Actor;
 current:boolean;
 /** The first slot that acts after the round counter advances. */
 nextRound:boolean;
}

/** Who acts now and next, following the engine's order and skipping characters who cannot act. */
export function upcomingTurns(game:GameState):TurnSlot[] {
 if(game.status!=='playing'||!game.turnOrder.length)return [];
 const start=Math.max(0,game.turnOrder.indexOf(game.activeActorId)),slots:TurnSlot[]=[];
 let wrapped=false;
 for(let step=0;step<game.turnOrder.length;step++){
  const index=(start+step)%game.turnOrder.length,actor=game.actors.find(a=>a.id===game.turnOrder[index]);
  if(!actor||actor.defeated||actor.hp<=0)continue;
  const nextRound=step>0&&index<start&&!wrapped;
  if(nextRound)wrapped=true;
  slots.push({actor,current:step===0,nextRound});
 }
 return slots;
}
