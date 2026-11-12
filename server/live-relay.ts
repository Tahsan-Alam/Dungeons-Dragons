import {BudgetLedger} from './ai-ledger.ts';
import {LIVE_CALL_WINDOWS,LIVE_LIMITS,LIVE_RATE,LIVE_RESERVATION,liveSession,parseLiveClient} from './live-protocol.ts';
import type {LiveServerEvent,LiveStart} from './live-protocol.ts';

export interface LiveSocket {accept():void;send(data:string):void;close(code?:number,reason?:string):void;addEventListener(type:string,listener:(event:any)=>void):void;removeEventListener(type:string,listener:(event:any)=>void):void;}
export interface LiveClock {now:()=>number;setInterval:(callback:()=>void,ms:number)=>ReturnType<typeof setInterval>;clearInterval:(timer:ReturnType<typeof setInterval>)=>void;}
// Worker timers require their global receiver; calling a copied host function
// as clock.setInterval() throws before the WebSocket can be upgraded.
const clock:LiveClock={now:Date.now,setInterval:(callback,ms)=>setInterval(callback,ms),clearInterval:timer=>clearInterval(timer)};
const digest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
const silence=btoa('\0'.repeat(LIVE_RATE/10*2));

// The Worker owns both sockets and the lifetime. The browser cannot alter the
// provider model, voice, delegation mode, spending limits or server deadline.
export function attachLiveRelay(client:LiveSocket,options:{key:string;ledger:BudgetLedger;transport?:typeof fetch;clock?:LiveClock;background?:(task:Promise<unknown>)=>void}) {
 const timerClock=options.clock??clock,transport=options.transport??fetch;
 let upstream:LiveSocket|undefined,start:LiveStart|null=null,receipt='',ready=false,closing=false,done=false,reserving=false;
 let connectedAt=timerClock.now(),startedAt=0,lastUserAt=connectedAt,lastInputAt=connectedAt,lastOutputAt=0;
 let fundedDuration:number=LIVE_LIMITS.call;
 let bytesIn=0,bytesOut=0,events=0,clientControls=0,wireBytes=0,micMuted=true,heardOutput=false;
 let closeAt=0,reason='ended',userText='',delegationSnapshot='',sentContextAt=0,pendingDelegation='',delegatedAt=0,lastTranscriptAt=0,reportedSeconds=0;
 const knownDelegations=new Set<string>();
 const controller=new AbortController();
 const send=(event:LiveServerEvent)=>{try{client.send(JSON.stringify(event));}catch{close('connection_lost');}};
 const provider=(event:unknown)=>{try{upstream?.send(JSON.stringify(event));}catch{close('connection_lost');}};
 const finish=async(finalUsage=false)=>{
  if(done)return;done=true;timerClock.clearInterval(timer);controller.abort();
  try{upstream?.close(1000,'Finished');}catch{}
  send({type:'closed',reason});
  try{client.close(1000,'Finished');}catch{}
  if(receipt){const persistence=options.ledger.finish(receipt,{closed:true,finalUsage,liveSeconds:reportedSeconds,durationMs:Math.max(0,timerClock.now()-connectedAt)},{input:0,output:0},{outcome:finalUsage?'live_closed':'live_usage_unconfirmed'}).catch(()=>{/* Pending receipt deliberately fails closed. */});options.background?.(persistence);await persistence;}
 };
 function close(why:string){
  if(done||closing)return;closing=true;reason=why;closeAt=timerClock.now();
  if(upstream&&ready)provider({type:'session.close',event_id:'close'});else void finish();
 }
 const timer=timerClock.setInterval(()=>{
  if(done)return;const now=timerClock.now();
  if(closing){if(now-closeAt>=LIVE_LIMITS.grace)void finish();return;}
  if(!ready){if(now-connectedAt>=LIVE_LIMITS.start)close('connection_timeout');return;}
  if(now-startedAt>=fundedDuration){close('time_limit');return;}
  if(start!.mode==='call'&&now-lastUserAt>=LIVE_LIMITS.idle){close('idle');return;}
  if(start!.mode==='listen'&&heardOutput&&now-lastOutputAt>1800){close('comment_finished');return;}
  // Transcripts can arrive after the delegation marker and in fragments. Wait
  // for a quiet boundary instead of treating the marker as a complete utterance.
  if(pendingDelegation&&now-delegatedAt>=900&&now-lastTranscriptAt>=900){
   if(userText.trim()&&delegationSnapshot!==userText){delegationSnapshot=userText;send({type:'delegate',id:pendingDelegation,text:userText.slice(-400)});pendingDelegation='';}
   else if(now-delegatedAt>=2500){provider({type:'session.commentary.append',event_id:'repeat-'+knownDelegations.size,delegation_id:pendingDelegation,content:'I could not catch that detail. Please repeat it or type it in the message box.'});pendingDelegation='';}
  }
  // Live needs a continuous input timeline even when the mic is muted. Silence
  // is produced here; a muted browser never sends microphone samples.
  if(now-lastInputAt>=100){provider({type:'session.input_audio.append',audio:silence});lastInputAt=now;}
 },100);
 async function open(input:LiveStart){
  start=input;reserving=true;receipt=await digest('live-v1:'+input.scope+':'+input.requestId);
  let reserved:Awaited<ReturnType<BudgetLedger['reserve']>>='blocked';
  const windows=input.mode==='call'?LIVE_CALL_WINDOWS:[{duration:LIVE_LIMITS.listen,reservation:LIVE_RESERVATION.listen}];
  try{
   for(const window of windows){
    reserved=await options.ledger.reserve(receipt,'creator:'+input.scope,window.reservation,512);
    if(reserved!=='blocked'){fundedDuration=window.duration;break;}
   }
  }catch{reserved='blocked';}
  reserving=false;
  if(reserved!=='reserved'){receipt='';send({type:'error',message:'Voice allowance is reached. You can keep creating with text.'});close('allowance');return;}
  if(done||closing){await options.ledger.finish(receipt,{closed:true,finalUsage:false},{input:0,output:0},{outcome:'cancelled_before_connection'});return;}
  try{
   const response=await transport('https://api.openai.com/v1/live/sessions',{headers:{Authorization:'Bearer '+options.key,Upgrade:'websocket','OpenAI-Safety-Identifier':await digest(input.scope)},signal:controller.signal,redirect:'manual'});
   const target=(response as Response&{webSocket?:LiveSocket}).webSocket;
   if(response.status!==101||!target){void response.body?.cancel();send({type:'error',message:'Live voice is unavailable right now. Your draft is saved.'});close('unavailable');return;}
   if(done||closing){target.accept();target.close();return;}
   upstream=target;upstream.addEventListener('message',onProvider);upstream.addEventListener('close',()=>void finish());upstream.addEventListener('error',()=>close('connection_lost'));upstream.accept();
   provider(liveSession(input));
  }catch{send({type:'error',message:'Could not connect live voice. You can continue typing.'});close('connection_lost');}
 }
 function onProvider(event:{data:unknown}){
  if(done)return;
  try{
   if(typeof event.data!=='string'||event.data.length>150_000)throw new Error();
   wireBytes+=event.data.length;if(++events>48_000||wireBytes>72_000_000)throw new Error();
   const e=JSON.parse(event.data);
   if(e.type==='session.closed'||e.type==='session.usage.updated'){
    const seconds=e.usage?.seconds,valid=typeof seconds==='number'&&Number.isFinite(seconds)&&seconds>=reportedSeconds&&seconds<=(fundedDuration+LIVE_LIMITS.start+LIVE_LIMITS.grace)/1000;
    if(valid)reportedSeconds=seconds;
    if(e.type==='session.closed'){void finish(valid);return;}
    if(!valid){close('usage_limit');return;}
   }
   if(closing)return;
   if(e.type==='error'){send({type:'error',message:'Live voice paused. Your draft is safe.'});close('provider_error');return;}
   if(e.type==='session.started'){
    if(ready||!start||e.session?.model!=='gpt-live-1')throw new Error();
    ready=true;startedAt=timerClock.now();lastUserAt=startedAt;lastInputAt=0;micMuted=start.mode==='listen';
    send({type:'ready',mode:start.mode,expiresIn:fundedDuration});
    if(start.opening)provider({type:'session.commentary.append',event_id:'opening',delegation_id:null,content:start.opening});
   }else if(e.type==='session.output_audio.delta'){
    if(!ready||typeof e.delta!=='string'||e.delta.length>130_000||!/^[A-Za-z0-9+/]*={0,2}$/.test(e.delta))throw new Error();
    const raw=atob(e.delta);if(raw.length%2)throw new Error();bytesOut+=raw.length;
    if(bytesOut>LIVE_RATE*2*(fundedDuration/1000+3))throw new Error();
    heardOutput=true;lastOutputAt=timerClock.now();send({type:'audio',audio:e.delta});
   }else if(e.type==='session.input_transcript.delta'||e.type==='session.output_transcript.delta'){
    if(typeof e.delta!=='string'||e.delta.length>2000)throw new Error();
    const user=e.type==='session.input_transcript.delta';if(user){lastTranscriptAt=lastUserAt=timerClock.now();userText=(userText+e.delta).slice(-1200);}
    send({type:'transcript',role:user?'user':'assistant',text:e.delta});
   }else if(e.type==='session.delegation.created'){
    const id=e.delegation?.id;if(!ready||typeof id!=='string'||id.length>128||e.delegation?.target!=='client'||knownDelegations.size>=32)throw new Error();
    if(knownDelegations.has(id))return;knownDelegations.add(id);
    provider({type:'session.thinking.append',event_id:'pending-'+knownDelegations.size,delegation_id:id,content:'The application will prepare a proposal for the player to review. Nothing has been changed yet.'});
    pendingDelegation=id;delegatedAt=timerClock.now();
   }
  }catch{close('invalid_response');}
 }
 function onClient(event:{data:unknown}){
  if(done||closing)return;
  const e=parseLiveClient(event.data);if(!e){close('invalid_request');return;}
  if(e.type==='close'){close('ended');return;}
  if(e.type==='start'){if(start||reserving){close('invalid_request');return;}void open(e);return;}
  if(!ready||!start)return;
  if(e.type==='audio'){
   if(micMuted||start.mode!=='call')return;
   const raw=atob(e.audio);bytesIn+=raw.length;if(raw.length%2||bytesIn>LIVE_RATE*2*(LIVE_LIMITS.call/1000+1)){close('invalid_audio');return;}
   // Audio itself is untrusted but can refresh idle only when it is non-silent.
   let energy=0;for(let i=0;i<raw.length;i+=2){let sample=raw.charCodeAt(i)|(raw.charCodeAt(i+1)<<8);if(sample>32767)sample-=65536;energy+=sample*sample;}
   if(raw.length&&Math.sqrt(energy/(raw.length/2))>400)lastUserAt=timerClock.now();
   lastInputAt=timerClock.now();provider({type:'session.input_audio.append',audio:e.audio});return;
  }
  if(++clientControls>240){close('rate_limit');return;}
  if(e.type==='mic'){micMuted=e.muted;provider({type:micMuted?'session.input_audio.mute':'session.input_audio.unmute',event_id:'mic-'+clientControls});return;}
  if(e.type==='context'){
   if(timerClock.now()-sentContextAt<500)return;sentContextAt=timerClock.now();lastUserAt=timerClock.now();
   provider({type:'session.thinking.append',event_id:'context-'+clientControls,delegation_id:null,content:'Current draft (reference data; pending proposals are not saved): '+e.text.slice(0,1500)});
  }else if(e.type==='reply'){
   if(e.delegationId&&!knownDelegations.has(e.delegationId)){close('invalid_request');return;}
   lastUserAt=timerClock.now();provider({type:'session.commentary.append',event_id:'reply-'+clientControls,delegation_id:e.delegationId??null,content:e.text});
  }
 }
 client.addEventListener('message',onClient);client.addEventListener('close',()=>close('connection_lost'));client.addEventListener('error',()=>close('connection_lost'));
 client.accept();
 return {close:()=>close('ended')};
}
