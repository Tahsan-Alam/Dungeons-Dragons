import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare,createFetchMock} from 'miniflare';
import {readFileSync} from 'node:fs';
import {pbkdf2Sync} from 'node:crypto';
const password='worker-test-password',salt='a'.repeat(32);
const passwordHash=`pbkdf2-sha256:100000:${salt}:${pbkdf2Sync(password,Buffer.from(salt,'hex'),100_000,32,'sha256').toString('hex')}`;

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
  import {POST as access,GET as accessStatus} from './app/api/ai/access/route.ts';
  import {POST as assist} from './app/api/rooms/[code]/assist/route.ts';
  export default {fetch(request){const path=new URL(request.url).pathname;return path==='/api/ai/access'?(request.method==='GET'?accessStatus(request):access(request)):path==='/api/rooms'?create(request):path.endsWith('/assist')?assist(request,{params:Promise.resolve({code:path.split('/').at(-2)})}):command(request,{params:Promise.resolve({code:path.split('/').at(-1)})});}};
 `,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser',external:['cloudflare:workers']});
 const mock=createFetchMock();mock.disableNetConnect();
 mock.get('https://api.openai.com').intercept({path:'/v1/responses',method:'POST',headers:{authorization:'Bearer worker-binding-test-only'}}).reply(429,JSON.stringify({error:{code:'insufficient_quota',message:'private-provider-detail'}}));
 const mf=new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-15',fetchMock:mock,d1Databases:['DB'],bindings:{OPENAI_API_KEY:'worker-binding-test-only',AI_MODE:'openai',AI_ENABLE_PAID:'I_ACCEPT_SMALL_API_CHARGES',AI_ENABLE_AUDIO:'I_ACCEPT_PAID_AUDIO',AI_ACCESS_PASSWORD_HASH:passwordHash}});
 try{
  const db=await mf.getD1Database('DB');
  for(const file of ['0000_wealthy_ben_grimm.sql','0001_ai_ledger.sql','0002_dazzling_power_pack.sql','0003_loving_kree.sql'])for(const sql of readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8').split(';').map(x=>x.replace('--> statement-breakpoint','').trim()).filter(Boolean))await db.prepare(sql).run();
  const post=(path:string,data:unknown,token?:string,cookie?:string)=>mf.dispatchFetch('http://localhost'+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost',...(token?{Authorization:'Bearer '+token}:{}),...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(data)});
  const options={name:'Ada',heroClass:'ranger',options:{rules:'simple',narrator:'warm',biome:'woodland',seed:'worker',companions:0}};
  const locked=await(await post('/api/rooms',options)).json() as any;
  const lockedPath='/api/rooms/'+locked.session.code;
  const lockedStart=await(await post(lockedPath,{requestId:'locked-start-id',version:locked.room.version,command:{type:'start'},allowPaid:true},locked.session.token,'painted-realms-ai='+'a'.repeat(64))).json() as any;
  assert.equal(lockedStart.room.game.story.campaign.source,'fixture');
  const narrated=await(await post(lockedPath,{requestId:'locked-narration',version:lockedStart.room.version,command:{type:'narrate'}},locked.session.token)).json() as any;
  assert.equal((await post(lockedPath+'/assist',{version:narrated.room.version,text:'guard',audio:true},locked.session.token)).status,200);
  assert.equal(await db.prepare('SELECT payload FROM ai_ledger WHERE id=1').first(),null,'locked routes must never reserve or call providers');
  assert.equal((await post('/api/ai/access',{action:'unlock',password:'wrong-password'})).status,403);
  const unlock=await post('/api/ai/access',{action:'unlock',password});assert.equal(unlock.status,200);
  const cookie=unlock.headers.get('set-cookie')!.split(';')[0];
  assert.match(unlock.headers.get('set-cookie')!,/HttpOnly; SameSite=Strict/);
  assert.ok(!JSON.stringify(await unlock.json()).includes(password));
  const disabled=await(await post('/api/ai/access',{action:'disable'},undefined,cookie)).json() as any;assert.equal(disabled.remembered,true);assert.equal(disabled.unlocked,false);
  const enabled=await(await post('/api/ai/access',{action:'enable'},undefined,cookie)).json() as any;assert.equal(enabled.unlocked,true);
  const created=await(await post('/api/rooms',{name:'Ada',heroClass:'ranger',options:{rules:'simple',narrator:'warm',biome:'woodland',seed:'worker',companions:0}})).json() as any;
  const path='/api/rooms/'+created.session.code,input={requestId:'worker-start-id',version:created.room.version,command:{type:'start'}};
  assert.equal((await post(path,input)).status,401);
  const result=await post(path,input,created.session.token,cookie);assert.equal(result.status,200);const body=await result.json() as any;assert.equal(body.room.game.story.campaign.source,'fixture');
  const ledger=JSON.parse((await db.prepare('SELECT payload FROM ai_ledger WHERE id=1').first<any>()).payload);
  const receipts=Object.values(ledger.entries) as any[];assert.equal(receipts.length,1);assert.equal(receipts[0].diagnostic.outcome,'quota_exhausted');assert.ok(receipts[0].reserved>0);assert.equal(receipts[0].status,'done');
  assert.equal((await post(path,input,created.session.token)).status,200);
  assert.ok(!JSON.stringify(body).includes('worker-binding-test-only'));assert.ok(!JSON.stringify(ledger).includes('private-provider-detail'));mock.assertNoPendingInterceptors();
  assert.equal((await post('/api/ai/access',{action:'forget'},undefined,cookie)).status,200);
  const status=await(await mf.dispatchFetch('http://localhost/api/ai/access',{headers:{Cookie:cookie}})).json() as any;assert.equal(status.unlocked,false);assert.equal(status.remembered,false);
  assert.equal((await post('/api/ai/access',{action:'enable'},undefined,cookie)).status,403);
  for(let i=0;i<3;i++)assert.equal((await post('/api/ai/access',{action:'unlock',password:'wrong-password'})).status,403);
  assert.equal((await post('/api/ai/access',{action:'unlock',password})).status,429,'correct password cannot bypass attempt limit');
  assert.equal((await mf.dispatchFetch('http://localhost/api/ai/access',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://other.example'},body:JSON.stringify({action:'unlock',password})})).status,403);
 }finally{await mf.dispose();}
});
