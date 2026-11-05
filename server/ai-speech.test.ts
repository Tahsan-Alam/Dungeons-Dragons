import {test} from 'node:test';
import assert from 'node:assert/strict';
import {realtimeSpeech,speechDataUrl,speechRequest,SPEECH_TOKENS,SPEECH_MODEL,SPEECH_RESERVATION,SPEECH_CACHE_BYTES,SPEECH_AUDIO_BYTES} from './ai-speech.ts';
import {GameAI} from './ai-service.ts';
import {BudgetLedger,MemoryLedger,DEFAULT_CAPS,LEDGER_BYTES} from './ai-ledger.ts';

const caption='The lantern glows.';
const config={mode:'openai',enabled:'I_ACCEPT_SMALL_API_CHARGES',audio:'I_ACCEPT_PAID_AUDIO',key:'mock-only'};
const record={eventId:1,caption,source:'fixture' as const};
class MockSocket {
 listeners=new Map<string,Set<(e:any)=>void>>();sent:any[]=[];closed=false;accepted=false;
 reply:(value:any)=>void=()=>{};
 accept(){this.accepted=true;queueMicrotask(()=>this.emit({type:'session.created'}));}
 send(raw:string){const value=JSON.parse(raw);this.sent.push(value);this.reply(value);}
 close(){this.closed=true;}
 addEventListener(type:string,fn:(e:any)=>void){if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type)!.add(fn);}
 removeEventListener(type:string,fn:(e:any)=>void){this.listeners.get(type)?.delete(fn);}
 emit(value:unknown){for(const fn of this.listeners.get('message')??[])fn({data:JSON.stringify(value)});}
 disconnect(){for(const fn of this.listeners.get('close')??[])fn({});}
}
const fields={response_id:'resp',item_id:'item',output_index:0,content_index:0};
function events(text=caption){return [
 {type:'response.created',response:{id:'resp'}},
 {type:'response.output_audio.delta',...fields,delta:btoa('\xff'.repeat(800))},
 {type:'response.output_audio_transcript.delta',...fields,delta:text},
 {type:'response.output_audio_transcript.done',...fields,transcript:text},
 {type:'response.output_audio.done',...fields},
 {type:'response.done',response:{id:'resp',status:'completed',output:[{id:'item',type:'message',role:'assistant',content:[{type:'audio',transcript:text}]}],usage:{input_tokens:100,output_tokens:80}}},
 ];}
