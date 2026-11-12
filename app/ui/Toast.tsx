'use client';
import {useEffect,useRef,useState} from 'react';
import {Icon} from './Art';
import {toastDuration} from './readability';

/** A message that clears itself. Pointing at it or focusing its button keeps it until the player moves on. */
export default function Toast({message,onDismiss}:{message:string;onDismiss:()=>void}){
 const[held,setHeld]=useState(false),dismiss=useRef(onDismiss);
 useEffect(()=>{dismiss.current=onDismiss},[onDismiss]);
 useEffect(()=>{if(held)return;const timer=setTimeout(()=>dismiss.current(),toastDuration(message));return()=>clearTimeout(timer)},[message,held]);
 return <div className="toast" role="alert" onPointerEnter={e=>{if(e.pointerType==='mouse')setHeld(true)}} onPointerLeave={()=>setHeld(false)} onFocus={()=>setHeld(true)} onBlur={()=>setHeld(false)}><Icon name="flag" size={18}/><span>{message}</span><button aria-label="Dismiss message" onClick={onDismiss}><Icon name="close" size={16}/></button></div>;
}
