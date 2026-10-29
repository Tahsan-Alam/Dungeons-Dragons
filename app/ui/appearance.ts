export type ArtTheme = 'paint' | 'pixel';
export type ColorMode = 'light' | 'dark' | 'system';
export type ResolvedColorMode = 'light' | 'dark';
export const THEME_STORAGE_KEY = 'painted-realms-theme';
export const COLOR_MODE_STORAGE_KEY = 'painted-realms-color-mode';
export function normalizeArtTheme(value:unknown):ArtTheme{return value==='pixel'?'pixel':'paint';}
export function normalizeColorMode(value:unknown):ColorMode{return value==='light'||value==='dark'?value:'system';}
export function resolveColorMode(mode:ColorMode,systemDark:boolean):ResolvedColorMode{return mode==='system'?(systemDark?'dark':'light'):mode;}

/** Runs in <head> before the page paints. Storage failure never blocks rendering. */
export const APPEARANCE_BOOTSTRAP=`(()=>{let theme='paint',mode='system';try{theme=localStorage.getItem('${THEME_STORAGE_KEY}')==='pixel'?'pixel':'paint';const saved=localStorage.getItem('${COLOR_MODE_STORAGE_KEY}');if(saved==='light'||saved==='dark')mode=saved}catch{}let dark=false;try{dark=matchMedia('(prefers-color-scheme: dark)').matches}catch{}const resolved=mode==='system'?(dark?'dark':'light'):mode;const root=document.documentElement;root.dataset.theme=theme;root.dataset.colorPreference=mode;root.dataset.colorMode=resolved;root.style.colorScheme=resolved})()`;
