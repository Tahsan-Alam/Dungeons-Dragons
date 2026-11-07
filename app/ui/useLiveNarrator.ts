'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {NarratorProfile} from '../../game/creation';
import {AETHER} from '../../game/creation';
import {LIVE_RATE,LIVE_VOICES} from '../../server/live-protocol';
import type {LiveServerEvent,LiveVoice} from '../../server/live-protocol';
import {createLiveDelegationQueue} from './live-delegation';

export type LiveStatus='idle'|'connecting'|'listening'|'speaking'|'paused'|'error';
export interface LiveNarratorOptions {enabled:boolean;scope:string;narrator:NarratorProfile|null;context:string;onRequest:(text:string)=>Promise<{reply:string}|null>;}
type Session={socket:WebSocket;audio:AudioContext;gain:GainNode;sources:Set<AudioBufferSourceNode>;stream:MediaStream|null;worklet:AudioWorkletNode|null;input:MediaStreamAudioSourceNode|null;nextAt:number;epoch:number;ready:boolean;mode:'listen'|'call';frame:number;startup:ReturnType<typeof setTimeout>|null;};
const base64=(bytes:Uint8Array)=>{let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s);};
const workletSource=`class NarratorCapture extends AudioWorkletProcessor { constructor(){super();this.samples=[];} process(inputs){const input=inputs[0]?.[0];if(input){for(const v of input)this.samples.push(v);if(this.samples.length>=2048){this.port.postMessage(new Float32Array(this.samples));this.samples=[];}}return true;}}registerProcessor('narrator-capture',NarratorCapture);`;
class VoicePreflightError extends Error {}

