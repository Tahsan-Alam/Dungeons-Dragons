import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare,createFetchMock} from 'miniflare';
import {readFileSync} from 'node:fs';
import {creationFixture} from '../game/creation.ts';
import type {CreationRequest} from '../game/creation.ts';

test('password-free creation reaches the provider; device opt-out, origin, voice and cache boundaries remain enforced',async()=>{
 const bundle=await build({stdin:{contents:`
  import {POST as create} from './app/api/quest/create/route.ts';
  import {GET as live} from './app/api/quest/live/route.ts';
  import {GET,POST} from './app/api/ai/access/route.ts';
  export default {fetch(request){const path=new URL(request.url).pathname;return path==='/api/ai/access'?(request.method==='GET'?GET(request):POST(request)):path==='/api/quest/live'?live(request):create(request)}};
 `,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser',external:['cloudflare:workers']});
 const input:CreationRequest={action:'narrators',scope:'open-creator',requestId:'one',enabled:true,prompt:'A library at the edge of the stars.',message:'A soft-spoken wizard.',traits:{},history:[]};
 const fixture=creationFixture(input),mock=createFetchMock();mock.disableNetConnect();
 mock.get('https://api.openai.com').intercept({path:'/v1/responses',method:'POST',headers:{authorization:'Bearer mock-open-key'}}).reply(200,JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({reply:'Three guides for a star library.',narrators:fixture.narrators})}]}],usage:{input_tokens:200,output_tokens:300}}));
 const mf=new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-15',fetchMock:mock,d1Databases:['DB'],bindings:{OPENAI_API_KEY:'mock-open-key',AI_MODE:'openai',AI_ENABLE_PAID:'I_ACCEPT_SMALL_API_CHARGES',AI_ENABLE_AUDIO:'I_ACCEPT_PAID_AUDIO',AI_ACCESS_PASSWORD_HASH:'unused-legacy-hash'}});
 try{
  const db=await mf.getD1Database('DB');
  // Open mode does not even need the legacy session tables.
  for(const file of ['0000_wealthy_ben_grimm.sql','0001_ai_ledger.sql'])for(const sql of readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8').split(';').map(x=>x.replace('--> statement-breakpoint','').trim()).filter(Boolean))await db.prepare(sql).run();
  const post=(path:string,data:unknown,cookie?:string,origin='http://localhost')=>mf.dispatchFetch('http://localhost'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(data)});
  const status=await(await mf.dispatchFetch('http://localhost/api/ai/access')).json() as any;
  assert.equal(status.passwordRequired,false);assert.equal(status.unlocked,true);assert.ok(!JSON.stringify(status).includes('mock-open-key'));
  assert.equal((await mf.dispatchFetch('http://localhost/api/quest/live')).status,200);
  const upgrade=await mf.dispatchFetch('http://localhost/api/quest/live',{headers:{Origin:'http://localhost',Upgrade:'websocket'}});
  assert.equal(upgrade.status,101);upgrade.webSocket!.accept();upgrade.webSocket!.close(1000);
  const disable=await post('/api/ai/access',{action:'disable'}),cookie=disable.headers.get('set-cookie')!.split(';')[0];
  assert.equal((await disable.json() as any).unlocked,false);
  assert.equal((await(await mf.dispatchFetch('http://localhost/api/ai/access',{headers:{Cookie:cookie}})).json() as any).unlocked,false);
  const blocked=await post('/api/quest/create',input,cookie);assert.equal(blocked.status,403);assert.equal((await blocked.json() as any).code,'AI_DISABLED');
  assert.equal((await mf.dispatchFetch('http://localhost/api/quest/live',{headers:{Cookie:cookie}})).status,403);
  assert.equal((await post('/api/quest/create',input,undefined,'https://other.example')).status,403);
  assert.equal((await post('/api/ai/access',{action:'enable'},cookie,'https://other.example')).status,403);
  assert.equal((await(await post('/api/quest/create',{...input,enabled:false})).json() as any).source,'fixture');
  assert.equal(await db.prepare('SELECT payload FROM ai_ledger').first(),null);
  const enable=await post('/api/ai/access',{action:'enable'},cookie),onCookie=enable.headers.get('set-cookie')!.split(';')[0];
  assert.equal((await enable.json() as any).unlocked,true);
  const response=await post('/api/quest/create',input,onCookie);assert.equal(response.status,200);const result=await response.json() as any;assert.equal(result.source,'openai');assert.equal(result.narrators.length,3);
  assert.deepEqual(await(await post('/api/quest/create',input)).json(),result);
  const ledger=JSON.parse((await db.prepare('SELECT payload FROM ai_ledger').first<any>()).payload);
  assert.equal(Object.keys(ledger.entries).length,1);assert.ok((Object.values(ledger.entries)[0] as any).reserved>0);
  mock.assertNoPendingInterceptors();
 }finally{await mf.dispose();}
});
