import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare,createFetchMock} from 'miniflare';
import {readFileSync} from 'node:fs';
import {pbkdf2Sync} from 'node:crypto';
import {creationFixture} from '../game/creation.ts';
import type {CreationRequest} from '../game/creation.ts';
const password='creator-worker-test',salt='b'.repeat(32),passwordHash=`pbkdf2-sha256:100000:${salt}:${pbkdf2Sync(password,Buffer.from(salt,'hex'),100_000,32,'sha256').toString('hex')}`;
const input:CreationRequest={action:'narrators',scope:'worker-creator',requestId:'one',enabled:true,prompt:'A library at the edge of the stars.',message:'A soft-spoken wizard.',traits:{},history:[]};
test('creator route enforces team access, player opt-out, origin and validation before any paid request',async()=>{
 const bundle=await build({stdin:{contents:`import {POST} from './app/api/quest/create/route.ts';import {POST as access} from './app/api/ai/access/route.ts';export default {fetch(request){return new URL(request.url).pathname==='/api/ai/access'?access(request):POST(request)}};`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser',external:['cloudflare:workers']});
 const mock=createFetchMock();mock.disableNetConnect();const fixture=creationFixture(input);
 mock.get('https://api.openai.com').intercept({path:'/v1/responses',method:'POST',headers:{authorization:'Bearer creator-worker-only'}}).reply(200,JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({reply:'Three guides for a star library.',narrators:fixture.narrators})}]}],usage:{input_tokens:200,output_tokens:300}}));
 mock.get('https://api.openai.com').intercept({path:'/v1/responses',method:'POST'}).reply(429,JSON.stringify({error:{code:'insufficient_quota'}}));
 const mf=new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-15',fetchMock:mock,d1Databases:['DB'],bindings:{OPENAI_API_KEY:'creator-worker-only',AI_MODE:'openai',AI_ENABLE_PAID:'I_ACCEPT_SMALL_API_CHARGES',AI_ACCESS_PASSWORD_HASH:passwordHash}});
 try{
  const db=await mf.getD1Database('DB');for(const file of ['0000_wealthy_ben_grimm.sql','0001_ai_ledger.sql','0002_dazzling_power_pack.sql','0003_loving_kree.sql'])for(const sql of readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8').split(';').map(x=>x.replace('--> statement-breakpoint','').trim()).filter(Boolean))await db.prepare(sql).run();
  const post=(body:unknown,cookie?:string,origin='http://localhost',path='/api/quest/create')=>mf.dispatchFetch('http://localhost'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
  const locked=await post(input);assert.equal(locked.status,403);assert.equal((await locked.json() as any).code,'AI_PASSWORD_REQUIRED');
  assert.equal((await post(input,'painted-realms-ai='+'f'.repeat(64))).status,403);
  assert.equal(await db.prepare('SELECT payload FROM ai_ledger WHERE id=1').first(),null);
  assert.equal((await post({...input,action:'heroes'})).status,400);assert.equal((await post(input,undefined,'https://other.example')).status,403);
  const unlock=await post({action:'unlock',password},undefined,'http://localhost','/api/ai/access');assert.equal(unlock.status,200);const cookie=unlock.headers.get('set-cookie')!.split(';')[0];
  await post({action:'disable'},cookie,'http://localhost','/api/ai/access');const disabled=await post(input,cookie);assert.equal(disabled.status,403);assert.equal((await disabled.json() as any).code,'AI_DISABLED');
  await post({action:'enable'},cookie,'http://localhost','/api/ai/access');
  assert.equal((await(await post({...input,enabled:false},cookie)).json() as any).source,'fixture');assert.equal(await db.prepare('SELECT payload FROM ai_ledger WHERE id=1').first(),null);
  const result=await(await post(input,cookie)).json() as any;assert.equal(result.source,'openai');assert.equal(result.narrators.length,3);assert.ok(!JSON.stringify(result).includes('creator-worker-only'));
  assert.deepEqual(await(await post(input,cookie)).json(),result);const failed=await post({...input,requestId:'two',message:'Make the second guide warmer.',candidates:result.narrators},cookie);assert.equal(failed.status,503);assert.match((await failed.json() as any).error,/draft is unchanged/);const ledger=JSON.parse((await db.prepare('SELECT payload FROM ai_ledger WHERE id=1').first<any>()).payload);assert.equal(Object.keys(ledger.entries).length,2);mock.assertNoPendingInterceptors();
 }finally{await mf.dispose();}
});

test('enabled creation on an unconfigured server is explicit and never returns a fixture as AI',async()=>{
 const bundle=await build({stdin:{contents:`import {POST} from './app/api/quest/create/route.ts';export default {fetch:POST};`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser',external:['cloudflare:workers']});
 const mock=createFetchMock();mock.disableNetConnect();const mf=new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-15',fetchMock:mock});
 try{
  const response=await mf.dispatchFetch('http://localhost/api/quest/create',{method:'POST',headers:{Origin:'http://localhost','Content-Type':'application/json'},body:JSON.stringify(input)});
  assert.equal(response.status,503);const data=await response.json() as any;assert.equal(data.code,'AI_UNAVAILABLE');assert.equal(data.source,undefined);
 }finally{await mf.dispose();}
});
