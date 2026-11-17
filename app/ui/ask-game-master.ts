import type {GameState,RoomView,Session} from '../../game/types';
import {guidanceFixture} from '../../game/campaign';

type Assistance={reply?:string};

/** Asks the Game Master a question. Solo play answers from the game's own guidance; a party asks the room's
    narrator and falls back to that guidance when it is unavailable. Never changes the game. */
export async function askGameMaster({game,room,session,prompt,signal}:{game:GameState;room:RoomView|null;session:Session|null;prompt:string;signal?:AbortSignal}):Promise<{answer:string;local:boolean}> {
 const local=guidanceFixture(game,prompt,session?.playerId??'you');
 if(!session||!room)return {answer:local,local:false};
 try{
  const response=await fetch(`/api/rooms/${session.code}/assist`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.token}`},
   body:JSON.stringify({version:room.version,text:prompt,guidance:true}),signal:AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(20_000)])});
  if(!response.ok)throw new Error('unavailable');
  const data:Assistance=await response.json();
  return {answer:data.reply||local,local:!data.reply};
 }catch(error){
  if(signal?.aborted)throw error;
  return {answer:local,local:true};
 }
}

/** Three questions that fit the moment: the first follows the encounter, then what to do and how to play. */
export function suggestedQuestions(game:GameState):string[] {
 const foes=game.actors.some(a=>a.enemy&&!a.defeated&&a.hp>0);
 const first=foes?'What do you know about the guardians?':!game.chest.opened?'What’s in the chest?':'How do I reach the gateway?';
 return [first,'What should I do next?','How do I play?'];
}
