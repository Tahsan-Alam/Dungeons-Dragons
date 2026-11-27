'use client';
import {createContext,useCallback,useContext,useEffect,useMemo,useSyncExternalStore} from 'react';
import type {ReactNode} from 'react';
import {VIEW_MODE_STORAGE_KEY,normalizeViewMode,viewModeStorageChange,ACCENT_STORAGE_KEY,MOTION_STORAGE_KEY,COLOR_MODE_STORAGE_KEY,normalizeAccent,normalizeMotion,normalizeColorMode,resolveColorMode,resolveReducedMotion} from './appearance';
import type {ViewMode,ColorMode,ResolvedColorMode,Accent,MotionPreference} from './appearance';
export type {ViewMode,ColorMode,ResolvedColorMode,Accent,MotionPreference} from './appearance';
export {VIEW_MODE_STORAGE_KEY,COLOR_MODE_STORAGE_KEY,ACCENT_STORAGE_KEY,MOTION_STORAGE_KEY} from './appearance';

type ThemeValue={viewMode:ViewMode;setViewMode:(mode:ViewMode)=>void;colorMode:ColorMode;setColorMode:(mode:ColorMode)=>void;resolvedColorMode:ResolvedColorMode;accent:Accent;setAccent:(accent:Accent)=>void;motion:MotionPreference;setMotion:(motion:MotionPreference)=>void;reducedMotion:boolean};
const ThemeContext=createContext<ThemeValue>({viewMode:'2.5d',setViewMode:()=>{},colorMode:'system',setColorMode:()=>{},resolvedColorMode:'light',accent:'blue',setAccent:()=>{},motion:'system',setMotion:()=>{},reducedMotion:false});
function persist(key:string,value:string){try{localStorage.setItem(key,value)}catch{/* Preferences still work when browser storage is disabled. */}}

/** The player's appearance choices and the system's dark-mode and reduced-motion settings, as one store every reader shares.
    Choices come from browser storage (or, when storage is unavailable, from what the pre-paint script put on the page) and
    follow changes from this tab, other tabs and the system. The server renders the defaults. */
type Appearance={view:ViewMode;color:ColorMode;accent:Accent;motion:MotionPreference;systemDark:boolean;systemReduced:boolean};
const SERVER_APPEARANCE:Appearance={view:'2.5d',color:'system',accent:'blue',motion:'system',systemDark:false,systemReduced:false};
const APPEARANCE_CHANGE='painted-realms-appearance-change';
let appearance:Appearance|null=null;
function query(text:string){try{return window.matchMedia(text)}catch{return null}}
function readAppearance():Appearance{
 const root=document.documentElement;
 let view=normalizeViewMode(root.dataset.viewMode),color=normalizeColorMode(root.dataset.colorPreference),accent=normalizeAccent(root.dataset.accent),motion=normalizeMotion(root.dataset.motionPreference);
 try{view=normalizeViewMode(localStorage.getItem(VIEW_MODE_STORAGE_KEY));color=normalizeColorMode(localStorage.getItem(COLOR_MODE_STORAGE_KEY));accent=normalizeAccent(localStorage.getItem(ACCENT_STORAGE_KEY));motion=normalizeMotion(localStorage.getItem(MOTION_STORAGE_KEY))}catch{/* Reuse the pre-paint preference if storage is unavailable. */}
 return {view,color,accent,motion,systemDark:query('(prefers-color-scheme: dark)')?.matches??false,systemReduced:query('(prefers-reduced-motion: reduce)')?.matches??false};
}
const appearanceSnapshot=()=>appearance??=readAppearance();
function setAppearance(patch:Partial<Appearance>){appearance={...appearanceSnapshot(),...patch};window.dispatchEvent(new Event(APPEARANCE_CHANGE))}
function subscribeAppearance(change:()=>void){
 const dark=query('(prefers-color-scheme: dark)'),reduced=query('(prefers-reduced-motion: reduce)');
 const system=()=>{appearance={...appearanceSnapshot(),systemDark:dark?.matches??false,systemReduced:reduced?.matches??false};change()};
 const storage=(event:StorageEvent)=>{
  const nextView=viewModeStorageChange(event),current=appearanceSnapshot();
  if(event.key===null){appearance={...current,view:nextView??current.view,color:'system',accent:'blue',motion:'system'};change();return}
  const patch:Partial<Appearance>={...(nextView!==undefined?{view:nextView}:{}),...(event.key===COLOR_MODE_STORAGE_KEY?{color:normalizeColorMode(event.newValue)}:{}),
   ...(event.key===ACCENT_STORAGE_KEY?{accent:normalizeAccent(event.newValue)}:{}),...(event.key===MOTION_STORAGE_KEY?{motion:normalizeMotion(event.newValue)}:{})};
  if(Object.keys(patch).length){appearance={...current,...patch};change()}
 };
 dark?.addEventListener('change',system);reduced?.addEventListener('change',system);window.addEventListener('storage',storage);window.addEventListener(APPEARANCE_CHANGE,change);
 return()=>{dark?.removeEventListener('change',system);reduced?.removeEventListener('change',system);window.removeEventListener('storage',storage);window.removeEventListener(APPEARANCE_CHANGE,change)};
}

