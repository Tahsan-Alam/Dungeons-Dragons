'use client';
import {useLayoutEffect,useRef} from 'react';
import {useOpenCue} from './sound/useCue';
import './pause-menu.css';

/** The table's pause menu (Esc, or Menu in the top bar): the way back to the title or the saved adventures.
    The adventure saves after every move, so leaving never loses progress. */
export default function PauseMenu({title,onResume,onSettings,onHelp,onTitle,onAdventures}:{title:string;onResume:()=>void;onSettings:()=>void;onHelp:()=>void;onTitle:()=>void;onAdventures:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),resume=useRef(onResume);
 useLayoutEffect(()=>{resume.current=onResume});
 useOpenCue('ui-book-open','ui-close');
 useLayoutEffect(()=>{
  const el=dialog.current;el?.showModal();(el?.querySelector('[data-autofocus]') as HTMLElement|null)?.focus();
  const cancel=(e:Event)=>{e.preventDefault();resume.current()};el?.addEventListener('cancel',cancel);
  return()=>{el?.removeEventListener('cancel',cancel);el?.close()};
 },[]);
 const pick=(action:()=>void)=>()=>{onResume();action();};
 // Esc resumes. Browsers don't always send the dialog's cancel event (a repeated Esc without a click), so the key is handled here too.
 return <dialog ref={dialog} className="pause realm" aria-labelledby="pause-title" onClick={e=>{if(e.target===e.currentTarget)onResume()}}
  onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onResume();}}}>
  <div className="pause-panel">
   <p className="pause-eyebrow">The table is paused</p>
   <h2 id="pause-title">{title}</h2>
   <nav className="pause-list" aria-label="Pause menu">
    <button type="button" data-tooltip="none" className="pause-item primary" data-autofocus onClick={onResume}>Resume<span>Esc</span></button>
    <button type="button" data-tooltip="none" className="pause-item" onClick={pick(onSettings)}>Settings</button>
    <button type="button" data-tooltip="none" className="pause-item" onClick={pick(onHelp)}>How to play</button>
    <span className="pause-rule" aria-hidden="true"/>
    <button type="button" data-tooltip="none" className="pause-item" onClick={pick(onAdventures)}>Saved adventures</button>
    <button type="button" data-tooltip="none" className="pause-item" onClick={pick(onTitle)}>Return to the title</button>
   </nav>
   <p className="pause-note">Your adventure is saved after every move.</p>
  </div>
 </dialog>;
}
