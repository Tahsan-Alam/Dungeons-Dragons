'use client';
import {useOpenCue} from './sound/useCue';
import {useEffect,useEffectEvent,useLayoutEffect,useId,useRef,useState,type ReactNode,type RefObject} from 'react';
import {Icon} from './Art';
import {useTheme} from './Theme';
import './realm-dialog.css';

/** A supplied action runs after dismissal; useful for leaving a multi-step dialog. */
export type ModalDismiss=(afterClose?:()=>void)=>void;
type ModalProps={title:string;onClose:()=>void;children:ReactNode|((dismiss:ModalDismiss)=>ReactNode);wide?:boolean;dismissible?:boolean;initialFocus?:RefObject<HTMLElement|null>;keepOpenOnDismiss?:boolean;className?:string;escHint?:string};

export default function Modal({title,onClose,children,wide=false,dismissible=true,initialFocus,keepOpenOnDismiss=false,className='',escHint}:ModalProps) {
 const{reducedMotion}=useTheme();
 const dialog=useRef<HTMLDialogElement>(null);
 useOpenCue(className.includes('parchment')?'ui-unfold':'ui-open');
 // While closing, the dialog fades for 140ms and then runs the action it was closed with (the first request wins).
 const[closing,setClosing]=useState<{action:()=>void}|null>(null);const titleId=useId();
 const requestClose:ModalDismiss=afterClose=>{
  if(closing||!dismissible)return;
  const action=afterClose??onClose;
  // Advancing a queued presentation keeps its native dialog and backdrop in place.
  if(!afterClose&&keepOpenOnDismiss){action();return}
  if(reducedMotion){action();return}
  setClosing(current=>current??{action});
 };
 useEffect(()=>{if(!closing)return;const timer=setTimeout(()=>{setClosing(null);closing.action()},140);return()=>clearTimeout(timer)},[closing]);
 // Esc (the dialog's cancel) and the first focus use the latest props without reopening the dialog.
 const cancel=useEffectEvent(()=>requestClose()),focusFirst=useEffectEvent(()=>initialFocus?.current?.focus());
 useLayoutEffect(()=>{
  const el=dialog.current;el?.showModal();focusFirst();
  const handler=(e:Event)=>{e.preventDefault();cancel()};el?.addEventListener('cancel',handler);
  return()=>{el?.removeEventListener('cancel',handler);el?.close()};
 },[]);
 return <dialog ref={dialog} inert={!!closing} aria-labelledby={titleId} className={`modal ${wide?'wide':''} ${closing?'is-closing':''} ${className}`} onClick={e=>{if(e.target===dialog.current){const rect=dialog.current.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)requestClose()}}}>
  <div className="modal-head"><h2 id={titleId}>{title}</h2><div className="modal-tools">{escHint?<span className="modal-esc" aria-hidden="true"><kbd>Esc</kbd>{escHint}</span>:null}<button className="icon-button" aria-label="Close dialog" title="Close (Esc)" disabled={!dismissible||!!closing} onClick={()=>requestClose()}><Icon name="close"/></button></div></div>{typeof children==='function'?children(requestClose):children}
 </dialog>;
}