/** World view and color are local presentation; neither touches a saved game. */
export function ThemeProvider({children}:{children:ReactNode}) {
 const{view:viewMode,color:colorMode,accent,motion,systemDark,systemReduced}=useSyncExternalStore(subscribeAppearance,appearanceSnapshot,()=>SERVER_APPEARANCE);
 const resolvedColorMode=resolveColorMode(colorMode,systemDark),reducedMotion=resolveReducedMotion(motion,systemReduced);
 // The page carries the choices as data attributes, which the stylesheets read.
 useEffect(()=>{
  const root=document.documentElement;
  root.dataset.viewMode=viewMode;root.dataset.theme='paint';
  root.dataset.colorPreference=colorMode;root.dataset.colorMode=resolvedColorMode;root.style.colorScheme=resolvedColorMode;
  root.dataset.accent=accent;root.dataset.motionPreference=motion;root.dataset.motion=reducedMotion?'reduced':'full';
 },[viewMode,colorMode,resolvedColorMode,accent,motion,reducedMotion]);
 const setViewMode=useCallback((next:ViewMode)=>{const valid=normalizeViewMode(next);setAppearance({view:valid});persist(VIEW_MODE_STORAGE_KEY,valid)},[]);
 const setColorMode=useCallback((next:ColorMode)=>{if(!['light','dark','system'].includes(next))return;setAppearance({color:next});persist(COLOR_MODE_STORAGE_KEY,next)},[]);
 const setAccent=useCallback((next:Accent)=>{const valid=normalizeAccent(next);setAppearance({accent:valid});persist(ACCENT_STORAGE_KEY,valid)},[]);
 const setMotion=useCallback((next:MotionPreference)=>{const valid=normalizeMotion(next);setAppearance({motion:valid});persist(MOTION_STORAGE_KEY,valid)},[]);
 const value=useMemo(()=>({viewMode,setViewMode,colorMode,setColorMode,resolvedColorMode,accent,setAccent,motion,setMotion,reducedMotion}),[viewMode,setViewMode,colorMode,setColorMode,resolvedColorMode,accent,setAccent,motion,setMotion,reducedMotion]);
 return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useTheme(){return useContext(ThemeContext)}

export function AppearanceSettings(){
 const{colorMode,setColorMode}=useTheme();
 return <div className="appearance-settings"><div className="settings-row"><strong>Color mode</strong><div className="color-mode-toggle" role="group" aria-label="Color mode">{(['light','dark','system'] as const).map(mode=><button key={mode} type="button" aria-pressed={colorMode===mode} onClick={()=>setColorMode(mode)}>{mode==='light'?'Light':mode==='dark'?'Dark':'System'}</button>)}</div></div></div>;
}
