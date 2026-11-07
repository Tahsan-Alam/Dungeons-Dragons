import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare,createFetchMock} from 'miniflare';
import {readFileSync} from 'node:fs';
import {pbkdf2Sync} from 'node:crypto';

const password='voice-route-test-password',salt='c'.repeat(32);
const passwordHash=`pbkdf2-sha256:100000:${salt}:${pbkdf2Sync(password,Buffer.from(salt,'hex'),100_000,32,'sha256').toString('hex')}`;
test('voice preflight explains locked and disabled access without opening a paid session, then upgrades after unlock',async()=>{
 const bundle=await build({stdin:{contents:`import {GET} from './app/api/quest/live/route.ts';import {POST} from './app/api/ai/access/route.ts';export default {fetch(request){return new URL(request.url).pathname==='/api/ai/access'?POST(request):GET(request)}};`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser',external:['cloudflare:workers']});
 const mock=createFetchMock();mock.disableNetConnect();
 const mf=new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-15',fetchMock:mock,d1Databases:['DB'],bindings:{OPENAI_API_KEY:'voice-test-only',AI_MODE:'openai',AI_ENABLE_PAID:'I_ACCEPT_SMALL_API_CHARGES',AI_ENABLE_AUDIO:'I_ACCEPT_PAID_AUDIO',AI_ACCESS_PASSWORD_HASH:passwordHash}});
 try{
  const db=await mf.getD1Database('DB');
  for(const file of ['0000_wealthy_ben_grimm.sql','0001_ai_ledger.sql','0002_dazzling_power_pack.sql','0003_loving_kree.sql'])for(const sql of readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8').split(';').map(x=>x.replace('--> statement-breakpoint','').trim()).filter(Boolean))await db.prepare(sql).run();
  const preflight=(cookie?:string,origin?:string)=>mf.dispatchFetch('http://localhost/api/quest/live',{headers:{...(cookie?{Cookie:cookie}:{}),...(origin?{Origin:origin}:{})}});
  const access=(action:string,cookie?:string)=>mf.dispatchFetch('http://localhost/api/ai/access',{method:'POST',headers:{Origin:'http://localhost','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify({action,password})});
  const locked=await preflight();assert.equal(locked.status,403);assert.equal((await locked.json() as any).code,'AI_PASSWORD_REQUIRED');
  assert.equal((await preflight(undefined,'https://elsewhere.test')).status,403);
  const unlocked=await access('unlock'),cookie=unlocked.headers.get('set-cookie')!.split(';')[0];
  const ready=await preflight(cookie);assert.equal(ready.status,200);assert.deepEqual(await ready.json(),{ready:true});
  assert.equal(await db.prepare('SELECT payload FROM ai_ledger WHERE id=1').first(),null);
  await access('disable',cookie);const disabled=await preflight(cookie);assert.equal(disabled.status,403);assert.equal((await disabled.json() as any).code,'AI_DISABLED');
  await access('enable',cookie);
  const upgrade=await mf.dispatchFetch('http://localhost/api/quest/live',{headers:{Origin:'http://localhost',Upgrade:'websocket',Cookie:cookie}});
  assert.equal(upgrade.status,101);assert.ok(upgrade.webSocket);upgrade.webSocket!.accept();upgrade.webSocket!.close(1000);
  assert.equal(await db.prepare('SELECT payload FROM ai_ledger WHERE id=1').first(),null);mock.assertNoPendingInterceptors();
 }finally{await mf.dispose();}
});
