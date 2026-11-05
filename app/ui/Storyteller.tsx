'use client';
import {useEffect,useRef,useState} from 'react';
import type {GameState,RoomView,Session} from '../../game/types';
import {legalChoices,fixtureChoice} from '../../game/legal-actions';
import {currentNarration} from '../../game/ai';
export default function Storyteller({game,room,session,narrate,busy}:{game:GameState|null;room:RoomView|null;session:Session|null;narrate:()=>unknown;busy:boolean}){
 const [text,setText]=useState(''),[message,setMessage]=useState(''),[pending,setPending]=useState(false);
 const audio=useRef<HTMLAudioElement|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),epoch=useRef(0);
 function stop(){audio.current?.pause();audio.current=null;if(timer.current)clearTimeout(timer.current);window.speechSynthesis?.cancel();}
 useEffect(()=>{epoch.current++;setMessage('');stop();return()=>{epoch.current++;stop();};},[game?.eventSequence,room?.version]);
 async function assist(audioRequest=false){
  if(!game||pending)return;setPending(true);setMessage('');const requestEpoch=epoch.current;
  try{
   let data:{choice?:{label:string}|null;audio?:string|null;version?:number}={};
   if(session&&room){
    const response=await fetch(`/api/rooms/${session.code}/assist`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.token}`},body:JSON.stringify({version:room.version,text,audio:audioRequest}),signal:AbortSignal.timeout(20_000)});
    data=await response.json();if(!response.ok)throw new Error('The request was unavailable or the room changed. Try again from the current turn.');
   }else if(!audioRequest){const choices=legalChoices(game,'you'),id=fixtureChoice(text,choices);data.choice=choices.find(c=>c.id===id);}
   if(requestEpoch!==epoch.current)return;
   if(audioRequest){
    stop();
    if(data.audio){audio.current=new Audio(data.audio);await audio.current.play();setMessage('AI-generated voice.');}
    else if(window.speechSynthesis){window.speechSynthesis.speak(new SpeechSynthesisUtterance(currentNarration(game)));setMessage('Using device speech.');}
    else setMessage('Speech is unavailable on this device. The caption remains below.');
    timer.current=setTimeout(stop,45_000);
   }else setMessage(data.choice?`Suggested: ${data.choice.label}. Use the board or action buttons to confirm.`:'Please clarify with an action button and target. No move was made.');
  }catch{if(requestEpoch===epoch.current)setMessage('The storyteller is unavailable. Use the game controls or device narration.');}finally{setPending(false);}
 }
 const host=!room||room.hostId===session?.playerId;
 return <div className="ai-summary"><p>Creative text never decides dice, damage or legal moves. Solo uses local fixtures; room requests use the server configuration, which defaults to fixtures.</p>
 {game?.story?<><h3>{game.story.campaign.title}</h3><p>{game.story.campaign.premise}</p><p><small>Campaign source: {game.story.campaign.source}</small></p>
 <details><summary>Saved facts & characters</summary><ul>{game.story.campaign.facts.map(f=><li key={f}>{f}</li>)}</ul>{game.story.campaign.characters.map(c=><p key={c.id}><strong>{c.name}</strong> · {c.heroClass} · {c.personality}</p>)}</details>
 <p>{currentNarration(game)}</p><div className="menu-actions"><button className="button paper" disabled={busy||pending||!host} onClick={()=>void narrate()}>Narrate this moment</button><button className="button paper" disabled={pending} onClick={()=>void assist(true)}>Read caption</button><button className="button paper" onClick={stop}>Stop speech</button></div>
 <label className="field">What would you like to do?<input maxLength={400} value={text} onChange={e=>setText(e.target.value)} placeholder="For example: guard"/></label><button className="button paper" disabled={pending||busy||!text.trim()} onClick={()=>void assist()}>Suggest a legal action</button>
 </>:<p>Start a new adventure to save a campaign and use the storyteller.</p>}
 <p role="status">{message}</p><details><summary>Provider & spending</summary><p>A key alone cannot enable API calls. The server requires a separate paid-text switch and another switch for audio. Default reservation ceilings: $0.10 per campaign, $0.25 per UTC day and $1 per UTC month. No automatic paid retries. Browser speech remains available.</p><p>Text roles use GPT-6 Luna; planning optionally uses GPT-6.1 Terra. Paid speech is a temporary tts-1 adapter disabled from January 6, 2027. No live model quality or billing has been tested.</p></details></div>;
}
