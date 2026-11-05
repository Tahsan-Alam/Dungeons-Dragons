'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {INTERFACE_SOUNDS,soundAllowed,type InterfaceSound} from './interface-audio';

const TARGET='button,a[href],select,input[type="checkbox"],input[type="radio"],input[type="range"],summary,[role="button"]';
function soundTarget(value:EventTarget|null){
 const element=value instanceof Element?value.closest(TARGET):null;
 return element&&!element.matches(':disabled,[aria-disabled="true"]')&&!element.closest('[inert],[data-ui-sound="off"]')?element:null;
}
/** Two tiny local samples, reused for the lifetime of the app. No audio before explicit enable/preview. */
export function useInterfaceAudio(volume:number,hoverSounds:boolean){
 const[interfaceSounds,setEnabled]=useState(false),[soundError,setError]=useState('');
 const enabled=useRef(false),levels=useRef({volume,hoverSounds}),players=useRef<Partial<Record<InterfaceSound,HTMLAudioElement>>>({}),last=useRef({hover:-Infinity,click:-Infinity}),mounted=useRef(false),generation=useRef(0);
 useEffect(()=>{levels.current={volume,hoverSounds};for(const player of Object.values(players.current)){player.volume=volume;if(volume===0)player.pause()}},[volume,hoverSounds]);
 const stop=useCallback(()=>{generation.current++;for(const player of Object.values(players.current)){player.pause();player.currentTime=0}},[]);
 const play=useCallback((kind:InterfaceSound,preview=false)=>{
  if((!enabled.current&&!preview)||document.hidden||levels.current.volume<=0||(kind==='hover'&&!levels.current.hoverSounds))return;
  const now=performance.now();if(!soundAllowed(kind,now,last.current.hover,last.current.click))return;
  last.current[kind]=now;const run=generation.current;
  try{
   const player=players.current[kind]??new Audio(INTERFACE_SOUNDS[kind]);players.current[kind]=player;
   player.preload='auto';player.volume=levels.current.volume*(kind==='hover'?.72:1);player.currentTime=0;
   if(kind==='click')players.current.hover?.pause();
   void player.play().then(()=>{if(generation.current!==run)player.pause();else if(mounted.current)setError('')}).catch((error:unknown)=>{if(error instanceof DOMException&&error.name==='AbortError')return;if(mounted.current&&generation.current===run){setError('Sound could not play. Try enabling it again.');enabled.current=false;setEnabled(false)}});
  }catch{if(mounted.current){setError('Interface sounds are unavailable in this browser.');enabled.current=false;setEnabled(false)}}
 },[]);
 useEffect(()=>{
  mounted.current=true;let keyboardFocus=false,suppressHoverUntil=0;
  const pointerdown=()=>{keyboardFocus=false;suppressHoverUntil=performance.now()+120};
  const keydown=(event:KeyboardEvent)=>{if(['Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))keyboardFocus=true;const target=soundTarget(event.target);if(!event.repeat&&target?.getAttribute('role')==='button'&&!target.matches('button,a')&&['Enter',' '].includes(event.key))play('click')};
  const hover=(event:PointerEvent)=>{if(event.pointerType!=='mouse'||event.buttons||performance.now()<suppressHoverUntil)return;const target=soundTarget(event.target);if(!target||target.closest('.game-board')||(event.relatedTarget instanceof Node&&target.contains(event.relatedTarget)))return;play('hover')};
  const focus=(event:FocusEvent)=>{if(keyboardFocus&&soundTarget(event.target))play('hover')};
  const click=(event:MouseEvent)=>{if(soundTarget(event.target))play('click')};
  const hidden=()=>{if(document.hidden)stop()};
  document.addEventListener('pointerdown',pointerdown,true);document.addEventListener('keydown',keydown,true);document.addEventListener('pointerover',hover,{passive:true});document.addEventListener('focusin',focus);document.addEventListener('click',click,true);document.addEventListener('visibilitychange',hidden);
  return()=>{mounted.current=false;enabled.current=false;stop();for(const player of Object.values(players.current)){player.removeAttribute('src');player.load()}players.current={};document.removeEventListener('pointerdown',pointerdown,true);document.removeEventListener('keydown',keydown,true);document.removeEventListener('pointerover',hover);document.removeEventListener('focusin',focus);document.removeEventListener('click',click,true);document.removeEventListener('visibilitychange',hidden)};
 },[play,stop]);
 const toggleInterfaceSounds=useCallback(()=>{enabled.current=!enabled.current;setEnabled(enabled.current);setError('');if(enabled.current)play('click');else stop()},[play,stop]);
 const previewSound=useCallback(()=>play('click',true),[play]);
 return{interfaceSounds,soundError,toggleInterfaceSounds,previewSound};
}
