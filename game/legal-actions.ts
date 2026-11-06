import {applyAction,getReachable} from './engine.ts';
import type {GameAction,GameState} from './types.ts';
import {classifyFixtureIntent} from './ai.ts';
export interface LegalChoice {id:string;label:string;action:GameAction;}
/** The pure engine validates candidates on copies; the real RNG/state is untouched. */
export function legalChoices(game:GameState,playerId:string):LegalChoice[]{
 const actor=game.actors.find(a=>a.id===game.activeActorId);
 if(!actor||actor.playerId!==playerId||actor.bot||game.status!=='playing')return [];
 const candidates:GameAction[]=[{type:'guard'},{type:'potion'},{type:'interact'},{type:'advance'},{type:'end'},
  ...game.actors.flatMap(a=>[{type:'attack' as const,targetId:a.id},{type:'ability' as const,targetId:a.id}]),
  ...getReachable(game,actor).map(p=>({type:'move' as const,...p}))];
 return candidates.filter(a=>{try{applyAction(game,playerId,a);return true;}catch{return false;}}).map((a,i)=>({id:`${game.eventSequence}:${i}`,action:a,
  label:a.type==='move'?`Move to ${a.x}, ${a.y}`:'targetId' in a?`${a.type}: ${game.actors.find(t=>t.id===a.targetId)?.name}`:a.type}));
}
export function fixtureChoice(text:string,choices:LegalChoice[]):string|null {
 const result=classifyFixtureIntent({text,allowed:choices.map(c=>c.action.type)});
 const matches=choices.filter(c=>c.action.type===result.decision);
 return matches.length===1?matches[0].id:null;
}
