'use client';
import {useChangeCue,useOpenCue} from './sound/useCue';
import {useEffect,useRef,useState} from 'react';
import type {GameEvent,GameState} from '../../game/types';
import {applyStoryDirection} from '../../game/campaign';
import type {Exchange} from './narrator-thread';
import {Icon} from './Art';

type Narration=NonNullable<GameState['story']>['narrations'][number];
export type JournalEntry={key:string;at:number;event?:GameEvent;narration?:Narration};
export type JournalTab='log'|'dialogue'|'story';

/** The adventure log, the conversation with the Game Master and the story's pace, in one drawer over the scene. */
export default function JournalDrawer({game,entries,thread,narratorName,host,tab,onTab,onClose,onAsk,onNarrate,onSteer,busy}:{game:GameState;entries:JournalEntry[];thread:Exchange[];narratorName:string;host:boolean;tab:JournalTab;onTab:(tab:JournalTab)=>void;onClose:()=>void;onAsk:()=>void;onNarrate?:()=>unknown;onSteer?:(text:string)=>Promise<unknown>;busy:boolean}){
 useOpenCue('ui-book-open','ui-close');useChangeCue(tab,'ui-page');
 const panel=useRef<HTMLElement>(null),[pending,setPending]=useState(false),[status,setStatus]=useState(''),[direction,setDirection]=useState('');
 useEffect(()=>{(panel.current?.querySelector('[role=tab][aria-selected=true]') as HTMLElement|null)?.focus()},[]);
 const tabs:[JournalTab,string][]=[['log','Log'],['dialogue','Dialogue'],['story','Story']];
 function key(e:React.KeyboardEvent){const i=tabs.findIndex(([t])=>t===tab);if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();const next=tabs[(i+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length][0];onTab(next);requestAnimationFrame(()=>(panel.current?.querySelector(`#journal-tab-${next}`) as HTMLElement|null)?.focus())}}
 async function tell(){if(!onNarrate||pending)return;setPending(true);setStatus('');try{await onNarrate()}catch{setStatus(`${narratorName} could not tell this moment just now.`)}finally{setPending(false)}}
 async function steer(prompt:string){
  if(!onSteer||!host||pending||busy||!prompt.trim())return;
  setPending(true);setStatus('');
  try{
   const next=applyStoryDirection(game,prompt.trim()).story?.direction;
   if(await onSteer(prompt.trim())!==true){setStatus('The story could not change yet. Try again from the current turn.');return}
   setStatus(next?.endAfterChapter?'This adventure will finish at this chapter’s gateway, after its shard.':game.story?.direction?.endAfterChapter?'The adventure goes on beyond this chapter.':next?.pace==='brisk'?'The story will stay brisk and focus on your next objective.':`${narratorName} will carry that direction into the next telling.`);
   setDirection('');
  }catch{setStatus('The story could not change yet. Try again from the current turn.')}finally{setPending(false)}
 }
 const ending=!!game.story?.direction?.endAfterChapter;
 return <aside ref={panel} className="ph-journal ph-ui" aria-label="Journal">
  <div className="ph-journal-head"><h2>Journal</h2><button type="button" className="ph-tool" aria-label="Close the journal" data-tooltip="Close (Esc)" onClick={onClose}><Icon name="close" size={18}/></button></div>
  <div role="tablist" aria-label="Journal sections" className="ph-tabs" onKeyDown={key}>{tabs.map(([t,label])=><button key={t} id={`journal-tab-${t}`} type="button" role="tab" data-ui-sound="off" aria-selected={tab===t} aria-controls={`journal-panel-${t}`} tabIndex={tab===t?0:-1} onClick={()=>onTab(t)}>{label}</button>)}</div>
  <div id={`journal-panel-${tab}`} role="tabpanel" aria-labelledby={`journal-tab-${tab}`} className="ph-journal-body" tabIndex={0}>
   {tab==='log'?<ol className="ph-log">{entries.map(entry=>{
    if(entry.narration)return <li key={entry.key} className="story"><small>{narratorName}</small><p>{entry.narration.caption}</p></li>;
    const e=entry.event!,by=game.actors.find(a=>a.id===e.actorId);
    return <li key={entry.key} className={`${e.kind} ${by?by.enemy?'foe':'ally':''}`}>{e.roll!==undefined?<span className="ph-log-die" aria-label={`d20 ${e.roll}`}>{e.roll}</span>:null}<p>{e.text}</p>{e.attack?<span className={`ph-log-result ${e.attack.hit?e.attack.critical?'crit':'hit':'miss'}`}>{e.attack.hit?`−${e.attack.damage}`:'Miss'}</span>:null}</li>;
   })}</ol>
   :tab==='dialogue'?<div className="ph-dialogue">
    {thread.length?thread.map(entry=><div key={entry.id} className="ph-exchange"><p className="ph-asked">You asked: <span>{entry.question}</span></p><p className="ph-answer">“{entry.answer}”{entry.local?<small>Local guidance</small>:null}</p></div>)
     :<p className="ph-note">Questions you ask {narratorName} appear here.</p>}
    <div className="ph-row">{host&&onNarrate?<button type="button" className="ph-secondary" disabled={pending||busy} onClick={()=>void tell()}><Icon name="sound" size={15}/>Tell this moment</button>:null}<button type="button" className="ph-secondary" onClick={onAsk}><Icon name="book" size={15}/>Ask {narratorName}</button></div>
   </div>
   :<div className="ph-story">
    {host&&onSteer?<>
     <p>Change the pace, or finish at this chapter’s gateway. The ending still waits for this chapter’s shard.</p>
     {ending?<p className="ph-note">This adventure will finish at this chapter’s gateway.</p>:null}
     <div className="ph-row" role="group" aria-label="Story pacing"><button type="button" className="ph-secondary" disabled={pending||busy} onClick={()=>void steer('Pick up the pace')}>A little faster</button>{ending?<button type="button" className="ph-secondary" disabled={pending||busy} onClick={()=>void steer('Keep going')}>Keep adventuring</button>:<button type="button" className="ph-secondary" disabled={pending||busy} onClick={()=>void steer('End after this chapter')}>Finish after this chapter</button>}</div>
     <form className="ph-direction" onSubmit={e=>{e.preventDefault();void steer(direction)}}><label>Your story direction<textarea value={direction} maxLength={400} rows={2} placeholder="More mystery, a hopeful tone, a friend to rescue…" onChange={e=>setDirection(e.target.value)} disabled={pending}/></label><button type="submit" className="ph-secondary" disabled={pending||busy||!direction.trim()}>Tell {narratorName}</button></form>
    </>:<p className="ph-note">The host sets the story’s direction and pace. Everyone can ask {narratorName} for help.</p>}
   </div>}
   <p className="ph-status" role="status" aria-live="polite">{pending?`${narratorName} is thinking…`:status}</p>
  </div>
 </aside>;
}
