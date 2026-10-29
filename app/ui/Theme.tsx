'use client';
import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {COLOR_MODE_STORAGE_KEY,THEME_STORAGE_KEY,normalizeArtTheme,normalizeColorMode,resolveColorMode} from './appearance';
import type {ArtTheme,ColorMode,ResolvedColorMode} from './appearance';
export type {ArtTheme,ColorMode,ResolvedColorMode} from './appearance';
export {THEME_STORAGE_KEY,COLOR_MODE_STORAGE_KEY} from './appearance';

type ThemeValue={theme:ArtTheme;setTheme:(theme:ArtTheme)=>void;toggleTheme:()=>void;colorMode:ColorMode;setColorMode:(mode:ColorMode)=>void;resolvedColorMode:ResolvedColorMode};
const ThemeContext=createContext<ThemeValue>({theme:'paint',setTheme:()=>{},toggleTheme:()=>{},colorMode:'system',setColorMode:()=>{},resolvedColorMode:'light'});
function persist(key:string,value:string){try{localStorage.setItem(key,value)}catch{/* Preferences still work when browser storage is disabled. */}}

/** Art style and color preference are local presentation; neither touches a saved game. */
export function ThemeProvider({children}:{children:ReactNode}) {
 const[theme,updateTheme]=useState<ArtTheme>('paint'),[colorMode,updateColorMode]=useState<ColorMode>('system'),[resolvedColorMode,updateResolved]=useState<ResolvedColorMode>('light');
 const themeRef=useRef<ArtTheme>('paint'),modeRef=useRef<ColorMode>('system'),media=useRef<MediaQueryList|null>(null);
 const applyTheme=useCallback((next:ArtTheme)=>{themeRef.current=next;updateTheme(next);document.documentElement.dataset.theme=next},[]);
 const applyColor=useCallback((next:ColorMode)=>{
  modeRef.current=next;updateColorMode(next);const resolved=resolveColorMode(next,media.current?.matches??false);updateResolved(resolved);
  const root=document.documentElement;root.dataset.colorPreference=next;root.dataset.colorMode=resolved;root.style.colorScheme=resolved;
 },[]);
 useEffect(()=>{
  try{media.current=window.matchMedia('(prefers-color-scheme: dark)')}catch{media.current=null}
  let preferredTheme=normalizeArtTheme(document.documentElement.dataset.theme),preferredColor=normalizeColorMode(document.documentElement.dataset.colorPreference);
  try{preferredTheme=normalizeArtTheme(localStorage.getItem(THEME_STORAGE_KEY));preferredColor=normalizeColorMode(localStorage.getItem(COLOR_MODE_STORAGE_KEY))}catch{/* Reuse the pre-paint preference if storage is unavailable. */}
  applyTheme(preferredTheme);applyColor(preferredColor);
  const systemChange=()=>{if(modeRef.current==='system')applyColor('system')};
  const storageChange=(event:StorageEvent)=>{
   if(event.key===null){applyTheme('paint');applyColor('system');return}
   if(event.key===THEME_STORAGE_KEY)applyTheme(normalizeArtTheme(event.newValue));
   if(event.key===COLOR_MODE_STORAGE_KEY)applyColor(normalizeColorMode(event.newValue));
  };
  media.current?.addEventListener('change',systemChange);window.addEventListener('storage',storageChange);
  return()=>{media.current?.removeEventListener('change',systemChange);window.removeEventListener('storage',storageChange)};
 },[applyTheme,applyColor]);
 const setTheme=useCallback((next:ArtTheme)=>{if(next!=='paint'&&next!=='pixel')return;applyTheme(next);persist(THEME_STORAGE_KEY,next)},[applyTheme]);
 const toggleTheme=useCallback(()=>{const next=themeRef.current==='paint'?'pixel':'paint';applyTheme(next);persist(THEME_STORAGE_KEY,next)},[applyTheme]);
 const setColorMode=useCallback((next:ColorMode)=>{if(!['light','dark','system'].includes(next))return;applyColor(next);persist(COLOR_MODE_STORAGE_KEY,next)},[applyColor]);
 const value=useMemo(()=>({theme,setTheme,toggleTheme,colorMode,setColorMode,resolvedColorMode}),[theme,setTheme,toggleTheme,colorMode,setColorMode,resolvedColorMode]);
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
 return <div className="appearance-settings"><div className="settings-row"><strong>Appearance</strong><div className="color-mode-toggle" role="group" aria-label="Color mode">{(['light','dark','system'] as const).map(mode=><button key={mode} type="button" aria-pressed={colorMode===mode} onClick={()=>setColorMode(mode)}>{mode==='light'?'Light':mode==='dark'?'Dark':'System'}</button>)}</div></div></div>;
}
