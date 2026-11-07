'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {creationFixture,parseCreationResult} from '../../game/creation';
import type {CreationRequest,CreationResult} from '../../game/creation';

export function useCreation(sharedScope?:string){
 const [pending,setPending]=useState(false),[error,setError]=useState('');
 const controller=useRef<AbortController|null>(null),epoch=useRef(0),scope=useRef('');
 const cancel=useCallback(()=>{epoch.current++;controller.current?.abort();controller.current=null;setPending(false);},[]);
 useEffect(()=>()=>{epoch.current++;controller.current?.abort();},[]);
 async function run(input:Omit<CreationRequest,'scope'|'requestId'>):Promise<CreationResult|null>{
  if(controller.current)return null;
  if(!scope.current)scope.current=crypto.randomUUID();
  const request={...input,scope:sharedScope||scope.current,requestId:crypto.randomUUID()},active=++epoch.current,abort=new AbortController();
  // Ordinary solo setup works without credentials, a database or a provider request.
  if(!request.enabled){setError('');return creationFixture(request);}
  controller.current=abort;setPending(true);setError('');
  try{
   const response=await fetch('/api/quest/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.any([abort.signal,AbortSignal.timeout(40_000)])});
   const data=await response.json() as Record<string,unknown>;if(!data||typeof data!=='object')throw new Error('The draft response could not be read.');if(!response.ok)throw new Error(typeof data.error==='string'?data.error:'Could not create that draft. Try again.');
   if(data.source!=='openai')throw new Error('AI did not generate a response. Your message and draft are unchanged. Check AI settings and try again.');
   const key=request.action==='narrators'?'narrators':request.action==='heroes'?'heroes':request.action==='sample'?'sample':request.action;
   const result=parseCreationResult({reply:data.reply,[key]:data[key]},request);
   if(!result)throw new Error('The draft was incomplete. Your current choices are still here.');
   if(active!==epoch.current)return null;
   return {...result,source:data.source,...(key==='sample'?{audio:typeof data.audio==='string'&&data.audio.startsWith('data:audio/wav;base64,')&&data.audio.length<650_000?data.audio:null}:{})};
  }catch(e){if(active===epoch.current&&!abort.signal.aborted)setError(e instanceof Error?e.message:'Could not reach the storyteller. Try again.');return null;}
  finally{if(active===epoch.current){controller.current=null;setPending(false);}}
 }
 return {run,pending,error,setError,cancel};
}
