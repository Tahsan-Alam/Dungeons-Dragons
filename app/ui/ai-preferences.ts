'use client';
import {useSyncExternalStore} from 'react';

export const AI_PREFERENCE_KEY='painted-realms.ai-enabled.v1';
const CHANGE_EVENT='painted-realms-ai-preference';
let memoryPreference=false;

export function readAIPreference():boolean {
 if(typeof window==='undefined')return false;
 try{return localStorage.getItem(AI_PREFERENCE_KEY)==='true'}catch{return memoryPreference}
}
export function setAIPreference(enabled:boolean) {
 memoryPreference=enabled;
 try{localStorage.setItem(AI_PREFERENCE_KEY,String(enabled))}catch{/* The preference still works for this visit. */}
 if(typeof window!=='undefined')window.dispatchEvent(new Event(CHANGE_EVENT));
}
function subscribe(listener:()=>void) {
 const storage=(event:StorageEvent)=>{if(event.key===AI_PREFERENCE_KEY||event.key===null)listener()};
 window.addEventListener('storage',storage);window.addEventListener(CHANGE_EVENT,listener);
 return()=>{window.removeEventListener('storage',storage);window.removeEventListener(CHANGE_EVENT,listener)};
}
export function useAIPreference():readonly [boolean,typeof setAIPreference] {
 return [useSyncExternalStore(subscribe,readAIPreference,()=>false),setAIPreference] as const;
}
