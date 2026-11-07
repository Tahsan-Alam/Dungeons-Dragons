'use client';
import {useEffect,useRef,useState} from 'react';
import './quest-dictation.css';

function encodeWav(chunks:Float32Array[],rate:number){
 const size=chunks.reduce((n,c)=>n+c.length,0),samples=new Float32Array(size);let offset=0;for(const c of chunks){samples.set(c,offset);offset+=c.length;}
 const count=Math.min(960000,Math.floor(size*16000/rate)),buffer=new ArrayBuffer(44+count*2),view=new DataView(buffer);
 const word=(at:number,value:string)=>{for(let i=0;i<value.length;i++)view.setUint8(at+i,value.charCodeAt(i));};
 word(0,'RIFF');view.setUint32(4,36+count*2,true);word(8,'WAVE');word(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,16000,true);view.setUint32(28,32000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);word(36,'data');view.setUint32(40,count*2,true);
 for(let i=0;i<count;i++){const at=i*rate/16000,lo=Math.floor(at),fraction=at-lo;const sample=(samples[lo]??0)*(1-fraction)+(samples[lo+1]??samples[lo]??0)*fraction;view.setInt16(44+i*2,Math.max(-1,Math.min(1,sample))*32767,true);}
 return buffer;
}
export default function QuestDictation({value,onChange,disabled=false,onBusyChange}:{value:string;onChange:(text:string)=>void;disabled?:boolean;onBusyChange?:(busy:boolean)=>void}){
 const[phase,setPhase]=useState<'idle'|'requesting'|'recording'|'transcribing'|'review'>('idle'),[message,setMessage]=useState(''),[seconds,setSeconds]=useState(0),[draft,setDraft]=useState(''),[original,setOriginal]=useState('');
 const capture=useRef<{context:AudioContext;stream:MediaStream;node:ScriptProcessorNode;source:MediaStreamAudioSourceNode;chunks:Float32Array[];timer:ReturnType<typeof setInterval>}|null>(null),request=useRef<AbortController|null>(null),mounted=useRef(true),epoch=useRef(0);
 function release(){const c=capture.current;if(!c)return null;capture.current=null;clearInterval(c.timer);c.node.disconnect();c.source.disconnect();c.stream.getTracks().forEach(t=>t.stop());void c.context.close();return c;}
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;epoch.current++;release();request.current?.abort();};},[]);
 async function finish(cancel=false){
  const c=release();if(!c)return;
  if(cancel){setPhase('idle');setMessage('Recording discarded.');return;}
  setPhase('transcribing');setMessage('Transcribing your recording…');const current=++epoch.current,controller=new AbortController();request.current=controller;
  try{
   const response=await fetch('/api/quest/dictation',{method:'POST',headers:{'Content-Type':'audio/wav'},body:encodeWav(c.chunks,c.context.sampleRate),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(25000)])});
   const result=await response.json() as {text?:string;error?:string};if(!response.ok||typeof result.text!=='string'||!result.text.trim())throw new Error(result.error||'Dictation unavailable. You can type your quest.');
   if(mounted.current&&epoch.current===current){setDraft(result.text);setPhase('review');setMessage('Filler trimmed. Review before adding it to your quest.');}
  }catch(error){if(mounted.current&&epoch.current===current){setPhase('idle');setMessage(error instanceof Error?error.message:'Dictation unavailable. Your quest is unchanged.');}}
 }
 async function start(){
  if(phase!=='idle')return;
  if(!navigator.mediaDevices?.getUserMedia||typeof AudioContext==='undefined'){setMessage('Recording is unavailable here. You can type your quest.');return;}
  setPhase('requesting');setMessage('Allow microphone access to record.');const current=++epoch.current;
  let provisionalStream:MediaStream|null=null,provisionalContext:AudioContext|null=null;
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:true});if(!mounted.current||epoch.current!==current){stream.getTracks().forEach(t=>t.stop());return;}
   provisionalStream=stream;
   const context=new AudioContext();provisionalContext=context;
   const source=context.createMediaStreamSource(stream),node=context.createScriptProcessor(4096,1,1),chunks:Float32Array[]=[];
   let recordedSamples=0;
   node.onaudioprocess=e=>{if(capture.current?.context===context){const chunk=e.inputBuffer.getChannelData(0).slice(0,Math.max(0,context.sampleRate*60-recordedSamples));chunks.push(chunk);recordedSamples+=chunk.length;if(recordedSamples>=context.sampleRate*60)void finish();}};
   source.connect(node);node.connect(context.destination);let elapsed=0;
   const timer=setInterval(()=>{elapsed++;setSeconds(elapsed);if(elapsed>=60)void finish();},1000);
   capture.current={context,stream,node,source,chunks,timer};provisionalStream=null;provisionalContext=null;await context.resume();if(!mounted.current||epoch.current!==current){if(capture.current?.context===context)release();return;}setOriginal(value);setSeconds(0);setPhase('recording');setMessage('Recording. Stop when you’re ready.');
  }catch{if(mounted.current&&epoch.current===current){release();setPhase('idle');setMessage('Microphone unavailable. You can type your quest.');}}
  finally{provisionalStream?.getTracks().forEach(track=>track.stop());if(provisionalContext)void provisionalContext.close();}
 }
 useEffect(()=>{onBusyChange?.(phase!=='idle');return()=>onBusyChange?.(false);},[phase,onBusyChange]);
 const combined=[original.trim(),draft.trim()].filter(Boolean).join(' ');
 return <div className="quest-dictation">
  {phase==='recording'?<div className="dictation-controls"><span className="recording-indicator"><i/>Recording · {seconds}s / 60s</span><button type="button" className="button primary compact" onClick={()=>void finish()}>Stop & transcribe</button><button type="button" className="text-button" onClick={()=>void finish(true)}>Cancel</button></div>:phase==='idle'?<button type="button" className="button paper compact" disabled={disabled} onClick={()=>void start()}>Dictate quest</button>:phase==='review'?null:<div className="dictation-controls"><span>{phase==='transcribing'?'Transcribing…':'Waiting for microphone…'}</span><button type="button" className="text-button" onClick={()=>{epoch.current++;release();request.current?.abort();request.current=null;setPhase('idle');setMessage('Dictation cancelled. Your quest is unchanged.');}}>Cancel dictation</button></div>}
  {phase==='idle'?<small>Record up to a minute. Audio is sent to OpenAI after you stop.</small>:null}
  {phase==='review'?<div className="dictation-review"><label className="field">Review your words<textarea rows={4} value={draft} maxLength={3000} onChange={e=>setDraft(e.target.value)}/></label><small>{combined.length}/400 characters including your existing prompt</small><div className="dictation-controls"><button type="button" className="button primary compact" disabled={!draft.trim()||combined.length>400} onClick={()=>{onChange(combined);setPhase('idle');setMessage('Added to your quest.');}}>Use text</button><button type="button" className="text-button" onClick={()=>{setPhase('idle');setMessage('Transcript discarded.');}}>Discard</button></div></div>:null}
  {message?<p role="status">{message}</p>:null}
 </div>;
}
