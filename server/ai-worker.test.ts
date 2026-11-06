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
