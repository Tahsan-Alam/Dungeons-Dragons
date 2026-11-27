'use client';
import {useCallback,useSyncExternalStore} from 'react';
import {CONTROL_KEY,defaultPreferences,normalizePreferences,type ControlPreferences} from './controls';
const EVENT='painted-realms-controls-change';
const SERVER_DEFAULT=defaultPreferences();
/** The preferences every component shares: read from browser storage once, then kept in step with changes here and in other tabs. */
let memory:ControlPreferences|null=null;
function read(){try{const raw=localStorage.getItem(CONTROL_KEY);memory=raw?normalizePreferences(JSON.parse(raw)):defaultPreferences();}catch{memory??=defaultPreferences();}return memory}
const snapshot=()=>memory??read();
function subscribe(change:()=>void){
 // A change made here already set the shared copy, so every component simply re-reads it.
 const update=()=>change();
 const storage=(e:StorageEvent)=>{if(e.key!==CONTROL_KEY&&e.key!==null)return;try{memory=normalizePreferences(JSON.parse(e.newValue||'null'))}catch{memory=defaultPreferences()}change()};
 window.addEventListener(EVENT,update);window.addEventListener('storage',storage);
 return()=>{window.removeEventListener(EVENT,update);window.removeEventListener('storage',storage)};
}
export function useControls(){
 const preferences=useSyncExternalStore(subscribe,snapshot,()=>SERVER_DEFAULT);
 const update=useCallback((change:Partial<ControlPreferences>)=>{const next=normalizePreferences({...snapshot(),...change});memory=next;try{localStorage.setItem(CONTROL_KEY,JSON.stringify(next));}catch{/* Browser storage is optional. */}window.dispatchEvent(new Event(EVENT))},[]);
 return {preferences,update};
}
