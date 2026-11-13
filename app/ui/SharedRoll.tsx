'use client';
import {useEffect,useRef,useState,type RefObject} from 'react';
import type {SharedRoll as SharedRollEvent} from './roll-feed';
import DiceArt from './DiceArt';
import RollOutcome from './RollOutcome';
import Modal,{type ModalDismiss} from './Modal';
import {useTheme} from './Theme';
import './attack-roll.css';

type SharedRollProps={roll:SharedRollEvent;remaining:number;paused:boolean;onPausedChange:(paused:boolean)=>void;onDone:()=>void;onBackToBoard:()=>void};
/** Plays confirmed events only. Watching or dismissing a roll never sends an action. */
export default function SharedRoll(props:SharedRollProps){
 const{reducedMotion}=useTheme();
 const[resultId,setResultId]=useState<number|null>(null),dismissedId=useRef<number|null>(null);
 const eventId=props.roll.event.id,activeEventId=useRef(eventId);activeEventId.current=eventId;
 function advance(){if(dismissedId.current===eventId)return;dismissedId.current=eventId;props.onDone()}
 return <Modal title={reducedMotion||resultId===eventId?'Roll result':'Dice roll'} onClose={advance} keepOpenOnDismiss={props.remaining>1}>
  {dismiss=><RollPresentation key={eventId} {...props} dismiss={dismiss} activeEventId={activeEventId} onResultShown={setResultId}/>}
 </Modal>;
}

/** Only this content remounts between rolls, so timers reset without flashing the backdrop. */
function RollPresentation({roll,remaining,paused,onPausedChange,onBackToBoard,dismiss,activeEventId,onResultShown}:SharedRollProps&{dismiss:ModalDismiss;activeEventId:RefObject<number>;onResultShown:(eventId:number)=>void}){
 const{reducedMotion}=useTheme();
 const[animationDone,setAnimationDone]=useState(false),[visible,setVisible]=useState(()=>typeof document==='undefined'||!document.hidden);
 const nextButton=useRef<HTMLButtonElement>(null);
 const showingResult=animationDone||reducedMotion;
 useEffect(()=>{nextButton.current?.focus()},[]);
 useEffect(()=>{const changed=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',changed);return()=>document.removeEventListener('visibilitychange',changed)},[]);
 useEffect(()=>{
  if(reducedMotion){setAnimationDone(true);return}
  if(!visible||animationDone)return;
  const timer=setTimeout(()=>setAnimationDone(true),900);return()=>clearTimeout(timer);
 },[visible,animationDone,reducedMotion]);
 useEffect(()=>{if(showingResult)onResultShown(roll.event.id)},[showingResult,roll.event.id,onResultShown]);
 useEffect(()=>{
  if(!visible||!showingResult||paused)return;
  const timer=setTimeout(()=>{if(activeEventId.current===roll.event.id)dismiss()},roll.event.attack?2200:4500);return()=>clearTimeout(timer);
 },[visible,showingResult,paused,roll.event.attack,roll.event.id,dismiss,activeEventId]);
 return <div className="attack-roll shared-roll" data-paused={!visible}>
   <p className="attack-roll-target"><strong>{roll.actorName}</strong><span>{roll.description}</span>{roll.targetName?<span>Against {roll.targetName}</span>:null}</p>
   <DiceArt value={showingResult?roll.event.roll:undefined} rolling={!showingResult}/>
   <div className="attack-roll-status" role="status" aria-live="polite" aria-atomic="true">{showingResult?<RollOutcome event={roll.event}/>:<p>{roll.actorName} is rolling…</p>}</div>
   <div className="attack-roll-actions"><button ref={nextButton} className="button primary" onClick={()=>dismiss()}>{remaining>1?'Next roll':'Continue'}</button></div>
   <div className="shared-roll-controls"><button className="button paper" onClick={()=>onPausedChange(!paused)}>{paused?'Resume auto-advance':'Pause auto-advance'}</button><button className="button paper" onClick={()=>dismiss(onBackToBoard)}>Back to board</button></div>
   <p className="shared-roll-count" role="status">{remaining>1?`${remaining-1} more ${remaining===2?'roll':'rolls'} · `:''}{paused?'Auto-advance paused':'Advances automatically'}</p>
   <p className="shared-roll-journal">Recent results are in the adventure log.</p>
  </div>;
}
