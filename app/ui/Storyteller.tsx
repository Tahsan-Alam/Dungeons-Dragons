'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {GameState,RoomView,Session} from '../../game/types';
import {applyStoryDirection,guidanceFixture} from '../../game/campaign';
import type {AudioPreferences} from './audio-preferences';
import {currentNarration} from '../../game/ai';
import {Icon} from './Art';
import NarratorAvatar from './NarratorAvatar';
import './narrator.css';

type Props={game:GameState|null;room:RoomView|null;session:Session|null;narrate:()=>unknown;steer?:(text:string)=>Promise<unknown>;busy:boolean;preferences:AudioPreferences;automaticSpeaking?:boolean};
type Assistance={reply?:string;source?:'fixture'|'openai';audio?:string|null;version?:number};

export default function Storyteller({game,room,session,narrate,steer,busy,preferences,automaticSpeaking=false}:Props){
 const [text,setText]=useState(''),[direction,setDirection]=useState(''),[reply,setReply]=useState(''),[pending,setPending]=useState(false),[cancelable,setCancelable]=useState(false),[talking,setTalking]=useState(false);
 const request=useRef<AbortController|null>(null),audio=useRef<HTMLAudioElement|null>(null),deviceLine=useRef<SpeechSynthesisUtterance|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),epoch=useRef(0);
 const stopPlayback=useCallback(()=>{
  if(audio.current){audio.current.onended=null;audio.current.onerror=null;audio.current.pause();audio.current=null;}
  if(timer.current){clearTimeout(timer.current);timer.current=null;}
  const spoken=deviceLine.current;deviceLine.current=null;
  if(spoken){spoken.onstart=null;spoken.onend=null;spoken.onerror=null;window.speechSynthesis?.cancel();}
 },[]);
 const stop=useCallback(()=>{epoch.current++;request.current?.abort();request.current=null;stopPlayback();setPending(false);setCancelable(false);setTalking(false);},[stopPlayback]);
 // The external game moment and voice level own playback lifetime and its UI state.
 // eslint-disable-next-line react-hooks/set-state-in-effect
 useEffect(()=>{stop();return()=>{epoch.current++;request.current?.abort();stopPlayback();};},[game?.eventSequence,room?.code,preferences.voiceVolume,stop,stopPlayback]);

 const host=!room||room.hostId===session?.playerId;
 const caption=game?currentNarration(game):'';
 const disabled=busy||pending;

 function deviceSpeech(line:string,requestEpoch:number){
  if(!window.speechSynthesis||typeof SpeechSynthesisUtterance!=='function'){
   setReply('Speech is unavailable on this device. You can read the story above.');return;
  }
  const spoken=new SpeechSynthesisUtterance(line);deviceLine.current=spoken;
  spoken.volume=preferences.voiceVolume;spoken.rate=preferences.speechRate;
  spoken.onstart=()=>{if(deviceLine.current===spoken&&requestEpoch===epoch.current)setTalking(true);};
  spoken.onend=()=>{if(deviceLine.current!==spoken)return;deviceLine.current=null;if(requestEpoch===epoch.current){setTalking(false);if(timer.current)clearTimeout(timer.current);}};
  spoken.onerror=event=>{if(deviceLine.current!==spoken)return;deviceLine.current=null;if(requestEpoch===epoch.current){setTalking(false);if(event.error!=='canceled'&&event.error!=='interrupted')setReply('Audio could not play. The story remains above.');}};
  setTalking(true);window.speechSynthesis.speak(spoken);timer.current=setTimeout(stop,45_000);
 }

 async function ask(prompt=text){
  if(!game||pending||!prompt.trim())return;
  stop();setPending(true);setCancelable(true);setReply('');const requestEpoch=epoch.current,controller=new AbortController();request.current=controller;
  try{
   let answer=guidanceFixture(game,prompt,session?.playerId??'you');
   if(session&&room){
    const response=await fetch(`/api/rooms/${session.code}/assist`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.token}`},body:JSON.stringify({version:room.version,text:prompt,guidance:true}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(20_000)])});
    if(!response.ok)throw new Error('unavailable');
    const data:Assistance=await response.json();if(data.reply)answer=data.reply;
   }
   if(requestEpoch===epoch.current){setReply(answer);setText('');}
  }catch{
   if(requestEpoch===epoch.current)setReply(`${guidanceFixture(game,prompt,session?.playerId??'you')} Pip is using local guidance for this reply.`);
  }finally{if(requestEpoch===epoch.current){request.current=null;setPending(false);}}
 }

 async function listen(){
  if(!game||pending)return;
  if(talking||automaticSpeaking){stop();window.speechSynthesis?.cancel();return;}
  if(preferences.voiceVolume===0){setReply('Narration is muted. Raise the narration volume in Sound settings to listen.');return;}
  stop();window.speechSynthesis?.cancel();setPending(true);setCancelable(true);const requestEpoch=epoch.current,controller=new AbortController();request.current=controller;
  let usedDevice=false;
  const fallback=()=>{if(usedDevice||requestEpoch!==epoch.current)return;usedDevice=true;stopPlayback();deviceSpeech(caption,requestEpoch);};
  try{
   let clip:string|null=null;
   if(session&&room){
    const response=await fetch(`/api/rooms/${session.code}/assist`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.token}`},body:JSON.stringify({version:room.version,audio:true}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(20_000)])});
    if(response.ok){const data:Assistance=await response.json();clip=data.audio??null;}
   }
   if(requestEpoch!==epoch.current)return;
   if(clip){
    const player=new Audio(clip);audio.current=player;player.volume=preferences.voiceVolume;player.playbackRate=preferences.speechRate;
    player.onended=()=>{if(requestEpoch===epoch.current){setTalking(false);if(timer.current)clearTimeout(timer.current);}};
    player.onerror=fallback;
    await player.play();
    if(requestEpoch!==epoch.current){player.pause();return;}
    setTalking(true);timer.current=setTimeout(stop,45_000);
   }else fallback();
  }catch{fallback();}
  finally{if(requestEpoch===epoch.current){request.current=null;setPending(false);}}
 }

 async function tellMoment(){
  if(disabled||!host)return;stop();setPending(true);
  try{await narrate();}catch{setReply('Pip could not refresh the story. The current caption remains above.');}finally{setPending(false);}
 }

 async function guide(prompt=direction){
  if(!steer||!game||!host||disabled||!prompt.trim())return;
  stop();setReply('');setPending(true);
  try{
   const next=applyStoryDirection(game,prompt.trim()).story?.direction;
   const changed=await steer(prompt.trim());
   if(changed!==true){setReply('The story could not change yet. Your request is still here; try again from the current turn.');return;}
   setReply(next?.endAfterChapter?'Let’s bring this adventure home. Finish the current chapter’s objective and reach its gateway for the ending.':game.story?.direction?.endAfterChapter?'We’ll keep the adventure going beyond this chapter.':next?.pace==='brisk'?'I’ll keep the story brisk and focus on your next objective. The board still gives every hero their turn.':'I’ll carry that direction into the next telling, while keeping what your party has already done.');
   setDirection('');
  }catch{setReply('The story could not change yet. Try again from the current turn.');}
  finally{setPending(false);}
 }

 return <div className="pip-panel ai-summary">
  <div className="pip-heading"><NarratorAvatar talking={talking||automaticSpeaking}/><div><h3>Pip, your lantern guide</h3></div></div>
  {game?<>
   <section className="pip-moment" aria-label="Current narration"><span className="pip-moment-label">{game.story?.campaign.title??'Your adventure'}</span><p>{caption}</p><div className="pip-audio-actions"><button type="button" className="text-button" disabled={pending} onClick={()=>void listen()}><Icon name={talking||automaticSpeaking?'close':'sound'} size={16}/>{talking||automaticSpeaking?'Stop reading':'Listen'}</button>{host?<button type="button" className="text-button" disabled={disabled} onClick={()=>void tellMoment()}>Tell this moment</button>:null}{pending&&cancelable?<button type="button" className="text-button" onClick={stop}>Cancel</button>:null}</div></section>
   <div className="pip-quick-prompts" role="group" aria-label="Ask Pip for help"><button type="button" disabled={disabled} onClick={()=>void ask('How do I play?')}>How do I play?</button><button type="button" disabled={disabled} onClick={()=>void ask('What should I do next?')}>What next?</button></div>
   <form className="pip-form" onSubmit={e=>{e.preventDefault();void ask();}}><label className="field">Ask Pip<textarea value={text} onChange={e=>setText(e.target.value)} maxLength={400} rows={2} placeholder="Ask about your hero, an action, or the story…" disabled={pending}/></label><button className="button primary" type="submit" disabled={disabled||!text.trim()}>Ask Pip<Icon name="arrow" size={16}/></button></form>
   <div role="status" aria-live="polite" aria-atomic="true">{pending?<p className="pip-processing">Pip is thinking…</p>:reply?<p className="pip-reply">{reply}</p>:null}</div>
   {steer?<details><summary>Guide the story</summary>{host?<><p>Change the tone, pick up the pace, or finish at this chapter’s gateway.</p>{game.story?.direction?.endAfterChapter?<p className="pip-note">This adventure will finish at this chapter’s gateway.</p>:null}<div className="pip-quick-prompts" role="group" aria-label="Story pacing"><button type="button" disabled={disabled} onClick={()=>void guide('Pick up the pace')}>A little faster</button>{game.story?.direction?.endAfterChapter?<button type="button" disabled={disabled} onClick={()=>void guide('Keep going')}>Keep adventuring</button>:<button type="button" disabled={disabled} onClick={()=>void guide('End after this chapter')}>Finish after this chapter</button>}</div><form className="pip-form" onSubmit={e=>{e.preventDefault();void guide();}}><label className="field">Your story direction<textarea value={direction} onChange={e=>setDirection(e.target.value)} maxLength={400} rows={2} placeholder="More mystery, a hopeful tone, a friend to rescue…" disabled={pending}/></label><button type="submit" className="button paper" disabled={disabled||!direction.trim()}>Tell Pip</button></form></>:<p>The host can change the story’s direction and pace. Everyone can ask Pip for help.</p>}</details>:null}
   {game.story?<details><summary>Adventure notes</summary><p>{game.story.campaign.premise}</p>{game.story.campaign.characters.map(character=><p key={character.id}><strong>{character.name}</strong> · {character.personality}</p>)}<ul>{game.story.campaign.facts.map(fact=><li key={fact}>{fact}</li>)}</ul></details>:null}
   <details><summary>About Pip</summary><p>Pip suggests and narrates; you make moves with the game controls. Dice, damage, and legal actions follow the game rules.</p><p className="pip-note">{game.story?.campaign.source==='openai'?'This adventure began with an AI-generated story.':'This adventure began with a local story.'} Live replies and generated voice depend on the server’s AI settings and remaining allowance. If unavailable, Pip uses local guidance and device speech. Generated voices are AI audio.</p></details>
  </>:<p>Start an adventure to ask Pip what to do next, hear the story, or guide its direction.</p>}
 </div>;
}
