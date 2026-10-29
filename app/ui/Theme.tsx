'use client';
import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {VIEW_MODE_STORAGE_KEY,normalizeViewMode,viewModeStorageChange,ACCENT_STORAGE_KEY,MOTION_STORAGE_KEY,COLOR_MODE_STORAGE_KEY,THEME_STORAGE_KEY,normalizeAccent,normalizeMotion,normalizeArtTheme,normalizeColorMode,resolveColorMode,resolveReducedMotion} from './appearance';
import type {ArtTheme,ViewMode,ColorMode,ResolvedColorMode,Accent,MotionPreference} from './appearance';
export type {ArtTheme,ViewMode,ColorMode,ResolvedColorMode,Accent,MotionPreference} from './appearance';
export {VIEW_MODE_STORAGE_KEY,THEME_STORAGE_KEY,COLOR_MODE_STORAGE_KEY,ACCENT_STORAGE_KEY,MOTION_STORAGE_KEY} from './appearance';

type ThemeValue={viewMode:ViewMode;setViewMode:(mode:ViewMode)=>void;theme:ArtTheme;setTheme:(theme:ArtTheme)=>void;toggleTheme:()=>void;colorMode:ColorMode;setColorMode:(mode:ColorMode)=>void;resolvedColorMode:ResolvedColorMode;accent:Accent;setAccent:(accent:Accent)=>void;motion:MotionPreference;setMotion:(motion:MotionPreference)=>void;reducedMotion:boolean};
const ThemeContext=createContext<ThemeValue>({viewMode:'2d',setViewMode:()=>{},theme:'paint',setTheme:()=>{},toggleTheme:()=>{},colorMode:'system',setColorMode:()=>{},resolvedColorMode:'light',accent:'blue',setAccent:()=>{},motion:'system',setMotion:()=>{},reducedMotion:false});
function persist(key:string,value:string){try{localStorage.setItem(key,value)}catch{/* Preferences still work when browser storage is disabled. */}}

