import type {GameState, ReplayArchive, ReplayCommand} from './types.ts';
import {applyAction,runBots} from './engine.ts';
import {acceptNarration} from './campaign.ts';
export type {ReplayArchive} from './types.ts';

export function newReplay(initial:GameState,complete=true):ReplayArchive {
 return {schemaVersion:1,initial:structuredClone(initial),commands:[],complete};
}
export function appendReplay(replay:ReplayArchive,command:ReplayCommand):ReplayArchive {
 return {...replay,commands:[...replay.commands,structuredClone(command)]};
}
/** Stored as a seed state plus accepted inputs, never a second source of authority. */
export function* iterateReplay(archive:ReplayArchive):Generator<GameState> {
 if(archive.schemaVersion!==1)throw new Error('This replay uses an unsupported version.');
 let last:GameState|undefined;const maps=new Map<number,GameState['tiles']>();
 const normalize=(game:GameState)=>{
  if(last&&last.story?.narrations.length===game.story?.narrations.length&&last.eventSequence===game.eventSequence&&last.activeActorId===game.activeActorId&&last.round===game.round&&last.status===game.status&&last.scene===game.scene&&last.actors.every((a,i)=>a.bot===game.actors[i]?.bot))return null;
  // Maps are immutable within a chapter; sharing them keeps long replays small.
  const tiles=maps.get(game.scene)??game.tiles;maps.set(game.scene,tiles);
  last={...game,tiles};return last;
 };
 let game=structuredClone(archive.initial),frame=normalize(game);if(frame)yield frame;
 let pending:GameState[]=[];game=runBots(game,g=>pending.push(g));pending.push(game);
 for(const state of pending){frame=normalize(state);if(frame)yield frame;}
 for(const command of archive.commands){
  pending=[];
  if(command.type==='narration'){
   game=acceptNarration(game,command.record);
  }else if(command.type==='action'){
   game=applyAction(game,command.playerId,command.action);frame=normalize(game);if(frame)yield frame;
   game=runBots(game,g=>pending.push(g));
  }else{
   game=structuredClone(game);const actor=game.actors.find(a=>a.playerId===command.playerId);if(actor)actor.bot=true;
   if(command.run)game=runBots(game,g=>pending.push(g));
  }
  pending.push(game);for(const state of pending){frame=normalize(state);if(frame)yield frame;}
 }
}
export function reconstructReplay(archive:ReplayArchive):GameState[]{return [...iterateReplay(archive)];}
/** Yield between batches so the UI can remain responsive while opening long games. */
export async function reconstructReplayAsync(archive:ReplayArchive,signal?:AbortSignal):Promise<GameState[]>{
 const frames:GameState[]=[];let started=performance.now();
 for(const frame of iterateReplay(archive)){
  if(signal?.aborted)throw new DOMException('Replay cancelled.','AbortError');frames.push(frame);
  if(performance.now()-started>12){await new Promise(resolve=>setTimeout(resolve,0));started=performance.now();}
 }
 return frames;
}
