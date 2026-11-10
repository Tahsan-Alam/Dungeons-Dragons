import test from 'node:test';
import assert from 'node:assert/strict';
import {BudgetLedger,MemoryLedger} from './ai-ledger.ts';
import {attachLiveRelay} from './live-relay.ts';
import type {LiveClock,LiveSocket} from './live-relay.ts';
import {LIVE_CALL_WINDOWS,LIVE_LIMITS,LIVE_RESERVATION,liveSession,parseLiveClient,parseLiveStart} from './live-protocol.ts';
import type {LiveStart} from './live-protocol.ts';

const input:LiveStart={type:'start',scope:'test-creator',requestId:'session-1',mode:'call',voice:'vesper',name:'Aether',persona:'',context:'The player is shaping a narrator.',opening:'What kind of guide shall I become?'};
const flush=async()=>{await new Promise(resolve=>setImmediate(resolve));await new Promise(resolve=>setImmediate(resolve));};
class Socket implements LiveSocket{
 listeners:Record<string,((e:any)=>void)[]>={};sent:any[]=[];closed=false;accepted=false;
 accept(){this.accepted=true;}send(data:string){this.sent.push(JSON.parse(data));}close(){this.closed=true;}
 addEventListener(type:string,listener:(e:any)=>void){(this.listeners[type]??=[]).push(listener);}
 removeEventListener(type:string,listener:(e:any)=>void){this.listeners[type]=(this.listeners[type]??[]).filter(x=>x!==listener);}
 emit(value:unknown){for(const fn of this.listeners.message??[])fn({data:typeof value==='string'?value:JSON.stringify(value)});}
 disconnect(){for(const fn of this.listeners.close??[])fn({});}
}
async function fixture({mode='call',caps={campaign:5_000_000,day:5_000_000,month:5_000_000,concurrency:2},http=101}:{mode?:'call'|'listen';caps?:{campaign:number;day:number;month:number;concurrency:number};http?:number}={}){
 let now=1000,tick:()=>void=()=>{},calls=0;
 const testClock:LiveClock={now:()=>now,setInterval:cb=>{tick=cb;return 1 as unknown as ReturnType<typeof setInterval>;},clearInterval:()=>{tick=()=>{};}};
 const store=new MemoryLedger(),client=new Socket(),upstream=new Socket();
 const transport:typeof fetch=async(url,init)=>{calls++;assert.equal(url,'https://api.openai.com/v1/live/sessions');assert.equal((init?.headers as Record<string,string>).Upgrade,'websocket');return {status:http,webSocket:http===101?upstream:undefined} as unknown as Response;};
 const relay=attachLiveRelay(client,{key:'test-secret',ledger:new BudgetLedger(store,caps),transport,clock:testClock});
 client.emit({...input,mode});
 // WebCrypto runs on a worker pool; a fixed number of setImmediate ticks does
 // not establish that the reservation/upgrade finished on a busy test runner.
 for(let i=0;i<200&&!client.closed&&!upstream.accepted;i++)await new Promise(resolve=>setTimeout(resolve,2));
 await flush();assert.ok(client.closed||upstream.accepted,'relay startup settled');
 return {store,client,upstream,relay,calls:()=>calls,advance:(ms:number)=>{now+=ms;tick();},ready:()=>upstream.emit({type:'session.started',session:{model:'gpt-live-1'}})};
}

