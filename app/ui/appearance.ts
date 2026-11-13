export type ViewMode='2d'|'2.5d';
export type ColorMode='light'|'dark'|'system';
export type ResolvedColorMode='light'|'dark';
export type MotionPreference='system'|'full'|'reduced';
export const ACCENT_NAMES=['blue','violet','teal','rose','orange'] as const;
export type Accent=typeof ACCENT_NAMES[number];
export const ACCENT_PALETTES:Record<Accent,Record<ResolvedColorMode,{accent:string;hover:string;ink:string;soft:string}>>={
 blue:{light:{accent:'#2563eb',hover:'#1d4ed8',ink:'#ffffff',soft:'#edf3ff'},dark:{accent:'#7da7ff',hover:'#a3c0ff',ink:'#08152f',soft:'#15233e'}},
 violet:{light:{accent:'#7039d6',hover:'#5c25c2',ink:'#ffffff',soft:'#f3edff'},dark:{accent:'#b69bff',hover:'#cebbff',ink:'#170b35',soft:'#241b3d'}},
 teal:{light:{accent:'#087a70',hover:'#06665f',ink:'#ffffff',soft:'#e9f8f5'},dark:{accent:'#54d4bd',hover:'#88e8d6',ink:'#05241e',soft:'#0c2b26'}},
 rose:{light:{accent:'#be2757',hover:'#a51f4a',ink:'#ffffff',soft:'#fff0f4'},dark:{accent:'#ff8db1',hover:'#ffb3ca',ink:'#350914',soft:'#351420'}},
 orange:{light:{accent:'#c13e0b',hover:'#a93408',ink:'#ffffff',soft:'#fff1ea'},dark:{accent:'#ffa15e',hover:'#ffbf91',ink:'#321405',soft:'#342014'}},
};
export const VIEW_MODE_STORAGE_KEY='painted-realms-view-mode';
export const COLOR_MODE_STORAGE_KEY='painted-realms-color-mode';
export const ACCENT_STORAGE_KEY='painted-realms-accent';
export const MOTION_STORAGE_KEY='painted-realms-motion';
export function normalizeViewMode(value:unknown):ViewMode{return value==='2.5d'?'2.5d':'2d'}
/** Ignore unrelated preferences; deletion and storage.clear() restore the flat view. */
export function viewModeStorageChange(event:{key:string|null;newValue:string|null}):ViewMode|undefined{return event.key===null?'2d':event.key===VIEW_MODE_STORAGE_KEY?normalizeViewMode(event.newValue):undefined}
export function normalizeColorMode(value:unknown):ColorMode{return value==='light'||value==='dark'?value:'system'}
export function normalizeAccent(value:unknown):Accent{return ACCENT_NAMES.includes(value as Accent)?value as Accent:'blue'}
export function normalizeMotion(value:unknown):MotionPreference{return value==='full'||value==='reduced'?value:'system'}
export function resolveColorMode(mode:ColorMode,systemDark:boolean):ResolvedColorMode{return mode==='system'?(systemDark?'dark':'light'):mode}
export function resolveReducedMotion(motion:MotionPreference,systemReduced:boolean){return motion==='reduced'||motion==='system'&&systemReduced}
/** Runs in <head> before the page paints. Every stored value is validated. */
export const APPEARANCE_BOOTSTRAP=`(()=>{let view='2d',mode='system',accent='blue',motion='system';try{const saved=localStorage.getItem('${COLOR_MODE_STORAGE_KEY}');if(saved==='light'||saved==='dark')mode=saved;const color=localStorage.getItem('${ACCENT_STORAGE_KEY}');if(${JSON.stringify(ACCENT_NAMES)}.includes(color))accent=color;const movement=localStorage.getItem('${MOTION_STORAGE_KEY}');if(movement==='full'||movement==='reduced')motion=movement;if(localStorage.getItem('${VIEW_MODE_STORAGE_KEY}')==='2.5d')view='2.5d'}catch{}let dark=false,reduced=false;try{dark=matchMedia('(prefers-color-scheme: dark)').matches;reduced=matchMedia('(prefers-reduced-motion: reduce)').matches}catch{}const resolved=mode==='system'?(dark?'dark':'light'):mode;const root=document.documentElement;root.dataset.theme='paint';root.dataset.viewMode=view;root.dataset.colorPreference=mode;root.dataset.colorMode=resolved;root.dataset.accent=accent;root.dataset.motionPreference=motion;root.dataset.motion=motion==='reduced'||motion==='system'&&reduced?'reduced':'full';root.style.colorScheme=resolved})()`;