/** World view, art and color are local presentation; none touches a saved game. */
export function ThemeProvider({children}:{children:ReactNode}) {
 const[viewMode,updateViewMode]=useState<ViewMode>('2d'),[theme,updateTheme]=useState<ArtTheme>('paint'),[colorMode,updateColorMode]=useState<ColorMode>('system'),[resolvedColorMode,updateResolved]=useState<ResolvedColorMode>('light'),[accent,updateAccent]=useState<Accent>('blue'),[motion,updateMotion]=useState<MotionPreference>('system'),[reducedMotion,updateReducedMotion]=useState(false);
 const themeRef=useRef<ArtTheme>('paint'),modeRef=useRef<ColorMode>('system'),media=useRef<MediaQueryList|null>(null),motionRef=useRef<MotionPreference>('system'),motionMedia=useRef<MediaQueryList|null>(null);
 const applyViewMode=useCallback((next:ViewMode)=>{updateViewMode(next);document.documentElement.dataset.viewMode=next},[]);
 const applyTheme=useCallback((next:ArtTheme)=>{themeRef.current=next;updateTheme(next);document.documentElement.dataset.theme=next},[]);
 const applyColor=useCallback((next:ColorMode)=>{
  modeRef.current=next;updateColorMode(next);const resolved=resolveColorMode(next,media.current?.matches??false);updateResolved(resolved);
  const root=document.documentElement;root.dataset.colorPreference=next;root.dataset.colorMode=resolved;root.style.colorScheme=resolved;
 },[]);
 const applyAccent=useCallback((next:Accent)=>{updateAccent(next);document.documentElement.dataset.accent=next},[]);
 const applyMotion=useCallback((next:MotionPreference)=>{motionRef.current=next;updateMotion(next);const reduced=resolveReducedMotion(next,motionMedia.current?.matches??false);updateReducedMotion(reduced);document.documentElement.dataset.motionPreference=next;document.documentElement.dataset.motion=reduced?'reduced':'full'},[]);
 useEffect(()=>{
  try{motionMedia.current=window.matchMedia('(prefers-reduced-motion: reduce)')}catch{motionMedia.current=null}
  try{media.current=window.matchMedia('(prefers-color-scheme: dark)')}catch{media.current=null}
  let preferredView=normalizeViewMode(document.documentElement.dataset.viewMode),preferredTheme=normalizeArtTheme(document.documentElement.dataset.theme),preferredColor=normalizeColorMode(document.documentElement.dataset.colorPreference),preferredAccent=normalizeAccent(document.documentElement.dataset.accent),preferredMotion=normalizeMotion(document.documentElement.dataset.motionPreference);
  try{preferredView=normalizeViewMode(localStorage.getItem(VIEW_MODE_STORAGE_KEY));preferredTheme=normalizeArtTheme(localStorage.getItem(THEME_STORAGE_KEY));preferredColor=normalizeColorMode(localStorage.getItem(COLOR_MODE_STORAGE_KEY));preferredAccent=normalizeAccent(localStorage.getItem(ACCENT_STORAGE_KEY));preferredMotion=normalizeMotion(localStorage.getItem(MOTION_STORAGE_KEY))}catch{/* Reuse the pre-paint preference if storage is unavailable. */}
  applyViewMode(preferredView);applyTheme(preferredTheme);applyColor(preferredColor);applyAccent(preferredAccent);applyMotion(preferredMotion);
  const systemChange=()=>{if(modeRef.current==='system')applyColor('system')};
  const motionChange=()=>{if(motionRef.current==='system')applyMotion('system')};
  const storageChange=(event:StorageEvent)=>{
   const nextView=viewModeStorageChange(event);if(nextView!==undefined)applyViewMode(nextView);
   if(event.key===null){applyTheme('paint');applyColor('system');applyAccent('blue');applyMotion('system');return}
   if(event.key===THEME_STORAGE_KEY)applyTheme(normalizeArtTheme(event.newValue));
   if(event.key===COLOR_MODE_STORAGE_KEY)applyColor(normalizeColorMode(event.newValue));
   if(event.key===ACCENT_STORAGE_KEY)applyAccent(normalizeAccent(event.newValue));
   if(event.key===MOTION_STORAGE_KEY)applyMotion(normalizeMotion(event.newValue));
  };
  motionMedia.current?.addEventListener('change',motionChange);media.current?.addEventListener('change',systemChange);window.addEventListener('storage',storageChange);
  return()=>{motionMedia.current?.removeEventListener('change',motionChange);media.current?.removeEventListener('change',systemChange);window.removeEventListener('storage',storageChange)};
 },[applyViewMode,applyTheme,applyColor,applyAccent,applyMotion]);
 const setViewMode=useCallback((next:ViewMode)=>{const valid=normalizeViewMode(next);applyViewMode(valid);persist(VIEW_MODE_STORAGE_KEY,valid)},[applyViewMode]);
 const setTheme=useCallback((next:ArtTheme)=>{if(next!=='paint'&&next!=='pixel')return;applyTheme(next);persist(THEME_STORAGE_KEY,next)},[applyTheme]);
 const toggleTheme=useCallback(()=>{const next=themeRef.current==='paint'?'pixel':'paint';applyTheme(next);persist(THEME_STORAGE_KEY,next)},[applyTheme]);
 const setColorMode=useCallback((next:ColorMode)=>{if(!['light','dark','system'].includes(next))return;applyColor(next);persist(COLOR_MODE_STORAGE_KEY,next)},[applyColor]);
 const setAccent=useCallback((next:Accent)=>{const valid=normalizeAccent(next);applyAccent(valid);persist(ACCENT_STORAGE_KEY,valid)},[applyAccent]);
 const setMotion=useCallback((next:MotionPreference)=>{const valid=normalizeMotion(next);applyMotion(valid);persist(MOTION_STORAGE_KEY,valid)},[applyMotion]);
 const value=useMemo(()=>({viewMode,setViewMode,theme,setTheme,toggleTheme,colorMode,setColorMode,resolvedColorMode,accent,setAccent,motion,setMotion,reducedMotion}),[viewMode,setViewMode,theme,setTheme,toggleTheme,colorMode,setColorMode,resolvedColorMode,accent,setAccent,motion,setMotion,reducedMotion]);
 return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useTheme(){return useContext(ThemeContext)}

export function ThemeToggle(){
 const{theme,setTheme}=useTheme();
 return <div className="theme-toggle" role="group" aria-label="Art style">
  <button type="button" className={theme==='paint'?'selected':''} aria-pressed={theme==='paint'} onClick={()=>setTheme('paint')} title="Paint art style"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m6 10 5-7 2-1 1 2-6 7M6 10c-3-2-4 1-4 4 3 0 6-1 4-4Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg><span>Paint</span></button>
  <button type="button" className={theme==='pixel'?'selected':''} aria-pressed={theme==='pixel'} onClick={()=>setTheme('pixel')} title="Pixel art style"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true"><path d="M2 2h5v5H2Zm7 0h5v5H9ZM2 9h5v5H2Zm7 0h5v5H9Z"/></svg><span>Pixel</span></button>
 </div>;
}

export function AppearanceSettings(){
 const{colorMode,setColorMode}=useTheme();
 return <div className="appearance-settings"><div className="settings-row"><strong>Color mode</strong><div className="color-mode-toggle" role="group" aria-label="Color mode">{(['light','dark','system'] as const).map(mode=><button key={mode} type="button" aria-pressed={colorMode===mode} onClick={()=>setColorMode(mode)}>{mode==='light'?'Light':mode==='dark'?'Dark':'System'}</button>)}</div></div></div>;
}
