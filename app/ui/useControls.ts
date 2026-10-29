'use client';
import {useCallback,useEffect,useState} from 'react';
import {CONTROL_KEY,defaultPreferences,normalizePreferences,type ControlPreferences} from './controls';
const EVENT='painted-realms-controls-change';
let memory=defaultPreferences();
function read(){try{const raw=localStorage.getItem(CONTROL_KEY);if(raw)memory=normalizePreferences(JSON.parse(raw));return memory}catch{return memory}}
export function useControls(){
 const[preferences,setPreferences]=useState(defaultPreferences);
 useEffect(()=>{setPreferences(read());const update=()=>setPreferences(read());const storage=(e:StorageEvent)=>{if(e.key===CONTROL_KEY)update()};window.addEventListener(EVENT,update);window.addEventListener('storage',storage);return()=>{window.removeEventListener(EVENT,update);window.removeEventListener('storage',storage)}},[]);
 const update=useCallback((change:Partial<ControlPreferences>)=>{const next=normalizePreferences({...read(),...change});setPreferences(next);memory=next;try{localStorage.setItem(CONTROL_KEY,JSON.stringify(next));}catch{/* Browser storage is optional. */}window.dispatchEvent(new Event(EVENT))},[]);
 return {preferences,update};
}
