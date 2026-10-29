'use client';
import {useEffect,useRef} from 'react';
import {Icon} from './Art';
import {ThemeToggle} from './Theme';
export default function Modal({title,onClose,children,wide=false}:{title:string;onClose:()=>void;children:React.ReactNode;wide?:boolean}){
 const dialog=useRef<HTMLDialogElement>(null);const close=useRef(onClose);close.current=onClose;
 useEffect(()=>{dialog.current?.showModal();const el=dialog.current;const handler=(e:Event)=>{e.preventDefault();close.current()};el?.addEventListener('cancel',handler);return()=>{el?.removeEventListener('cancel',handler);el?.close()}},[]);
 return <dialog ref={dialog} className={`modal ${wide?'wide':''}`} onClick={e=>{if(e.target===dialog.current){const rect=dialog.current.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)onClose()}}}><div className="modal-head"><h2>{title}</h2><div className="modal-tools"><ThemeToggle/><button className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close"/></button></div></div>{children}</dialog>
}
