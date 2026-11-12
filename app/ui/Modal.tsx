'use client';
import {useCallback,useLayoutEffect,useId,useRef,useState,type ReactNode,type RefObject} from 'react';
import {Icon} from './Art';
import {useTheme} from './Theme';

/** A supplied action runs after dismissal; useful for leaving a multi-step dialog. */
export type ModalDismiss=(afterClose?:()=>void)=>void;
type ModalProps={title:string;onClose:()=>void;children:ReactNode|((dismiss:ModalDismiss)=>ReactNode);wide?:boolean;dismissible?:boolean;initialFocus?:RefObject<HTMLElement|null>;keepOpenOnDismiss?:boolean};

export default function Modal({title,onClose,children,wide=false,dismissible=true,initialFocus,keepOpenOnDismiss=false}:ModalProps) {
 const{reducedMotion}=useTheme();const reducedMotionRef=useRef(reducedMotion);reducedMotionRef.current=reducedMotion;
 const dialog=useRef<HTMLDialogElement>(null),close=useRef(onClose),timer=useRef<ReturnType<typeof setTimeout>|null>(null),closingRef=useRef(false);
 const[closing,setClosing]=useState(false);const titleId=useId(),canDismiss=useRef(dismissible),keepOpen=useRef(keepOpenOnDismiss),focusTarget=useRef(initialFocus);close.current=onClose;canDismiss.current=dismissible;keepOpen.current=keepOpenOnDismiss;focusTarget.current=initialFocus;
 const requestClose=useCallback<ModalDismiss>((afterClose)=>{
  if(closingRef.current||!canDismiss.current)return;
  const action=afterClose??close.current;
  // Advancing a queued presentation keeps its native dialog and backdrop in place.
  if(!afterClose&&keepOpen.current){action();return}
  closingRef.current=true;
  const finish=()=>{timer.current=null;closingRef.current=false;setClosing(false);action()};
  if(reducedMotionRef.current){finish();return}
  setClosing(true);
  timer.current=setTimeout(finish,140);
 },[]);
 useLayoutEffect(()=>{
  const el=dialog.current;el?.showModal();focusTarget.current?.current?.focus();
  const handler=(e:Event)=>{e.preventDefault();requestClose()};el?.addEventListener('cancel',handler);
  return()=>{if(timer.current)clearTimeout(timer.current);el?.removeEventListener('cancel',handler);el?.close()};
 },[requestClose]);
 return <dialog ref={dialog} inert={closing} aria-labelledby={titleId} className={`modal ${wide?'wide':''} ${closing?'is-closing':''}`} onClick={e=>{if(e.target===dialog.current){const rect=dialog.current.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)requestClose()}}}>
  <div className="modal-head"><h2 id={titleId}>{title}</h2><div className="modal-tools"><button className="icon-button" aria-label="Close dialog" title="Close (Esc)" disabled={!dismissible||closing} onClick={()=>requestClose()}><Icon name="close"/></button></div></div>{typeof children==='function'?children(requestClose):children}
 </dialog>;
}
