'use client';
import {useCallback,useEffect,useRef} from 'react';
import {soundAllowed,type InterfaceSound} from './interface-audio';
import {sound} from './sound/engine';

const TARGET='button,a[href],select,input[type="checkbox"],input[type="radio"],input[type="range"],summary,[role="button"]';
function soundTarget(value:EventTarget|null){
 const element=value instanceof Element?value.closest(TARGET):null;
 return element&&!element.matches(':disabled,[aria-disabled="true"]')&&!element.closest('[inert],[data-ui-sound="off"]')?element:null;
}
/** The click and hover thocks for every control, through the sound engine's interface level. Controls with their own
    in-world sound (pages, switches, seals) carry data-ui-sound="off" and play that instead. */
export function useInterfaceAudio(hoverSounds:boolean){
 const hoverOn=useRef(hoverSounds),last=useRef({hover:-Infinity,click:-Infinity});
 useEffect(()=>{hoverOn.current=hoverSounds},[hoverSounds]);
 const play=useCallback((kind:InterfaceSound)=>{
  if(document.hidden||(kind==='hover'&&!hoverOn.current))return;
  const now=performance.now();if(!soundAllowed(kind,now,last.current.hover,last.current.click))return;
  last.current[kind]=now;sound.play(kind==='click'?'ui-click':'ui-hover');
 },[]);
 useEffect(()=>{
  let keyboardFocus=false,suppressHoverUntil=0;
  const pointerdown=()=>{keyboardFocus=false;suppressHoverUntil=performance.now()+120};
  const keydown=(event:KeyboardEvent)=>{if(['Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))keyboardFocus=true;const target=soundTarget(event.target);if(!event.repeat&&target?.getAttribute('role')==='button'&&!target.matches('button,a')&&['Enter',' '].includes(event.key))play('click')};
  const hover=(event:PointerEvent)=>{if(event.pointerType!=='mouse'||event.buttons||performance.now()<suppressHoverUntil)return;const target=soundTarget(event.target);if(!target||target.closest('.game-board')||(event.relatedTarget instanceof Node&&target.contains(event.relatedTarget)))return;play('hover')};
  const focus=(event:FocusEvent)=>{if(keyboardFocus&&soundTarget(event.target))play('hover')};
  const click=(event:MouseEvent)=>{if(soundTarget(event.target))play('click')};
  document.addEventListener('pointerdown',pointerdown,true);document.addEventListener('keydown',keydown,true);document.addEventListener('pointerover',hover,{passive:true});document.addEventListener('focusin',focus);document.addEventListener('click',click,true);
  return()=>{document.removeEventListener('pointerdown',pointerdown,true);document.removeEventListener('keydown',keydown,true);document.removeEventListener('pointerover',hover);document.removeEventListener('focusin',focus);document.removeEventListener('click',click,true)};
 },[play]);
 const previewSound=useCallback(()=>sound.play('ui-click'),[]);
 return{soundError:'',previewSound};
}
