import type {Actor,GameAction,GameState} from '../../game/types';
import {getValidTargets} from '../../game/engine.ts';
import {CLASS_INFO} from '../../game/types.ts';

export type AttackAction=Extract<GameAction,{targetId:string}>;
export interface AttackRollRequest {
 action:AttackAction;
 actorId:string;
 targetName:string;
 title:string;
 eventSequence:number;
 round:number;
 scene:number;
}

/** Selecting a target never advances the random generator or submits a command. */
export function prepareAttackRoll(game:GameState,actor:Actor,action:AttackAction):AttackRollRequest|null {
 if(actor.bot||game.activeActorId!==actor.id||(action.type==='ability'&&actor.heroClass==='cleric'))return null;
 const target=getValidTargets(game,actor,action.type==='ability').find(a=>a.id===action.targetId);
 return target?{action:{...action},actorId:actor.id,targetName:target.name,title:action.type==='ability'?CLASS_INFO[actor.heroClass].ability:'Attack',eventSequence:game.eventSequence,round:game.round,scene:game.scene}:null;
}

export function canStartAttackRoll(game:GameState,request:AttackRollRequest):boolean {
 if(game.activeActorId!==request.actorId||game.eventSequence!==request.eventSequence||game.round!==request.round||game.scene!==request.scene)return false;
 const actor=game.actors.find(a=>a.id===request.actorId);
 return !!actor&&!!prepareAttackRoll(game,actor,request.action);
}

/** The attack must be the next accepted event, not a later turn or another player's roll. */
export function findAttackRollResult(game:GameState,request:AttackRollRequest) {
 return game.events.find(e=>e.id===request.eventSequence+1&&e.kind==='roll'&&e.actorId===request.actorId&&e.roll!==undefined&&e.attack?.targetId===request.action.targetId&&e.attack.action===request.action.type);
}