test('live contract rejects arbitrary models/voices and oversized or invalid audio',()=>{
 assert.equal(parseLiveStart({...input,voice:'custom-secret'}),null);
 assert.equal(parseLiveStart({...input,scope:'../wrong'}),null);
 assert.equal(parseLiveStart({...input,context:'x'.repeat(2001)}),null);
 assert.equal(parseLiveClient(JSON.stringify({type:'session.update',session:{model:'expensive'}})),null);
 assert.equal(parseLiveClient(JSON.stringify({type:'audio',audio:'not base64!'})),null);
 assert.equal(parseLiveClient(JSON.stringify({type:'context',text:'<script>'})),null);
});
test('Aether uses a fixed voice, no stored recording and no hosted paid backend',()=>{
 const session=liveSession(input).session;
 assert.equal(session.audio.output.voice,'vesper');assert.equal(session.store,false);assert.deepEqual(session.delegation,{type:'client',acknowledgement_delay_ms:800});assert.match(session.instructions,/British/);assert.match(session.instructions,/player confirms/);
});
test('a custom character named Aether keeps its persona while the guide flag fixes guide identity',()=>{
 const custom=liveSession({...input,guide:false,name:'Aether',persona:'A sarcastic cat.',voice:'willow'}).session;
 assert.match(custom.instructions,/sarcastic cat/);assert.doesNotMatch(custom.instructions,/British cadence/);assert.equal(custom.audio.output.voice,'willow');
 const guide=parseLiveStart({...input,guide:true,name:'Nyx',persona:'A sarcastic cat.',voice:'willow'})!;
 assert.equal(guide.name,'Aether');assert.equal(guide.voice,'vesper');assert.match(liveSession(guide).session.instructions,/British cadence/);
 assert.equal(parseLiveStart({...input,guide:'yes'}),null);
});
test('live reserves before outbound connection and never sends credentials to browser',async()=>{
 const f=await fixture();assert.equal(f.calls(),1);const entries=Object.values((await f.store.read()).entries);assert.equal(entries[0].reserved,LIVE_RESERVATION.call);assert.equal(entries[0].campaign,'creator:test-creator');
 f.ready();assert.equal(f.client.sent[0].type,'ready');assert.equal(JSON.stringify(f.client.sent).includes('test-secret'),false);f.relay.close();f.advance(LIVE_LIMITS.grace);await flush();
});
test('reached shared cap opens no provider socket',async()=>{
 const f=await fixture({caps:{campaign:1,day:1,month:1,concurrency:2}});assert.equal(f.calls(),0);assert.equal(f.client.closed,true);assert.match(f.client.sent[0].message,/allowance/);
});

test('a default allowance funds a shorter call without raising caps or opening extra sockets',async()=>{
 const f=await fixture({caps:{campaign:100_000,day:250_000,month:1_000_000,concurrency:2}});assert.equal(f.calls(),1);f.ready();
 assert.equal(f.client.sent.find(e=>e.type==='ready').expiresIn,30_000);
 const receipts=Object.values((await f.store.read()).entries);assert.equal(receipts.length,1);assert.equal(receipts[0].reserved,75_000);
 f.advance(20_000);f.upstream.emit({type:'session.input_transcript.delta',delta:'Keep talking.'});f.advance(10_000);
 assert.equal(f.upstream.sent.at(-1).type,'session.close');f.advance(LIVE_LIMITS.grace);await flush();assert.equal(f.client.sent.find(e=>e.type==='closed').reason,'time_limit');
});

