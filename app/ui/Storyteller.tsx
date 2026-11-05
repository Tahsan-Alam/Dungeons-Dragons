'use client';
import {useEffect,useRef,useState} from 'react';
import type {GameState,RoomView,Session} from '../../game/types';
import {legalChoices,fixtureChoice} from '../../game/legal-actions';
import type {AudioPreferences} from './audio-preferences';
import {currentNarration} from '../../game/ai';
export default function Storyteller({game,room,session,narrate,busy,preferences}:{game:GameState|null;room:RoomView|null;session:Session|null;narrate:()=>unknown;busy:boolean;preferences:AudioPreferences}){
 const [text,setText]=useState(''),[message,setMessage]=useState(''),[pending,setPending]=useState(false);
 const request=useRef<AbortController|null>(null);
 const audio=useRef<HTMLAudioElement|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),epoch=useRef(0);
 function stopPlayback(){audio.current?.pause();audio.current=null;if(timer.current)clearTimeout(timer.current);window.speechSynthesis?.cancel();}
 function stop(){epoch.current++;request.current?.abort();request.current=null;stopPlayback();setPending(false);}
 useEffect(()=>{setMessage('');stop();return()=>{epoch.current++;request.current?.abort();stopPlayback();};},[game?.eventSequence,room?.version,preferences.voiceVolume]);
 function deviceSpeech(){
  if(window.speechSynthesis&&typeof SpeechSynthesisUtterance==='function'&&game){const line=new SpeechSynthesisUtterance(currentNarration(game));line.volume=preferences.voiceVolume;line.rate=preferences.speechRate;window.speechSynthesis.speak(line);setMessage('Using device speech.');timer.current=setTimeout(stop,45_000);}
  else setMessage('Speech is unavailable on this device. The caption remains below.');
 }
 async function assist(audioRequest=false){
  if(!game||pending)return;if(audioRequest&&preferences.voiceVolume===0){setMessage('Narration volume is muted.');return;}stop();setPending(true);setMessage('');const requestEpoch=epoch.current;const controller=new AbortController();request.current=controller;
  try{
   let data:{choice?:{label:string}|null;audio?:string|null;version?:number}={};
   if(session&&room){
    const response=await fetch(`/api/rooms/${session.code}/assist`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.token}`},body:JSON.stringify({version:room.version,text,audio:audioRequest}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(20_000)])});
    data=await response.json();if(!response.ok)throw new Error('The request was unavailable or the room changed. Try again from the current turn.');
   }else if(!audioRequest){const choices=legalChoices(game,'you'),id=fixtureChoice(text,choices);data.choice=choices.find(c=>c.id===id);}
   if(requestEpoch!==epoch.current)return;
   if(audioRequest){
    stopPlayback();
    if(data.audio){const player=new Audio(data.audio);audio.current=player;player.volume=preferences.voiceVolume;player.playbackRate=preferences.speechRate;timer.current=setTimeout(stop,45_000);await player.play();if(requestEpoch!==epoch.current){player.pause();return;}setMessage('AI-generated voice.');}
    else deviceSpeech();
   }else setMessage(data.choice?`Suggested: ${data.choice.label}. Use the board or action buttons to confirm.`:'Please clarify with an action button and target. No move was made.');
  }catch{if(requestEpoch===epoch.current){if(audioRequest){stopPlayback();deviceSpeech();}else setMessage('The storyteller is unavailable. Use the game controls.');}}finally{if(requestEpoch===epoch.current){request.current=null;setPending(false);}}
 }
 const host=!room||room.hostId===session?.playerId;
 return <div className="ai-summary"><p>Creative text never decides dice, damage or legal moves. Solo uses local fixtures; room requests use the server configuration, which defaults to fixtures.</p>
 {game?.story?<><h3>{game.story.campaign.title}</h3><p>{game.story.campaign.premise}</p><p><small>Campaign source: {game.story.campaign.source}</small></p>
 <details><summary>Saved facts & characters</summary><ul>{game.story.campaign.facts.map(f=><li key={f}>{f}</li>)}</ul>{game.story.campaign.characters.map(c=><p key={c.id}><strong>{c.name}</strong> · {c.heroClass} · {c.personality}</p>)}</details>
 <p>{currentNarration(game)}</p><div className="menu-actions"><button className="button paper" disabled={busy||pending||!host} onClick={()=>void narrate()}>Narrate this moment</button><button className="button paper" disabled={pending} onClick={()=>void assist(true)}>Read caption</button><button className="button paper" onClick={stop}>Stop speech</button></div>
 <label className="field">What would you like to do?<input maxLength={400} value={text} onChange={e=>setText(e.target.value)} placeholder="For example: guard"/></label><button className="button paper" disabled={pending||busy||!text.trim()} onClick={()=>void assist()}>Suggest a legal action</button>
 </>:<p>Start a new adventure to save a campaign and use the storyteller.</p>}
 <p role="status">{message}</p><details><summary>Provider & spending</summary><p>A key alone cannot enable API calls. The server requires a separate paid-text switch and another switch for audio. Default reservation ceilings: $0.10 per campaign, $0.25 per UTC day and $1 per UTC month. No automatic paid retries. Browser speech remains available.</p><p>Text roles use GPT-6 Luna; planning optionally uses GPT-6.1 Terra. Paid speech uses GPT-Realtime-2.1 Mini with a checked caption transcript. The voice is AI-generated. No live model quality or billing has been tested.</p></details></div>;
}
