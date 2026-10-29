export interface AudioPreferences{voiceVolume:number;speechRate:number;musicVolume:number}
export const AUDIO_PREFERENCES_KEY='painted-realms.audio.v1';
export const DEFAULT_AUDIO_PREFERENCES:AudioPreferences={voiceVolume:.75,speechRate:.95,musicVolume:.5};
function bounded(value:unknown,min:number,max:number,fallback:number){return typeof value==='number'&&Number.isFinite(value)?Math.min(max,Math.max(min,value)):fallback}
/** Enable flags are deliberately never restored: audio starts only after a user gesture. */
export function normalizeAudioPreferences(value:unknown):AudioPreferences{
 const v=value&&typeof value==='object'?value as Partial<AudioPreferences>:{};
 return{voiceVolume:bounded(v.voiceVolume,0,1,DEFAULT_AUDIO_PREFERENCES.voiceVolume),speechRate:bounded(v.speechRate,.5,1.5,DEFAULT_AUDIO_PREFERENCES.speechRate),musicVolume:bounded(v.musicVolume,0,1,DEFAULT_AUDIO_PREFERENCES.musicVolume)};
}
