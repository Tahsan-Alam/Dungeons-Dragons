'use client';
import {useEffect,useRef,useState} from 'react';
import type {GameEvent,GameState} from '../../game/types';
import {canStartAttackRoll,findAttackRollResult,type AttackRollRequest} from './attack-roll';
import DiceArt from './DiceArt';
import RollOutcome from './RollOutcome';
import Modal from './Modal';
import {Icon} from './Art';
import {useTheme} from './Theme';
import './attack-roll.css';

export default function AttackRoll({request,game,busy,onRoll,onClose}:{request:AttackRollRequest;game:GameState;busy:boolean;onRoll:()=>unknown;onClose:()=>void}){
 const {reducedMotion}=useTheme();
 const[started,setStarted]=useState(false),[settled,setSettled]=useState(false),[animationDone,setAnimationDone]=useState(false),[result,setResult]=useState<GameEvent>();
 const submitted=useRef(false),mounted=useRef(true),close=useRef(onClose),continueButton=useRef<HTMLButtonElement>(null),rollButton=useRef<HTMLButtonElement>(null);close.current=onClose;
 const valid=canStartAttackRoll(game,request);
 const confirmed=findAttackRollResult(game,request);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);
 useEffect(()=>{if(!started&&!valid)close.current()},[started,valid]);
 useEffect(()=>{if(started&&confirmed&&!result)setResult(confirmed)},[started,confirmed,result]);
 useEffect(()=>{
  if(!started)return;
  if(reducedMotion){setAnimationDone(true);return}
  const timer=setTimeout(()=>setAnimationDone(true),900);
  return()=>clearTimeout(timer);
 },[started,reducedMotion]);
 async function roll(){
  if(submitted.current||busy||!valid)return;
  submitted.current=true;setStarted(true);
  try{await onRoll()}catch{/* The session owns action errors; never invent a roll or automatically retry. */}
  finally{if(mounted.current)setSettled(true)}
 }
 const outcome=started&&animationDone?(result??confirmed):undefined;
 const rolling=started&&!animationDone&&!reducedMotion;
 const waiting=started&&!outcome&&(!settled||!animationDone);
 const unconfirmed=started&&!waiting&&!outcome;
 const canContinue=!!outcome||unconfirmed;
 useEffect(()=>{if(canContinue)continueButton.current?.focus()},[canContinue]);
 return <Modal title={outcome?'Attack result':'Roll to attack'} onClose={onClose} dismissible={!waiting} initialFocus={rollButton}>{dismiss=>
  <div className="attack-roll">
   <p className="attack-roll-target"><strong>{request.title}</strong><span>Against {request.targetName}</span></p>
   <DiceArt value={outcome?.roll} rolling={rolling}/>
   <div className="attack-roll-status" role="status" aria-live="polite" aria-atomic="true">
    {outcome?<RollOutcome event={outcome}/>:waiting?<p>{rolling?'Rolling…':'Waiting for your roll…'}</p>:unconfirmed?<p>No confirmed result yet. Check the adventure log before trying again.</p>:<p>Ready when you are. Roll to attack.</p>}
   </div>
   <div className="attack-roll-actions">
    {!started?<><button className="button paper" onClick={()=>dismiss()}>Cancel</button><button ref={rollButton} className="button primary" disabled={busy||!valid} onClick={()=>void roll()}><Icon name="dice" size={20}/>Roll d20</button></>:<button ref={continueButton} className="button primary" disabled={waiting} onClick={()=>dismiss()}>{waiting?'Rolling…':unconfirmed?'Close':'Continue'}</button>}
   </div>
  </div>}
 </Modal>;
}
