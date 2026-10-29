'use client';
import {useCallback,useEffect,useId,useRef,useState} from 'react';
import {Icon} from './Art';
import {ThemeToggle,useTheme} from './Theme';

export default function Modal({title,onClose,children,wide=false,dismissible=true}:{title:string;onClose:()=>void;children:React.ReactNode;wide?:boolean;dismissible?:boolean}) {
 const{reducedMotion}=useTheme();const reducedMotionRef=useRef(reducedMotion);reducedMotionRef.current=reducedMotion;
 const dialog=useRef<HTMLDialogElement>(null),close=useRef(onClose),timer=useRef<ReturnType<typeof setTimeout>|null>(null),closingRef=useRef(false);
 const[closing,setClosing]=useState(false);const titleId=useId(),canDismiss=useRef(dismissible);close.current=onClose;canDismiss.current=dismissible;
 const requestClose=useCallback(()=>{
  if(closingRef.current||!canDismiss.current)return;
  closingRef.current=true;
  if(reducedMotionRef.current){dialog.current?.close();close.current();return}
  setClosing(true);
  timer.current=setTimeout(()=>{dialog.current?.close();close.current()},140);
 },[]);
 useEffect(()=>{
  const el=dialog.current;el?.showModal();
  const handler=(e:Event)=>{e.preventDefault();requestClose()};el?.addEventListener('cancel',handler);
  return()=>{if(timer.current)clearTimeout(timer.current);el?.removeEventListener('cancel',handler);el?.close()};
 },[requestClose]);
 return <dialog ref={dialog} aria-labelledby={titleId} className={`modal ${wide?'wide':''} ${closing?'is-closing':''}`} onClick={e=>{if(e.target===dialog.current){const rect=dialog.current.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)requestClose()}}}>
  <div className="modal-head"><h2 id={titleId}>{title}</h2><div className="modal-tools"><ThemeToggle/><button className="icon-button" aria-label="Close dialog" title="Close (Esc)" disabled={!dismissible} onClick={requestClose}><Icon name="close"/></button></div></div>{children}
 </dialog>;
}
