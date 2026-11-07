import assert from 'node:assert/strict';
import test from 'node:test';
import {transcribeQuest} from './ai-dictation.ts';
import {BudgetLedger,MemoryLedger,DEFAULT_CAPS} from './ai-ledger.ts';

function wav(sample=0):Uint8Array {
 const bytes=new Uint8Array(44+32000),v=new DataView(bytes.buffer);
 const tag=(at:number,text:string)=>{for(let i=0;i<text.length;i++)bytes[at+i]=text.charCodeAt(i);};
 tag(0,'RIFF');v.setUint32(4,bytes.length-8,true);tag(8,'WAVE');tag(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,16000,true);v.setUint32(28,32000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);tag(36,'data');v.setUint32(40,32000,true);v.setInt16(44,sample,true);return bytes;
}

test('invalid recordings and exhausted allowance fail before any transcription request',async()=>{
 let calls=0;const transport:typeof fetch=async()=>{calls++;throw new Error('Unexpected outbound request');};
 const store=new MemoryLedger();await assert.rejects(transcribeQuest(new Uint8Array(44),'mock-key',new BudgetLedger(store),transport),/mono audio/);assert.deepEqual((await store.read()).entries,{});
 await assert.rejects(transcribeQuest(wav(),'mock-key',new BudgetLedger(store,{...DEFAULT_CAPS,campaign:19_999}),transport),/allowance/);assert.equal(calls,0);assert.deepEqual((await store.read()).entries,{});
});

test('transcription reserves first, sends only bounded WAV, and reuses the receipt after restart',async()=>{
 const store=new MemoryLedger(),recording=wav();let calls=0;
 const transport:typeof fetch=async(url,init)=>{
  calls++;assert.equal(url,'https://api.openai.com/v1/audio/transcriptions');assert.equal(init?.method,'POST');assert.equal(init?.redirect,'manual');assert.ok(init?.signal);assert.equal(new Headers(init?.headers).get('authorization'),'Bearer mock-key');
  const receipts=Object.values((await store.read()).entries);assert.equal(receipts.length,1);assert.equal(receipts[0].status,'pending');assert.equal(receipts[0].reserved,20_000);
  const form=init?.body as FormData;assert.equal(form.get('model'),'gpt-transcribe');const file=form.get('file') as File;assert.equal(file.type,'audio/wav');assert.equal(file.name,'quest.wav');assert.deepEqual(new Uint8Array(await file.arrayBuffer()),recording);
  return Response.json({text:'Um, I I want a coast, but no spiders.'});
 };
 const first=await transcribeQuest(recording,'mock-key',new BudgetLedger(store),transport);
 assert.equal(first.transcript,'Um, I I want a coast, but no spiders.');assert.equal(first.text,'I want a coast, but no spiders.');
 assert.deepEqual(await transcribeQuest(recording,'mock-key',new BudgetLedger(store),transport),first);assert.equal(calls,1);
 const receipt=Object.values((await store.read()).entries)[0];assert.equal(receipt.status,'done');assert.equal(receipt.diagnostic?.outcome,'accepted');assert.equal(receipt.reserved,20_000);assert.ok(!JSON.stringify(await store.read()).includes('mock-key'));
});

test('simultaneous duplicate recordings cannot issue a second paid transcription',async()=>{
 const store=new MemoryLedger(),ledger=new BudgetLedger(store);let calls=0,entered!:()=>void,release!:()=>void;
 const started=new Promise<void>(r=>entered=r),wait=new Promise<void>(r=>release=r);
 const transport:typeof fetch=async()=>{calls++;entered();await wait;return Response.json({text:'A lanternwood adventure.'});};
 const first=transcribeQuest(wav(),'mock-key',ledger,transport);await started;
 await assert.rejects(transcribeQuest(wav(),'mock-key',ledger,transport),/could not be transcribed/);release();await first;assert.equal(calls,1);
});

test('failed, malformed and oversized transcriptions retain their reservation and never retry',async()=>{
 const failures=[()=>{throw new Error('sensitive transport detail');},()=>new Response('sensitive provider message',{status:429}),()=>new Response('{malformed'),()=>Response.json({text:''}),()=>Response.json({text:123}),()=>Response.json({text:'x'.repeat(3001)}),()=>Response.json({text:'x'.repeat(16_000)})];
 for(const failure of failures){
  const store=new MemoryLedger();let calls=0;const transport:typeof fetch=async()=>{calls++;return failure();};
  await assert.rejects(transcribeQuest(wav(),'mock-key',new BudgetLedger(store),transport),/Transcription unavailable/);
  await assert.rejects(transcribeQuest(wav(),'mock-key',new BudgetLedger(store),transport),/could not be transcribed/);assert.equal(calls,1);
  const state=await store.read(),receipt=Object.values(state.entries)[0];assert.equal(receipt.reserved,20_000);assert.equal(receipt.status,'done');assert.equal(receipt.result,null);assert.equal(receipt.diagnostic?.outcome,'transcription_failed');assert.ok(!JSON.stringify(state).includes('sensitive'));
 }
});

test('the transcript byte limit cancels an oversized streamed response',async()=>{
 const store=new MemoryLedger();let cancelled=false;
 const transport:typeof fetch=async()=>new Response(new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new Uint8Array(12_000));controller.enqueue(new Uint8Array(5_000));},cancel(){cancelled=true;}}));
 await assert.rejects(transcribeQuest(wav(),'mock-key',new BudgetLedger(store),transport),/Transcription unavailable/);assert.equal(cancelled,true);
 assert.equal(Object.values((await store.read()).entries)[0].reserved,20_000);
});

test('different audio receives a separate reservation while identical audio shares a transcript',async()=>{
 const store=new MemoryLedger();let calls=0;const transport:typeof fetch=async()=>{calls++;return Response.json({text:`Quest ${calls}`});};
 const first=await transcribeQuest(wav(1),'mock-key',new BudgetLedger(store),transport),second=await transcribeQuest(wav(2),'mock-key',new BudgetLedger(store),transport);
 assert.equal(calls,2);assert.notEqual(first.text,second.text);assert.equal(Object.values((await store.read()).entries).reduce((sum,r)=>sum+r.reserved,0),40_000);
});

test('pre-quest recordings have independent scopes and still share the enforced global allowance',async()=>{
 const store=new MemoryLedger(),ledger=new BudgetLedger(store,{...DEFAULT_CAPS,campaign:20_000,day:40_000,month:40_000});let calls=0;
 const transport:typeof fetch=async()=>{calls++;return Response.json({text:'A lighthouse quest.'});};
 await transcribeQuest(wav(1),'mock-key',ledger,transport);await transcribeQuest(wav(2),'mock-key',ledger,transport);
 await assert.rejects(transcribeQuest(wav(3),'mock-key',ledger,transport),/allowance reached/);
 const receipts=Object.values((await store.read()).entries);assert.equal(calls,2);assert.equal(new Set(receipts.map(receipt=>receipt.campaign)).size,2);assert.equal(receipts.reduce((sum,receipt)=>sum+receipt.reserved,0),40_000);
});