test('every funded call reserve covers the complete bounded lifetime at twice the published rate',()=>{
 for(const window of LIVE_CALL_WINDOWS){const maximumSeconds=(window.duration+LIVE_LIMITS.start+LIVE_LIMITS.grace)/1000;assert.ok(window.reservation>=Math.ceil(maximumSeconds*50_000/60*2));}
});
test('server closes idle calls even when the browser sends nothing',async()=>{
 const f=await fixture();f.ready();f.advance(LIVE_LIMITS.idle);assert.equal(f.upstream.sent.at(-1).type,'session.close');f.advance(LIVE_LIMITS.grace);await flush();assert.equal(f.upstream.closed,true);assert.equal(f.client.closed,true);assert.equal(Object.values((await f.store.read()).entries)[0].status,'done');
});
test('continuous user activity cannot exceed server hard deadline',async()=>{
 const f=await fixture();f.ready();for(let i=0;i<4;i++){f.upstream.emit({type:'session.input_transcript.delta',delta:'More ideas. '});f.advance(20_000);}f.upstream.emit({type:'session.input_transcript.delta',delta:'Still here.'});f.advance(10_000);assert.equal(f.upstream.sent.at(-1).type,'session.close');f.advance(LIVE_LIMITS.grace);await flush();assert.equal(f.client.sent.find(e=>e.type==='closed')?.reason,'time_limit');
});
test('muted input does not relay microphone bytes; unmute restores it',async()=>{
 const f=await fixture();f.ready();f.client.emit({type:'mic',muted:true});const audio=btoa('\0\0'.repeat(120));f.client.emit({type:'audio',audio});assert.equal(f.upstream.sent.filter(e=>e.type==='session.input_audio.append').length,0);f.client.emit({type:'mic',muted:false});f.client.emit({type:'audio',audio});assert.equal(f.upstream.sent.at(-1).audio,audio);f.relay.close();f.advance(LIVE_LIMITS.grace);await flush();
});
test('listen-only comments supply silence and close after returned audio',async()=>{
 const f=await fixture({mode:'listen'});f.ready();f.advance(100);assert.equal(f.upstream.sent.at(-1).type,'session.input_audio.append');f.upstream.emit({type:'session.output_audio.delta',delta:btoa('\0\0'.repeat(100))});f.advance(1900);assert.equal(f.upstream.sent.at(-1).type,'session.close');f.upstream.emit({type:'session.closed',usage:{seconds:2}});await flush();assert.equal(f.client.sent.find(e=>e.type==='closed')?.reason,'comment_finished');const receipt=Object.values((await f.store.read()).entries)[0];assert.equal(receipt.reserved,LIVE_RESERVATION.listen);assert.deepEqual((receipt.result as {liveSeconds:number}).liveSeconds,2);assert.equal(receipt.diagnostic?.outcome,'live_closed');
});
test('delegation waits for a complete quiet transcript and retains correction',async()=>{
 const f=await fixture();f.ready();f.upstream.emit({type:'session.delegation.created',delegation:{id:'d1',target:'client'}});f.advance(200);f.upstream.emit({type:'session.input_transcript.delta',delta:'A cat, '});f.advance(600);f.upstream.emit({type:'session.input_transcript.delta',delta:'without glasses.'});f.advance(800);assert.equal(f.client.sent.some(e=>e.type==='delegate'),false);f.advance(100);assert.equal(f.client.sent.find(e=>e.type==='delegate')?.text,'A cat, without glasses.');f.client.emit({type:'reply',delegationId:'d1',text:'Review the proposed cat without glasses.'});assert.equal(f.upstream.sent.at(-1).content,'Review the proposed cat without glasses.');f.relay.close();f.advance(LIVE_LIMITS.grace);await flush();
});
test('a second delegation preserves the first request plus the added sentence',async()=>{
 const f=await fixture();f.ready();
 f.upstream.emit({type:'session.input_transcript.delta',delta:'A sarcastic cat named Nyx with glasses and a soft spoken voice.'});
 f.upstream.emit({type:'session.delegation.created',delegation:{id:'first',target:'client'}});f.advance(900);
 f.upstream.emit({type:'session.input_transcript.delta',delta:' Please show me the proposed changes.'});
 f.upstream.emit({type:'session.delegation.created',delegation:{id:'second',target:'client'}});f.advance(900);
 const delegates=f.client.sent.filter(e=>e.type==='delegate');assert.equal(delegates.length,2);assert.equal(delegates[1].text,'A sarcastic cat named Nyx with glasses and a soft spoken voice. Please show me the proposed changes.');
 f.relay.close();f.advance(LIVE_LIMITS.grace);await flush();
});
test('unknown delegation reply and a repeated session start close safely',async()=>{
 const f=await fixture();f.ready();f.client.emit({type:'reply',delegationId:'fake',text:'Saved.'});assert.equal(f.upstream.sent.at(-1).type,'session.close');f.advance(LIVE_LIMITS.grace);await flush();assert.equal(f.client.sent.find(e=>e.type==='closed')?.reason,'invalid_request');
 const g=await fixture();g.ready();g.client.emit(input);assert.equal(g.calls(),1);g.advance(LIVE_LIMITS.grace);await flush();assert.equal(g.client.closed,true);
});
test('failed upgrades retain the reservation without raw provider data',async()=>{
 const f=await fixture({http:403});await flush();const receipt=Object.values((await f.store.read()).entries)[0];assert.equal(receipt.reserved,LIVE_RESERVATION.call);assert.equal(receipt.status,'done');assert.equal(f.client.closed,true);assert.equal(JSON.stringify(f.client.sent).includes('test-secret'),false);
});
test('client disconnect closes the upstream and keeps unconfirmed usage charged',async()=>{
 const f=await fixture();f.ready();f.client.disconnect();assert.equal(f.upstream.sent.at(-1).type,'session.close');f.advance(LIVE_LIMITS.grace);await flush();const receipt=Object.values((await f.store.read()).entries)[0];assert.equal(receipt.reserved,LIVE_RESERVATION.call);assert.equal(receipt.diagnostic?.outcome,'live_usage_unconfirmed');
});