export function useLiveNarrator(options:LiveNarratorOptions){
 const [status,setStatus]=useState<LiveStatus>('idle'),[micMuted,setMicState]=useState(true),[speakerMuted,setSpeakerState]=useState(true),[speaking,setSpeaking]=useState(false),[error,setError]=useState(''),[transcript,setTranscript]=useState('');
 const current=useRef(options),active=useRef<Session|null>(null),serial=useRef(0),speaker=useRef(true),microphone=useRef(true),lastComment=useRef(0),mounted=useRef(true),lastTranscriptRole=useRef(''),delegations=useRef<ReturnType<typeof createLiveDelegationQueue>|null>(null);
 current.current=options;
 const emit=useCallback((value:unknown)=>{const s=active.current;if(s?.ready&&s.socket.readyState===WebSocket.OPEN)s.socket.send(JSON.stringify(value));},[]);
 if(!delegations.current)delegations.current=createLiveDelegationQueue({request:task=>current.current.onRequest(task.text),respond:(task,text)=>emit({type:'reply',delegationId:task.id,text}),isActive:task=>active.current?.epoch===task.session});
 const stop=useCallback((state:LiveStatus='idle')=>{
  serial.current++;delegations.current?.cancel();const s=active.current;active.current=null;microphone.current=true;
  if(s){if(s.startup)clearTimeout(s.startup);cancelAnimationFrame(s.frame);s.stream?.getTracks().forEach(t=>t.stop());s.worklet?.disconnect();s.input?.disconnect();for(const source of s.sources){try{source.stop();}catch{}}s.sources.clear();void s.audio.close().catch(()=>{});
   try{if(s.socket.readyState===WebSocket.OPEN)s.socket.send(JSON.stringify({type:'close'}));s.socket.close(1000);}catch{}
  }
  if(mounted.current){setMicState(true);setSpeaking(false);setStatus(state);}
 },[]);
 const disconnect=useCallback(()=>stop(),[stop]);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;stop();};},[stop]);
 async function capture(s:Session){
  const stream=s.stream??await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1},video:false});
  if(active.current!==s){stream.getTracks().forEach(t=>t.stop());return;}
  const url=URL.createObjectURL(new Blob([workletSource],{type:'text/javascript'}));
  try{await s.audio.audioWorklet.addModule(url);}finally{URL.revokeObjectURL(url);}
  if(active.current!==s){stream.getTracks().forEach(t=>t.stop());return;}
  s.stream=stream;s.input=s.audio.createMediaStreamSource(stream);s.worklet=new AudioWorkletNode(s.audio,'narrator-capture');
  s.worklet.port.onmessage=(event:MessageEvent<Float32Array>)=>{
   if(active.current!==s||microphone.current||!s.ready||s.socket.readyState!==WebSocket.OPEN)return;
   const input=event.data,ratio=s.audio.sampleRate/LIVE_RATE,length=Math.floor(input.length/ratio),bytes=new Uint8Array(length*2),view=new DataView(bytes.buffer);
   for(let i=0;i<length;i++){const position=i*ratio,left=Math.floor(position),fraction=position-left,sample=(input[left]??0)*(1-fraction)+(input[left+1]??input[left]??0)*fraction;view.setInt16(i*2,Math.max(-32768,Math.min(32767,Math.round(sample*32767))),true);}
   emit({type:'audio',audio:base64(bytes)});
  };
  s.input.connect(s.worklet);s.worklet.connect(s.audio.destination);
 }
 async function start(mode:'listen'|'call',opening=''){
  if(!current.current.enabled){setError('Unlock team AI to hear or talk with your narrator.');return;}
  if(mode==='listen'&&speaker.current)return;
  if(mode==='call'&&!navigator.mediaDevices?.getUserMedia){setError('Microphone access requires HTTPS and a supported browser. You can still type.');return;}
  stop();const epoch=serial.current;microphone.current=mode!=='call';setMicState(microphone.current);setError('');setTranscript('');lastTranscriptRole.current='';setStatus('connecting');
  let pendingAudio:AudioContext|null=null,pendingStream:MediaStream|null=null;
  try{
   const audio=new AudioContext({sampleRate:LIVE_RATE});pendingAudio=audio;await audio.resume();
   if(epoch!==serial.current){await audio.close();return;}
   const preflight=await fetch('/api/quest/live',{cache:'no-store',signal:AbortSignal.timeout(10_000)});
   if(!preflight.ok){const result=await preflight.json().catch(()=>null) as {error?:unknown}|null;throw new VoicePreflightError(typeof result?.error==='string'&&result.error.length<300?result.error:'Could not check voice access. Try again in a moment.');}
   if(epoch!==serial.current){await audio.close();return;}
   const gain=audio.createGain(),analyser=audio.createAnalyser();analyser.fftSize=256;gain.gain.value=speaker.current?0:1;gain.connect(analyser);analyser.connect(audio.destination);
   // Microphone permission is resolved before opening a paid session.
   let permitted:MediaStream|null=null;if(mode==='call'){permitted=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1},video:false});pendingStream=permitted;}
   if(epoch!==serial.current){permitted?.getTracks().forEach(t=>t.stop());await audio.close();return;}
   const socket=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/api/quest/live`);
   const s:Session={socket,audio,gain,sources:new Set(),stream:permitted,worklet:null,input:null,nextAt:0,epoch,ready:false,mode,frame:0,startup:null};active.current=s;pendingAudio=null;pendingStream=null;
   s.startup=setTimeout(()=>{if(active.current===s&&!s.ready){setError('Voice took too long to connect. You can keep typing.');stop('error');}},15_000);
   let sessionSeconds=90;
   const levels=new Uint8Array(analyser.fftSize);
   const meter=()=>{if(active.current!==s)return;analyser.getByteTimeDomainData(levels);const audible=!speaker.current&&levels.some(v=>Math.abs(v-128)>3);setSpeaking(audible);if(s.ready)setStatus(audible?'speaking':'listening');s.frame=requestAnimationFrame(meter);};s.frame=requestAnimationFrame(meter);
   microphone.current=mode!=='call';setMicState(microphone.current);
   socket.addEventListener('open',()=>{
    if(active.current!==s)return;
    const narrator=current.current.narrator,voice=LIVE_VOICES.includes(narrator?.voice as LiveVoice)?narrator!.voice!:'vesper';
    const guide=!narrator||(Object.keys(AETHER) as (keyof NarratorProfile)[]).every(key=>JSON.stringify(narrator[key])===JSON.stringify(AETHER[key]));
    socket.send(JSON.stringify({type:'start',scope:current.current.scope,requestId:crypto.randomUUID(),mode,voice,guide,name:narrator?.name??'Aether',persona:narrator?[narrator.persona,...narrator.personality,...narrator.speakingStyle].join('. ').slice(0,600):'',context:current.current.context.slice(0,2000),opening:opening.slice(0,600)}));
   });
   socket.addEventListener('message',event=>{
    if(active.current!==s||typeof event.data!=='string')return;
    let e:LiveServerEvent;try{e=JSON.parse(event.data);}catch{return;}
    if(e.type==='ready'){
     if(Number.isFinite(e.expiresIn)&&e.expiresIn>0)sessionSeconds=Math.round(e.expiresIn/1000);
     if(s.startup)clearTimeout(s.startup);s.startup=null;
     s.ready=true;setStatus('listening');emit({type:'mic',muted:microphone.current});
     if(mode==='call'){
      void capture(s).catch(()=>{if(active.current===s){setError('Could not start the microphone. Your draft is safe.');stop('error');}});
     }
    }else if(e.type==='audio'){
     try{
      const raw=atob(e.audio);if(raw.length%2||raw.length>100_000)return;
      // A muted speaker drops queued speech; unmuting never replays it.
      if(speaker.current)return;
      const samples=raw.length/2,buffer=audio.createBuffer(1,samples,LIVE_RATE),output=buffer.getChannelData(0);
      for(let i=0;i<samples;i++){let sample=raw.charCodeAt(i*2)|(raw.charCodeAt(i*2+1)<<8);if(sample>32767)sample-=65536;output[i]=sample/32768;}
      const source=audio.createBufferSource();source.buffer=buffer;source.connect(gain);s.sources.add(source);
      const when=Math.max(audio.currentTime+0.02,s.nextAt);s.nextAt=when+buffer.duration;
      if(s.nextAt-audio.currentTime>4){stop('paused');setError('Voice paused because playback fell behind.');return;}
      source.onended=()=>{s.sources.delete(source);};
      source.start(when);
     }catch{stop('error');setError('Could not play the narrator audio.');}
    }else if(e.type==='transcript'){
     if(typeof e.text==='string'){const prefix=lastTranscriptRole.current===e.role?'':`\n${e.role==='user'?'You':current.current.narrator?.name??'Aether'}: `;lastTranscriptRole.current=e.role;setTranscript(previous=>(previous+prefix+e.text).slice(-1500));}
    }else if(e.type==='delegate'){
     delegations.current?.enqueue({id:e.id,text:e.text,session:s.epoch});
    }else if(e.type==='error'){setError(e.message);stop('error');}
    else if(e.type==='closed'){
     // Let already received short audio finish, then release the audio graph.
     if(s.sources.size&&e.reason==='comment_finished'){setTimeout(()=>{if(active.current===s)stop();},Math.max(0,(s.nextAt-audio.currentTime)*1000+50));}
     else {stop(e.reason==='idle'||e.reason==='time_limit'?'paused':'idle');if(e.reason==='idle')setError('Voice rested while you were thinking. Start a call to continue.');if(e.reason==='time_limit')setError(`Voice paused after ${sessionSeconds} seconds to stay within the shared allowance. You can continue in text or start another call if allowance remains.`);}
    }
   });
   socket.addEventListener('error',()=>{if(active.current===s){setError('Live voice is unavailable. You can keep creating with text.');stop('error');}});
   socket.addEventListener('close',()=>{if(active.current===s&&s.ready){if(s.sources.size&&mode==='listen')setTimeout(()=>{if(active.current===s)stop();},Math.max(0,(s.nextAt-audio.currentTime)*1000+50));else stop('paused');}else if(active.current===s){setError('Could not connect live voice. Check that team AI is unlocked.');stop('error');}});
  }catch(e){pendingStream?.getTracks().forEach(t=>t.stop());if(pendingAudio)void pendingAudio.close().catch(()=>{});if(epoch!==serial.current)return;stop('error');setError(e instanceof VoicePreflightError?e.message:e instanceof DOMException&&e.name==='NotAllowedError'?'Microphone permission was declined. Allow microphone access in your browser, then start the call again.':e instanceof DOMException&&e.name==='NotFoundError'?'No microphone was found. Connect one, then start the call again.':'Could not start live voice. You can keep typing.');}
 }
 const connect=()=>{setSpeakerMuted(false);return start('call');};
 async function setMicMuted(muted:boolean){
  const s=active.current;if(!muted&&(!s||s.mode!=='call')){await start('call');return;}
  // A mute while browser permission is still pending cancels that startup.
  if(muted&&!s){stop();return;}
  microphone.current=muted;setMicState(muted);s?.stream?.getTracks().forEach(t=>{t.enabled=!muted;});emit({type:'mic',muted});
  if(muted&&speaker.current)stop();
 }
 function setSpeakerMuted(muted:boolean){
  speaker.current=muted;setSpeakerState(muted);const s=active.current;
  if(muted&&!s&&microphone.current)stop();
  if(s){s.gain.gain.value=muted?0:1;if(muted){for(const source of s.sources){try{source.stop();}catch{}}s.sources.clear();s.nextAt=0;setSpeaking(false);if(s.mode==='listen'||microphone.current)stop();}}
 }
 async function speak(text:string){
  if(speaker.current||!text.trim()||!current.current.enabled)return;
  if(active.current?.ready){emit({type:'reply',text:text.slice(0,600)});return;}
  if(active.current||Date.now()-lastComment.current<15_000)return;
  lastComment.current=Date.now();await start('listen',text);
 }
 const updateContext=(text:string)=>emit({type:'context',text:text.slice(0,2000)});
 const reply=(text:string)=>emit({type:'reply',text:text.slice(0,600)});
 const voice=options.narrator?.voice??'vesper',name=options.narrator?.name??'Aether',persona=options.narrator?[options.narrator.persona,...options.narrator.personality,...options.narrator.speakingStyle].join('. '):'';
 useEffect(()=>{if(active.current){setError('The new voice is ready. Unmute your mic to talk again.');stop('paused');}},[voice,name,persona,stop]);
 useEffect(()=>{if(!options.enabled)stop();},[options.enabled,stop]);
 useEffect(()=>{const timer=setTimeout(()=>emit({type:'context',text:options.context.slice(0,2000)}),650);return()=>clearTimeout(timer);},[options.context,emit]);
 return {status,micMuted,speakerMuted,speaking,error,transcript,connect,disconnect,setMicMuted,setSpeakerMuted,speak,updateContext,reply};
}
