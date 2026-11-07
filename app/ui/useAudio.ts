'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {AUDIO_PREFERENCES_KEY,DEFAULT_AUDIO_PREFERENCES,normalizeAudioPreferences,type AudioPreferences} from './audio-preferences';
import {useInterfaceAudio} from './useInterfaceAudio';

/** Device speech and synthesized music. Levels persist; enabling audio always requires a gesture. */
export function useAudio(){
 const[voice,setVoice]=useState(false),[speaking,setSpeaking]=useState(false),[music,setMusic]=useState(false),[available,setAvailable]=useState(false),[preferences,setPreferences]=useState<AudioPreferences>(DEFAULT_AUDIO_PREFERENCES);
 const interfaceAudio=useInterfaceAudio(preferences.interfaceVolume,preferences.hoverSounds);
 const voiceEnabled=useRef(false),musicEnabled=useRef(false),lastCaption=useRef(''),currentLine=useRef<SpeechSynthesisUtterance|null>(null),context=useRef<AudioContext|null>(null),masterGain=useRef<GainNode|null>(null),timer=useRef<ReturnType<typeof setInterval>|null>(null),tones=useRef(new Set<OscillatorNode>()),musicRun=useRef(0),mounted=useRef(true),levels=useRef(DEFAULT_AUDIO_PREFERENCES);
 const stopSpeech=useCallback(()=>{
  const line=currentLine.current;currentLine.current=null;
  if(line){line.onstart=null;line.onend=null;line.onerror=null;if('speechSynthesis'in window)window.speechSynthesis.cancel();}
  if(mounted.current)setSpeaking(false);
 },[]);
 const applyMusicVolume=useCallback(()=>{
  const audio=context.current,gain=masterGain.current;if(!audio||!gain||audio.state==='closed')return;
  gain.gain.cancelScheduledValues(audio.currentTime);gain.gain.setTargetAtTime(document.hidden?0:levels.current.musicVolume,audio.currentTime,.04);
 },[]);
 const applyPreferences=useCallback((next:AudioPreferences)=>{levels.current=next;setPreferences(next);applyMusicVolume();if(next.voiceVolume===0)stopSpeech()},[applyMusicVolume,stopSpeech]);
 const updatePreferences=useCallback((patch:Partial<AudioPreferences>)=>{const next=normalizeAudioPreferences({...levels.current,...patch});applyPreferences(next);try{localStorage.setItem(AUDIO_PREFERENCES_KEY,JSON.stringify(next))}catch{/* Levels remain usable without storage. */}},[applyPreferences]);
 const stopMusic=useCallback(()=>{
  musicRun.current++;musicEnabled.current=false;if(timer.current)clearInterval(timer.current);timer.current=null;
  for(const tone of tones.current){try{tone.stop()}catch{/* Already completed. */}}tones.current.clear();
  if(context.current?.state==='running')void context.current.suspend().catch(()=>{});
 },[]);
 useEffect(()=>{
  mounted.current=true;setAvailable('speechSynthesis'in window&&typeof window.SpeechSynthesisUtterance==='function');
  try{applyPreferences(normalizeAudioPreferences(JSON.parse(localStorage.getItem(AUDIO_PREFERENCES_KEY)||'null')))}catch{applyPreferences(DEFAULT_AUDIO_PREFERENCES)}
  const storage=(event:StorageEvent)=>{if(event.key!==AUDIO_PREFERENCES_KEY&&event.key!==null)return;try{applyPreferences(normalizeAudioPreferences(JSON.parse(event.newValue||'null')))}catch{applyPreferences(DEFAULT_AUDIO_PREFERENCES)}};
  window.addEventListener('storage',storage);document.addEventListener('visibilitychange',applyMusicVolume);
  return()=>{mounted.current=false;stopSpeech();stopMusic();window.removeEventListener('storage',storage);document.removeEventListener('visibilitychange',applyMusicVolume);const old=context.current;context.current=null;masterGain.current=null;if(old&&old.state!=='closed')void old.close().catch(()=>{})};
 },[stopMusic,stopSpeech,applyPreferences,applyMusicVolume]);
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
 const toggleMusic=useCallback(()=>{
  if(musicEnabled.current){stopMusic();setMusic(false);return}
  try{
   const previous=context.current,audio=previous?.state!=='closed'?previous??new AudioContext():new AudioContext();
   if(audio!==previous||!masterGain.current){const master=audio.createGain();master.gain.value=document.hidden?0:levels.current.musicVolume;master.connect(audio.destination);masterGain.current=master}
   context.current=audio;const run=++musicRun.current;musicEnabled.current=true;setMusic(true);
   void audio.resume().then(()=>{
    if(!mounted.current||!musicEnabled.current||musicRun.current!==run)return;
    applyMusicVolume();let step=0;const notes=[146.83,220,293.66,349.23,261.63,220,174.61,196];
    const play=()=>{
     if(document.hidden||audio.state!=='running'||musicRun.current!==run||!masterGain.current)return;
     const gain=audio.createGain();gain.gain.setValueAtTime(0,audio.currentTime);gain.gain.linearRampToValueAtTime(.07,audio.currentTime+.1);gain.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+2.8);gain.connect(masterGain.current);
     const tone=audio.createOscillator();tones.current.add(tone);tone.type='sine';tone.frequency.value=notes[step++%notes.length];tone.connect(gain);tone.onended=()=>{tones.current.delete(tone);tone.disconnect();gain.disconnect()};tone.start();tone.stop(audio.currentTime+3);
    };
    play();timer.current=setInterval(play,1800);
   }).catch(()=>{if(musicRun.current!==run||!mounted.current)return;stopMusic();setMusic(false)});
  }catch{stopMusic();setMusic(false)}
 },[stopMusic,applyMusicVolume]);
 const setVoiceVolume=useCallback((value:number)=>updatePreferences({voiceVolume:value}),[updatePreferences]);
 const setSpeechRate=useCallback((value:number)=>updatePreferences({speechRate:value}),[updatePreferences]);
 const setMusicVolume=useCallback((value:number)=>updatePreferences({musicVolume:value}),[updatePreferences]);
 const setInterfaceVolume=useCallback((value:number)=>updatePreferences({interfaceVolume:value}),[updatePreferences]);
 const setHoverSounds=useCallback((value:boolean)=>updatePreferences({hoverSounds:value}),[updatePreferences]);
 return{voice,speaking,music,available,speak,toggleVoice,toggleMusic,preferences,setVoiceVolume,setSpeechRate,setMusicVolume,previewVoice,...interfaceAudio,setInterfaceVolume,setHoverSounds};
}
