'use client';
import {useCallback,useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {AUDIO_PREFERENCES_KEY,DEFAULT_AUDIO_PREFERENCES,normalizeAudioPreferences,type AudioPreferences} from './audio-preferences';
import {useInterfaceAudio} from './useInterfaceAudio';
import {sound} from './sound/engine';

const AUDIO_CHANGE='painted-realms-audio-change';
/** The sound levels every reader shares: read from browser storage once, then kept in step with changes here and in other tabs. */
let audioLevels:AudioPreferences|null=null;
function readLevels(){try{return normalizeAudioPreferences(JSON.parse(localStorage.getItem(AUDIO_PREFERENCES_KEY)||'null'))}catch{return DEFAULT_AUDIO_PREFERENCES}}
const levelsSnapshot=()=>audioLevels??=readLevels();
function subscribeLevels(change:()=>void){
 const storage=(event:StorageEvent)=>{if(event.key!==AUDIO_PREFERENCES_KEY&&event.key!==null)return;try{audioLevels=normalizeAudioPreferences(JSON.parse(event.newValue||'null'))}catch{audioLevels=DEFAULT_AUDIO_PREFERENCES}change()};
 window.addEventListener('storage',storage);window.addEventListener(AUDIO_CHANGE,change);
 return()=>{window.removeEventListener('storage',storage);window.removeEventListener(AUDIO_CHANGE,change)};
}
const speechAvailable=()=>'speechSynthesis'in window&&typeof window.SpeechSynthesisUtterance==='function';
const never=()=>()=>{};

/** Device speech, and the levels of the sound engine (music, ambience, effects, interface). Levels and on/off choices persist;
    nothing sounds before the player's first press or key, and narration always starts with a choice. */
export function useAudio(){
 const[voice,setVoice]=useState(false),[speaking,setSpeaking]=useState(false);
 const preferences=useSyncExternalStore(subscribeLevels,levelsSnapshot,()=>DEFAULT_AUDIO_PREFERENCES),available=useSyncExternalStore(never,speechAvailable,()=>false);
 const interfaceAudio=useInterfaceAudio(preferences.hoverSounds);
 const voiceEnabled=useRef(false),lastCaption=useRef(''),currentLine=useRef<SpeechSynthesisUtterance|null>(null),mounted=useRef(true);
 const stopSpeech=useCallback(()=>{
  const line=currentLine.current;currentLine.current=null;
  if(line){line.onstart=null;line.onend=null;line.onerror=null;if('speechSynthesis'in window)window.speechSynthesis.cancel();}
  if(mounted.current)setSpeaking(false);
 },[]);
 const applyEngine=useCallback((p:AudioPreferences)=>sound.setLevels({music:p.musicVolume,ambience:p.ambienceVolume,effects:p.effectsVolume,interface:p.interfaceVolume},{music:p.musicOn,ambience:p.effectsOn,effects:p.effectsOn,interface:p.interfaceOn}),[]);
 const updatePreferences=useCallback((patch:Partial<AudioPreferences>)=>{
  const next=normalizeAudioPreferences({...levelsSnapshot(),...patch});audioLevels=next;window.dispatchEvent(new Event(AUDIO_CHANGE));
  try{localStorage.setItem(AUDIO_PREFERENCES_KEY,JSON.stringify(next))}catch{/* Levels remain usable without storage. */}
  if(next.voiceVolume===0)stopSpeech();
 },[stopSpeech]);
 useEffect(()=>{mounted.current=true;sound.listen();return()=>{mounted.current=false;stopSpeech()}},[stopSpeech]);
 // The sound engine follows the levels, wherever they were changed.
 useEffect(()=>{applyEngine(preferences)},[preferences,applyEngine]);
 // Voice turned all the way down in another tab: stop reading (the line's own end handler clears Speaking).
 useEffect(()=>{if(preferences.voiceVolume===0&&currentLine.current&&'speechSynthesis'in window)window.speechSynthesis.cancel()},[preferences.voiceVolume]);
 // The music steps back while a voice reads the story.
 useEffect(()=>{sound.duck(speaking)},[speaking]);
 const readCaption=useCallback((text:string)=>{
  stopSpeech();
  if(!text||levelsSnapshot().voiceVolume===0||!('speechSynthesis'in window)||typeof window.SpeechSynthesisUtterance!=='function')return;
  try{
   window.speechSynthesis.cancel();const line=new SpeechSynthesisUtterance(text);currentLine.current=line;
   line.rate=levelsSnapshot().speechRate;line.pitch=.92;line.volume=levelsSnapshot().voiceVolume;
   line.onstart=()=>{if(currentLine.current===line&&mounted.current)setSpeaking(true)};
   line.onend=()=>{if(currentLine.current!==line)return;currentLine.current=null;if(mounted.current)setSpeaking(false)};
   line.onerror=event=>{if(currentLine.current!==line)return;currentLine.current=null;if(mounted.current)setSpeaking(false);if(event.error==='canceled'||event.error==='interrupted')return;voiceEnabled.current=false;if(mounted.current)setVoice(false)};
   window.speechSynthesis.speak(line);
  }catch{stopSpeech();voiceEnabled.current=false;if(mounted.current)setVoice(false)}
 },[stopSpeech]);
 const speak=useCallback((text:string)=>{lastCaption.current=text;if(voiceEnabled.current)readCaption(text)},[readCaption]);
 const toggleVoice=useCallback(()=>{
  if(!('speechSynthesis'in window)||typeof window.SpeechSynthesisUtterance!=='function')return;
  const enabled=!voiceEnabled.current;voiceEnabled.current=enabled;setVoice(enabled);
  if(enabled)readCaption(lastCaption.current);else stopSpeech();
 },[readCaption,stopSpeech]);
 const previewVoice=useCallback(()=>readCaption('Your party is ready. Choose your next move.'),[readCaption]);
 const toggleMusic=useCallback(()=>updatePreferences({musicOn:!levelsSnapshot().musicOn}),[updatePreferences]);
 const toggleEffects=useCallback(()=>updatePreferences({effectsOn:!levelsSnapshot().effectsOn}),[updatePreferences]);
 const setAmbienceVolume=useCallback((value:number)=>updatePreferences({ambienceVolume:value}),[updatePreferences]);
 const setEffectsVolume=useCallback((value:number)=>updatePreferences({effectsVolume:value}),[updatePreferences]);
 const toggleInterfaceSounds=useCallback(()=>updatePreferences({interfaceOn:!levelsSnapshot().interfaceOn}),[updatePreferences]);
 const setVoiceVolume=useCallback((value:number)=>updatePreferences({voiceVolume:value}),[updatePreferences]);
 const setSpeechRate=useCallback((value:number)=>updatePreferences({speechRate:value}),[updatePreferences]);
 const setMusicVolume=useCallback((value:number)=>updatePreferences({musicVolume:value}),[updatePreferences]);
 const setInterfaceVolume=useCallback((value:number)=>updatePreferences({interfaceVolume:value}),[updatePreferences]);
 const setHoverSounds=useCallback((value:boolean)=>updatePreferences({hoverSounds:value}),[updatePreferences]);
 return{voice,speaking,music:preferences.musicOn,effects:preferences.effectsOn,interfaceSounds:preferences.interfaceOn,available,speak,toggleVoice,toggleMusic,toggleEffects,toggleInterfaceSounds,preferences,setVoiceVolume,setSpeechRate,setMusicVolume,setAmbienceVolume,setEffectsVolume,previewVoice,...interfaceAudio,setInterfaceVolume,setHoverSounds};
}
