'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {AUDIO_PREFERENCES_KEY,DEFAULT_AUDIO_PREFERENCES,normalizeAudioPreferences,type AudioPreferences} from './audio-preferences';
import {useInterfaceAudio} from './useInterfaceAudio';
import {sound} from './sound/engine';

/** Device speech, and the levels of the sound engine (music, ambience, effects, interface). Levels and on/off choices persist;
    nothing sounds before the player's first press or key, and narration always starts with a choice. */
export function useAudio(){
 const[voice,setVoice]=useState(false),[speaking,setSpeaking]=useState(false),[available,setAvailable]=useState(false),[preferences,setPreferences]=useState<AudioPreferences>(DEFAULT_AUDIO_PREFERENCES);
 const interfaceAudio=useInterfaceAudio(preferences.hoverSounds);
 const voiceEnabled=useRef(false),lastCaption=useRef(''),currentLine=useRef<SpeechSynthesisUtterance|null>(null),mounted=useRef(true),levels=useRef(DEFAULT_AUDIO_PREFERENCES);
 const stopSpeech=useCallback(()=>{
  const line=currentLine.current;currentLine.current=null;
  if(line){line.onstart=null;line.onend=null;line.onerror=null;if('speechSynthesis'in window)window.speechSynthesis.cancel();}
  if(mounted.current)setSpeaking(false);
 },[]);
 const applyEngine=useCallback((p:AudioPreferences)=>sound.setLevels({music:p.musicVolume,ambience:p.ambienceVolume,effects:p.effectsVolume,interface:p.interfaceVolume},{music:p.musicOn,ambience:p.effectsOn,effects:p.effectsOn,interface:p.interfaceOn}),[]);
 const applyPreferences=useCallback((next:AudioPreferences)=>{levels.current=next;setPreferences(next);applyEngine(next);if(next.voiceVolume===0)stopSpeech()},[applyEngine,stopSpeech]);
 const updatePreferences=useCallback((patch:Partial<AudioPreferences>)=>{const next=normalizeAudioPreferences({...levels.current,...patch});applyPreferences(next);try{localStorage.setItem(AUDIO_PREFERENCES_KEY,JSON.stringify(next))}catch{/* Levels remain usable without storage. */}},[applyPreferences]);
 useEffect(()=>{
  mounted.current=true;sound.listen();setAvailable('speechSynthesis'in window&&typeof window.SpeechSynthesisUtterance==='function');
  try{applyPreferences(normalizeAudioPreferences(JSON.parse(localStorage.getItem(AUDIO_PREFERENCES_KEY)||'null')))}catch{applyPreferences(DEFAULT_AUDIO_PREFERENCES)}
  const storage=(event:StorageEvent)=>{if(event.key!==AUDIO_PREFERENCES_KEY&&event.key!==null)return;try{applyPreferences(normalizeAudioPreferences(JSON.parse(event.newValue||'null')))}catch{applyPreferences(DEFAULT_AUDIO_PREFERENCES)}};
  window.addEventListener('storage',storage);
  return()=>{mounted.current=false;stopSpeech();window.removeEventListener('storage',storage)};
 },[stopSpeech,applyPreferences]);
 // The music steps back while a voice reads the story.
 useEffect(()=>{sound.duck(speaking)},[speaking]);
 const readCaption=useCallback((text:string)=>{
  stopSpeech();
  if(!text||levels.current.voiceVolume===0||!('speechSynthesis'in window)||typeof window.SpeechSynthesisUtterance!=='function')return;
  try{
   window.speechSynthesis.cancel();const line=new SpeechSynthesisUtterance(text);currentLine.current=line;
   line.rate=levels.current.speechRate;line.pitch=.92;line.volume=levels.current.voiceVolume;
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
 const toggleMusic=useCallback(()=>updatePreferences({musicOn:!levels.current.musicOn}),[updatePreferences]);
 const toggleEffects=useCallback(()=>updatePreferences({effectsOn:!levels.current.effectsOn}),[updatePreferences]);
 const setAmbienceVolume=useCallback((value:number)=>updatePreferences({ambienceVolume:value}),[updatePreferences]);
 const setEffectsVolume=useCallback((value:number)=>updatePreferences({effectsVolume:value}),[updatePreferences]);
 const toggleInterfaceSounds=useCallback(()=>updatePreferences({interfaceOn:!levels.current.interfaceOn}),[updatePreferences]);
 const setVoiceVolume=useCallback((value:number)=>updatePreferences({voiceVolume:value}),[updatePreferences]);
 const setSpeechRate=useCallback((value:number)=>updatePreferences({speechRate:value}),[updatePreferences]);
 const setMusicVolume=useCallback((value:number)=>updatePreferences({musicVolume:value}),[updatePreferences]);
 const setInterfaceVolume=useCallback((value:number)=>updatePreferences({interfaceVolume:value}),[updatePreferences]);
 const setHoverSounds=useCallback((value:boolean)=>updatePreferences({hoverSounds:value}),[updatePreferences]);
 return{voice,speaking,music:preferences.musicOn,effects:preferences.effectsOn,interfaceSounds:preferences.interfaceOn,available,speak,toggleVoice,toggleMusic,toggleEffects,toggleInterfaceSounds,preferences,setVoiceVolume,setSpeechRate,setMusicVolume,setAmbienceVolume,setEffectsVolume,previewVoice,...interfaceAudio,setInterfaceVolume,setHoverSounds};
}
