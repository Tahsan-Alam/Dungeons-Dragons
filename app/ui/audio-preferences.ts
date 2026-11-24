/** Levels and on/off choices for each kind of sound. Playback itself always waits for the player's first press or key. */
export interface AudioPreferences{voiceVolume:number;speechRate:number;musicVolume:number;interfaceVolume:number;hoverSounds:boolean;ambienceVolume:number;effectsVolume:number;musicOn:boolean;effectsOn:boolean;interfaceOn:boolean}
export const AUDIO_PREFERENCES_KEY='painted-realms.audio.v1';
export const DEFAULT_AUDIO_PREFERENCES:AudioPreferences={voiceVolume:.75,speechRate:.95,musicVolume:.5,interfaceVolume:.45,hoverSounds:true,ambienceVolume:.6,effectsVolume:.8,musicOn:true,effectsOn:true,interfaceOn:true};
function bounded(value:unknown,min:number,max:number,fallback:number){return typeof value==='number'&&Number.isFinite(value)?Math.min(max,Math.max(min,value)):fallback}
/** Narration is never restored (it starts with a choice each visit); music, effects and interface sounds keep the player's on/off choice and still wait for a gesture. */
export function normalizeAudioPreferences(value:unknown):AudioPreferences{
 const v=value&&typeof value==='object'?value as Partial<AudioPreferences>:{};
 return{voiceVolume:bounded(v.voiceVolume,0,1,DEFAULT_AUDIO_PREFERENCES.voiceVolume),speechRate:bounded(v.speechRate,.5,1.5,DEFAULT_AUDIO_PREFERENCES.speechRate),musicVolume:bounded(v.musicVolume,0,1,DEFAULT_AUDIO_PREFERENCES.musicVolume),interfaceVolume:bounded(v.interfaceVolume,0,1,DEFAULT_AUDIO_PREFERENCES.interfaceVolume),hoverSounds:typeof v.hoverSounds==='boolean'?v.hoverSounds:DEFAULT_AUDIO_PREFERENCES.hoverSounds,
  ambienceVolume:bounded(v.ambienceVolume,0,1,DEFAULT_AUDIO_PREFERENCES.ambienceVolume),effectsVolume:bounded(v.effectsVolume,0,1,DEFAULT_AUDIO_PREFERENCES.effectsVolume),
  musicOn:typeof v.musicOn==='boolean'?v.musicOn:true,effectsOn:typeof v.effectsOn==='boolean'?v.effectsOn:true,interfaceOn:typeof v.interfaceOn==='boolean'?v.interfaceOn:true};
}
