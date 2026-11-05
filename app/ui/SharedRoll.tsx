'use client';
import {useEffect,useRef,useState} from 'react';
import type {SharedRoll as SharedRollEvent} from './roll-feed';
import DiceArt from './DiceArt';
import RollOutcome from './RollOutcome';
import Modal from './Modal';
import {useTheme} from './Theme';
import './attack-roll.css';

/** Plays confirmed events only. Watching or dismissing a roll never sends an action. */
export default function SharedRoll({roll,remaining,paused,onPausedChange,onDone,onBackToBoard}:{roll:SharedRollEvent;remaining:number;paused:boolean;onPausedChange:(paused:boolean)=>void;onDone:()=>void;onBackToBoard:()=>void}){
 const{theme,reducedMotion}=useTheme();
 const[animationDone,setAnimationDone]=useState(false),[visible,setVisible]=useState(()=>typeof document==='undefined'||!document.hidden);
 const done=useRef(onDone),nextButton=useRef<HTMLButtonElement>(null);done.current=onDone;
 const showingResult=animationDone||reducedMotion;
 useEffect(()=>{nextButton.current?.focus()},[]);
 useEffect(()=>{const changed=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',changed);return()=>document.removeEventListener('visibilitychange',changed)},[]);
 useEffect(()=>{
  if(reducedMotion){setAnimationDone(true);return}
  if(!visible||animationDone)return;
  const timer=setTimeout(()=>setAnimationDone(true),900);return()=>clearTimeout(timer);
 },[visible,animationDone,reducedMotion]);
 useEffect(()=>{
  if(!visible||!showingResult||paused)return;
  const timer=setTimeout(()=>done.current(),roll.event.attack?2200:4500);return()=>clearTimeout(timer);
 },[visible,showingResult,paused,roll.event.attack]);
 return <Modal title={showingResult?'Roll result':'Dice roll'} onClose={onDone}>
  <div className="attack-roll shared-roll" data-paused={!visible}>
   <p className="attack-roll-target"><strong>{roll.actorName}</strong><span>{roll.description}</span>{roll.targetName?<span>Against {roll.targetName}</span>:null}</p>
   <DiceArt theme={theme} value={showingResult?roll.event.roll:undefined} rolling={!showingResult}/>
   <div className="attack-roll-status" role="status" aria-live="polite" aria-atomic="true">{showingResult?<RollOutcome event={roll.event}/>:<p>{roll.actorName} is rolling…</p>}</div>
   <div className="attack-roll-actions"><button ref={nextButton} className="button primary" onClick={onDone}>{remaining>1?'Next roll':'Continue'}</button></div>
   <div className="shared-roll-controls"><button className="button paper" onClick={()=>onPausedChange(!paused)}>{paused?'Resume auto-advance':'Pause auto-advance'}</button><button className="button paper" onClick={onBackToBoard}>Back to board</button></div>
   <p className="shared-roll-count" role="status">{remaining>1?`${remaining-1} more ${remaining===2?'roll':'rolls'} · `:''}{paused?'Auto-advance paused':'Advances automatically'}</p>
   <p className="shared-roll-journal">Recent results are in the adventure log.</p>
  </div>
 </Modal>;
}
