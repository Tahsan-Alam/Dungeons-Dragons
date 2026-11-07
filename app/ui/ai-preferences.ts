'use client';
import {useSyncExternalStore} from 'react';

export const AI_PREFERENCE_KEY='painted-realms.ai-enabled.v1';
const AI_PREFERENCE_REVISION_KEY='painted-realms.ai-preference-revision';
const CHANGE_EVENT='painted-realms-ai-preference';
let memoryPreference=false;
let memoryRevision=false;

export function readAIPreference():boolean {
 if(typeof window==='undefined')return false;
 try{return localStorage.getItem(AI_PREFERENCE_KEY)==='true'}catch{return memoryPreference}
}
export function setAIPreference(enabled:boolean) {
 memoryPreference=enabled;
 memoryRevision=true;
 try{localStorage.setItem(AI_PREFERENCE_KEY,String(enabled));localStorage.setItem(AI_PREFERENCE_REVISION_KEY,'2')}catch{/* The preference still works for this visit. */}
 if(typeof window!=='undefined')window.dispatchEvent(new Event(CHANGE_EVENT));
}
/** Repair the old Settings/creator split once, without overriding later opt-outs. */
export function adoptLegacyAIUnlock(unlocked:boolean){
 if(!unlocked)return;
 try{if(localStorage.getItem(AI_PREFERENCE_REVISION_KEY)==='2')return;}catch{if(memoryRevision)return;}
 setAIPreference(true);
}
function subscribe(listener:()=>void) {
 const storage=(event:StorageEvent)=>{if(event.key===AI_PREFERENCE_KEY||event.key===null)listener()};
 window.addEventListener('storage',storage);window.addEventListener(CHANGE_EVENT,listener);
 return()=>{window.removeEventListener('storage',storage);window.removeEventListener(CHANGE_EVENT,listener)};
}
export function useAIPreference():readonly [boolean,typeof setAIPreference] {
 return [useSyncExternalStore(subscribe,readAIPreference,()=>false),setAIPreference] as const;
}
