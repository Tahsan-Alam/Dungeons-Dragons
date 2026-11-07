import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare,createFetchMock} from 'miniflare';
import {readFileSync} from 'node:fs';

test('native Workers fetch reaches the mock provider without receiver or redirect errors',async()=>{
 const bundle=await build({stdin:{contents:`
  import {GameAI} from './server/ai-service.ts';
  import {MemoryLedger,BudgetLedger} from './server/ai-ledger.ts';
  import {createGame} from './game/engine.ts';
  import {DEFAULT_OPTIONS,HERO_COLORS} from './game/types.ts';
  export default {async fetch(){
   const store=new MemoryLedger();
   const ai=new GameAI({mode:'openai',enabled:'I_ACCEPT_SMALL_API_CHARGES',key:'fake-worker-test'},new BudgetLedger(store));
   const game=createGame([{id:'you',name:'Ada',heroClass:'ranger',color:HERO_COLORS[0],bot:false}],DEFAULT_OPTIONS);
   await ai.narrate('worker',game);
   return Response.json(Object.values((await store.read()).entries)[0].diagnostic);
  }};`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser'});
 const mock=createFetchMock();mock.disableNetConnect();
 mock.get('https://api.openai.com').intercept({path:'/v1/responses',method:'POST'}).reply(401,JSON.stringify({error:{code:'invalid_api_key'}}));
 const mf=new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-15',fetchMock:mock});
 try{assert.deepEqual(await(await mf.dispatchFetch('http://localhost/')).json(),{outcome:'authentication',httpStatus:401});mock.assertNoPendingInterceptors();}finally{await mf.dispose();}
});

test('application routes read Worker secret bindings and persist bounded provider failure in D1',async()=>{
 const bundle=await build({stdin:{contents:`
  import {POST as create} from './app/api/rooms/route.ts';
  import {POST as command} from './app/api/rooms/[code]/route.ts';
  export default {fetch(request){return new URL(request.url).pathname==='/api/rooms'?create(request):command(request,{params:Promise.resolve({code:new URL(request.url).pathname.split('/').at(-1)})});}};
 `,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser',external:['cloudflare:workers']});
 const mock=createFetchMock();mock.disableNetConnect();
 mock.get('https://api.openai.com').intercept({path:'/v1/responses',method:'POST',headers:{authorization:'Bearer worker-binding-test-only'}}).reply(429,JSON.stringify({error:{code:'insufficient_quota',message:'private-provider-detail'}}));
 const mf=new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-15',fetchMock:mock,d1Databases:['DB'],bindings:{OPENAI_API_KEY:'worker-binding-test-only',AI_MODE:'openai',AI_ENABLE_PAID:'I_ACCEPT_SMALL_API_CHARGES'}});
 try{
  const db=await mf.getD1Database('DB');
  for(const file of ['0000_wealthy_ben_grimm.sql','0001_ai_ledger.sql'])for(const sql of readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8').split(';').map(x=>x.replace('--> statement-breakpoint','').trim()).filter(Boolean))await db.prepare(sql).run();
  const post=(path:string,data:unknown,token?:string)=>mf.dispatchFetch('http://localhost'+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(data)});
  const created=await(await post('/api/rooms',{name:'Ada',heroClass:'ranger',options:{rules:'simple',narrator:'warm',biome:'woodland',seed:'worker',companions:0}})).json() as any;
  const path='/api/rooms/'+created.session.code,input={requestId:'worker-start-id',version:created.room.version,command:{type:'start'}};
  assert.equal((await post(path,input)).status,401);
  const result=await post(path,input,created.session.token);assert.equal(result.status,200);const body=await result.json() as any;assert.equal(body.room.game.story.campaign.source,'fixture');
  const ledger=JSON.parse((await db.prepare('SELECT payload FROM ai_ledger WHERE id=1').first<any>()).payload);
  const receipts=Object.values(ledger.entries) as any[];assert.equal(receipts.length,1);assert.equal(receipts[0].diagnostic.outcome,'quota_exhausted');assert.ok(receipts[0].reserved>0);assert.equal(receipts[0].status,'done');
  assert.equal((await post(path,input,created.session.token)).status,200);
  assert.ok(!JSON.stringify(body).includes('worker-binding-test-only'));assert.ok(!JSON.stringify(ledger).includes('private-provider-detail'));mock.assertNoPendingInterceptors();
 }finally{await mf.dispose();}
});

test('dictation application route returns top-level text, caches paid transcription and enforces origin/AI gates in native Workers',async()=>{
 const bundle=await build({stdin:{contents:`import {POST} from './app/api/quest/dictation/route.ts';export default {fetch:POST};`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser',external:['cloudflare:workers']});
 const mock=createFetchMock();mock.disableNetConnect();
 mock.get('https://api.openai.com').intercept({path:'/v1/audio/transcriptions',method:'POST',headers:{authorization:'Bearer dictation-worker-test-only'}}).reply(200,JSON.stringify({text:'Um, I I want a moonlit coast, but no spiders.'}));
 const options={modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-15',fetchMock:mock,d1Databases:['DB']};
 const mf=new Miniflare({...options,bindings:{OPENAI_API_KEY:'dictation-worker-test-only',AI_MODE:'openai',AI_ENABLE_PAID:'I_ACCEPT_SMALL_API_CHARGES'}});
 const disabled=new Miniflare({...options,bindings:{OPENAI_API_KEY:'dictation-worker-test-only',AI_MODE:'fixture',AI_ENABLE_PAID:'DISABLED'}});
 const recording=new Uint8Array(44+32000),v=new DataView(recording.buffer);
 const tag=(at:number,text:string)=>{for(let i=0;i<text.length;i++)recording[at+i]=text.charCodeAt(i);};
 tag(0,'RIFF');v.setUint32(4,recording.length-8,true);tag(8,'WAVE');tag(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,16000,true);v.setUint32(28,32000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);tag(36,'data');v.setUint32(40,32000,true);
 const post=(worker:Miniflare,origin='http://localhost')=>worker.dispatchFetch('http://localhost/api/quest/dictation',{method:'POST',headers:{Origin:origin,'Content-Type':'audio/wav'},body:recording});
 try{
  const db=await mf.getD1Database('DB');
  for(const file of ['0000_wealthy_ben_grimm.sql','0001_ai_ledger.sql'])for(const sql of readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8').split(';').map(x=>x.replace('--> statement-breakpoint','').trim()).filter(Boolean))await db.prepare(sql).run();
  assert.equal((await post(mf,'https://another-origin.example')).status,403);
  assert.equal((await post(disabled)).status,503);
  const response=await post(mf);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store, private');
  const result=await response.json();assert.deepEqual(result,{transcript:'Um, I I want a moonlit coast, but no spiders.',text:'I want a moonlit coast, but no spiders.'});
  const cached=await post(mf);assert.equal(cached.status,200);assert.deepEqual(await cached.json(),result);
  const ledger=JSON.parse((await db.prepare('SELECT payload FROM ai_ledger WHERE id=1').first<any>()).payload),receipts=Object.values(ledger.entries) as any[];
  assert.equal(receipts.length,1);assert.equal(receipts[0].status,'done');assert.equal(receipts[0].reserved,20_000);assert.equal(receipts[0].diagnostic.outcome,'accepted');
  assert.ok(!JSON.stringify(result).includes('dictation-worker-test-only'));mock.assertNoPendingInterceptors();
 }finally{await Promise.all([mf.dispose(),disabled.dispose()]);}
});
