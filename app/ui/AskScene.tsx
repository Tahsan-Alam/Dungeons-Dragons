'use client';
import {useEffect,useRef,useState} from 'react';
import type {GameState,RoomView,Session} from '../../game/types';
import {currentNarration} from '../../game/ai';
import GameMasterScene from './GameMasterScene';
import {askGameMaster,suggestedQuestions} from './ask-game-master';
import type {Exchange} from './narrator-thread';
import {Icon} from './Art';

const ROMAN=['I','II','III','IV','V'];

/** Ask the Game Master, standing in the encounter's place. Numbered questions that fit the moment, or your own.
    Answers join the Dialogue in the Journal; nothing here changes the game. */
export default function AskScene({game,room,session,thread,talking=false,onExchange,onListen,onDialogue,onClose}:{game:GameState;room:RoomView|null;session:Session|null;thread:Exchange[];talking?:boolean;onExchange:(question:string,answer:string,local:boolean)=>void;onListen?:(line:string)=>void;onDialogue:()=>void;onClose:()=>void}){
 const narrator=game.options.creation?.narrator.name??'The storyteller';
 const[custom,setCustom]=useState(false),[text,setText]=useState(''),[pending,setPending]=useState(''),[failed,setFailed]=useState(''),[pick,setPick]=useState(0);
 const request=useRef<AbortController|null>(null),input=useRef<HTMLInputElement>(null);
 useEffect(()=>()=>request.current?.abort(),[]);
 useEffect(()=>{if(custom)input.current?.focus()},[custom]);
 const questions=suggestedQuestions(game),last=thread.at(-1);
 async function ask(prompt:string){
  if(!prompt.trim()||pending)return;
  request.current?.abort();const controller=new AbortController();request.current=controller;
  setPending(prompt.trim());setFailed('');
  try{const {answer,local}=await askGameMaster({game,room,session,prompt:prompt.trim(),signal:controller.signal});if(!controller.signal.aborted){onExchange(prompt.trim(),answer,local);setText('');setCustom(false)}}
  catch{if(!controller.signal.aborted)setFailed(prompt.trim())}
  finally{if(request.current===controller){request.current=null;setPending('')}}
 }
 function keys(e:React.KeyboardEvent){if(custom)return;const n=Number(e.key);if(n>=1&&n<=questions.length){e.preventDefault();setPick(n-1);void ask(questions[n-1])}}
 const chapter=`Chapter ${ROMAN[game.scene]??game.scene+1} · ${game.sceneName}`;
 return <GameMasterScene game={game} label={`Ask ${narrator}`} title={`Ask ${narrator}`} eyebrow={chapter} talking={talking} onClose={onClose} className="gm-ask">
  <div className="gm-ask-grid" onKeyDown={keys}>
   <div className="gm-ask-reply">
    <div className="gm-ask-head"><span className="gm-speaker">{narrator}</span><button type="button" className="gm-secondary small" onClick={onDialogue}>Dialogue Log</button></div>
    <div role="status" aria-live="polite" aria-atomic="true" className="gm-ask-status">
     {pending?<><p className="gm-asked">You asked: <span>{pending}</span></p><p className="gm-waiting"><i/><i/><i/>Waiting for {narrator}…</p></>
     :failed?<div className="gm-failed"><p>{narrator} couldn’t answer just now. Your question is kept.</p><button type="button" className="gm-secondary small" onClick={()=>void ask(failed)}>Try again</button></div>
     :last?<><p className="gm-asked">You asked: <span>{last.question}</span></p><p className="gm-line">“{last.answer}”</p>{last.local?<small className="gm-note">{narrator} used the game’s own guidance for this answer.</small>:null}{onListen?<button type="button" className="gm-link" onClick={()=>onListen(last.answer)}><Icon name="sound" size={14}/>Listen</button>:null}</>
     :<p className="gm-line">“{currentNarration(game)}”</p>}
    </div>
   </div>
   <div className="gm-ask-choices">
    {custom?<form className="gm-custom" onSubmit={e=>{e.preventDefault();void ask(text)}}>
     <label htmlFor="ask-own">What do you ask?</label>
     <input ref={input} id="ask-own" type="text" maxLength={400} value={text} onChange={e=>setText(e.target.value)} placeholder="Ask about the place, the guardians or the road" disabled={!!pending}/>
     <div className="gm-actions left"><button type="submit" className="gm-primary small" disabled={!!pending||!text.trim()}>Speak</button><button type="button" className="gm-link" onClick={()=>setCustom(false)}>Back to choices</button></div>
    </form>:<>
     <div role="group" aria-label="Questions" className="gm-choices">{questions.map((q,i)=><button key={q} type="button" className={`gm-choice${i===pick?' picked':''}`} disabled={!!pending} onClick={()=>{setPick(i);void ask(q)}}><span>{i+1}.</span>{q}</button>)}</div>
     <button type="button" className="gm-link" onClick={()=>setCustom(true)}>Ask something else</button>
    </>}
    <div className="gm-actions"><button type="button" className="gm-primary" data-autofocus onClick={onClose}>Return to the encounter<span aria-hidden="true">›</span></button></div>
   </div>
  </div>
 </GameMasterScene>;
}