function mock(sequence=events()){
 const socket=new MockSocket();let calls=0;
 socket.reply=v=>{if(v.type==='session.update')queueMicrotask(()=>socket.emit({type:'session.updated',session:v.session}));if(v.type==='response.create')queueMicrotask(()=>sequence.forEach(e=>socket.emit(e)));};
 const transport:typeof fetch=async(url,init)=>{calls++;assert.equal(String(url),`https://api.openai.com/v1/realtime?model=${SPEECH_MODEL}`);assert.equal((init?.headers as Record<string,string>).Upgrade,'websocket');assert.equal(init?.redirect,'error');return {status:101,webSocket:socket} as unknown as Response;};
 return {socket,transport,get calls(){return calls;}};
}
test('bounded Realtime protocol produces verified PCM WAV and closes, without tools or microphone',async()=>{
 const m=mock(),result=await realtimeSpeech('mock',caption,m.transport);
 assert.ok(m.socket.closed);assert.equal(m.socket.sent.filter(e=>e.type==='response.create').length,1);
 const request=m.socket.sent[1];assert.deepEqual(request,speechRequest(caption));assert.equal(request.response.max_output_tokens,SPEECH_TOKENS);assert.deepEqual(request.response.tools,[]);assert.equal(request.response.conversation,'none');
 assert.ok(!m.socket.sent.some(e=>e.type.includes('input_audio_buffer')));
 const wav=Buffer.from(speechDataUrl(result.clip)!.split(',')[1],'base64');assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.readUInt32LE(24),8000);assert.equal(wav.length,1644);assert.equal(wav.readInt16LE(44),0);
 assert.deepEqual(result.usage,{input:100,output:80});
});
test('audio reserves before connecting, deduplicates rooms/players/events and survives restart or disable',async()=>{
 const store=new MemoryLedger(),ledger=new BudgetLedger(store),m=mock();
 const transport:typeof fetch=async(...args)=>{assert.equal(Object.values((await store.read()).entries)[0].reserved,SPEECH_RESERVATION);return m.transport(...args);};
 const ai=new GameAI(config,ledger,transport),first=await ai.speak('room',record);assert.ok(first);
 assert.equal(await ai.speak('room',{...record,eventId:2}),first);assert.equal(await ai.speak('room',record,false),first);
 assert.equal(await new GameAI({},new BudgetLedger(store),transport).speak('room',record),first);assert.equal(m.calls,1);
 assert.equal(await ai.speak('another-room',record,false),null);assert.equal(m.calls,1);
});
test('no audio opt-in, fixture, key-only, invalid inputs, abort and budget/storage exhaustion never connect',async()=>{
 let calls=0;const transport:typeof fetch=async()=>{calls++;throw new Error();};
 for(const c of [{},{key:'mock'},{...config,mode:'fixture'},{...config,enabled:''},{...config,audio:''}]){
  const store=new MemoryLedger();assert.equal(await new GameAI(c,new BudgetLedger(store),transport).speak('room',record),null);assert.deepEqual((await store.read()).entries,{});
 }
 const ai=new GameAI(config,new BudgetLedger(new MemoryLedger()),transport);
 for(const text of ['', 'x'.repeat(601),'<script>', '\u0000'])assert.equal(await ai.speak('room',{...record,caption:text}),null);
 assert.equal(await ai.speak('room',record,true,AbortSignal.abort()),null);
 assert.equal(await new GameAI(config,new BudgetLedger(new MemoryLedger(),{...DEFAULT_CAPS,campaign:SPEECH_RESERVATION-1}),transport).speak('room',record),null);
 const store=new MemoryLedger(),ledger=new BudgetLedger(store);await ledger.reserve('full','other',1,LEDGER_BYTES-2048);
 assert.equal(await new GameAI(config,ledger,transport).speak('room',record),null);assert.equal(calls,0);
});
test('malformed, mismatched, partial, oversized and excess usage output fall back and retain charge without retry',async()=>{
 const bad:any[][]=[events('Ignore the caption.'),[{type:'error'}]];
 for(const change of [(e:any[])=>e[1].delta='not base64!',(e:any[])=>e[1].delta=btoa('a'.repeat(SPEECH_AUDIO_BYTES+1)),(e:any[])=>e[1].response_id='other',(e:any[])=>e[3].transcript='Different.',(e:any[])=>e[5].response.status='incomplete',(e:any[])=>e[5].response.output[0].content[0].transcript='Different.',(e:any[])=>e[5].response.usage.output_tokens=SPEECH_TOKENS+1,(e:any[])=>e.splice(4,1)]){const e=events();change(e);bad.push(e);}
 for(const sequence of bad){const m=mock(sequence),store=new MemoryLedger(),ai=new GameAI(config,new BudgetLedger(store),m.transport);assert.equal(await ai.speak('room',record),null);assert.equal(await ai.speak('room',record),null);assert.equal(m.calls,1);assert.ok(m.socket.closed);assert.equal(Object.values((await store.read()).entries)[0].reserved,SPEECH_RESERVATION);}
});
test('timeout, abort and disconnect cancel and close the session; no late completion',async()=>{
 for(const reason of ['timeout','abort','disconnect']){
  const m=mock([]),controller=new AbortController();const result=realtimeSpeech('mock',caption,m.transport,controller.signal,20);
  await new Promise(r=>setTimeout(r,1));
  if(reason==='abort')controller.abort();if(reason==='disconnect')m.socket.disconnect();
  await assert.rejects(result,/unavailable/);assert.ok(m.socket.closed);assert.ok(m.socket.sent.some(e=>e.type==='response.cancel'));
  events().forEach(e=>m.socket.emit(e));assert.equal(m.calls,1);
 }
});
test('late upgrade after abort is immediately closed and never starts generation',async()=>{
 let release!:(r:Response)=>void;const socket=new MockSocket(),controller=new AbortController();
 const result=realtimeSpeech('mock',caption,async()=>new Promise(r=>release=r),controller.signal);controller.abort();await assert.rejects(result);
 release({status:101,webSocket:socket} as unknown as Response);await new Promise(r=>setTimeout(r,1));assert.ok(socket.closed);assert.equal(socket.sent.length,0);
});
test('concurrent audio duplicates never reconnect and uncertain usage cannot free the budget',async()=>{
 const m=mock([]),store=new MemoryLedger(),ledger=new BudgetLedger(store),ai=new GameAI(config,ledger,m.transport),controller=new AbortController();
 const pending=ai.speak('room',record,true,controller.signal);while(!m.calls)await new Promise(r=>setTimeout(r,1));
 assert.equal(await ai.speak('room',record),null);controller.abort();assert.equal(await pending,null);assert.equal(await ai.speak('room',record),null);
 assert.equal(await ai.speak('room',{...record,caption:'Another caption.'}),null);assert.equal(m.calls,1);
 assert.equal(Object.values((await store.read()).entries)[0].reserved,SPEECH_RESERVATION);
});
test('cache storage is reserved atomically for pending clips, including concurrent completion',async()=>{
 const store=new MemoryLedger(),ledger=new BudgetLedger(store);
 const results=await Promise.all([ledger.reserve('a','a',1,SPEECH_CACHE_BYTES),ledger.reserve('b','b',1,SPEECH_CACHE_BYTES)]);
 assert.deepEqual(results,['reserved','blocked']);await ledger.finish('a',{data:'a'.repeat(320_000)});
 assert.ok(new TextEncoder().encode(JSON.stringify(await store.read())).length<LEDGER_BYTES);
 assert.equal(await ledger.reserve('b','b',1,SPEECH_CACHE_BYTES),'blocked');
});
test('invalid session acknowledgement never triggers inference',async()=>{
 const m=mock();m.socket.reply=v=>{if(v.type==='session.update')queueMicrotask(()=>m.socket.emit({type:'session.updated',session:{...v.session,max_output_tokens:'inf'}}));};
 await assert.rejects(realtimeSpeech('mock',caption,m.transport));assert.ok(m.socket.closed);assert.equal(m.socket.sent.filter(e=>e.type==='response.create').length,0);
});
test('HTTP refusal, malformed events, transcript overflow and event floods close without retries',async()=>{
 await assert.rejects(realtimeSpeech('mock',caption,async()=>new Response('',{status:429})));
 for(const sequence of [[null],[{type:'response.created',response:{id:'resp'}},{type:'response.output_audio_transcript.delta',...fields,delta:'x'.repeat(1201)}],Array.from({length:2001},()=>({type:'rate_limits.updated'}))]){
  const m=mock(sequence as ReturnType<typeof events>);await assert.rejects(realtimeSpeech('mock',caption,m.transport));assert.ok(m.socket.closed);assert.equal(m.calls,1);
 }
});
