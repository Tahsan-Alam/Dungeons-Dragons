import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare,createFetchMock} from 'miniflare';
import {readFileSync,readdirSync} from 'node:fs';

const paint={name:'Mother Ash',form:'owl',accessory:'none',color:'#87bdcf',tone:'hopeful',description:'',requestId:'paint-worker-1'};
test('the paint route keeps to the switch, the daily allowance and serves stored pictures',async()=>{
 const bundle=await build({stdin:{contents:`import {POST} from './app/api/ai/paint/route.ts';import {GET} from './app/api/ai/image/[id]/route.ts';
  export default {fetch(request){const path=new URL(request.url).pathname;const m=path.match(/^\\/api\\/ai\\/image\\/([^/]+)$/);return m?GET(request,{params:Promise.resolve({id:m[1]})}):POST(request)}};`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser',external:['cloudflare:workers']});
 const mock=createFetchMock();mock.disableNetConnect();
 const reply=()=>JSON.stringify({images:[{url:'https://v3.fal.media/files/one.jpg'},{url:'https://v3.fal.media/files/two.jpg'}],has_nsfw_concepts:[false,false]});
 mock.get('https://fal.run').intercept({path:'/fal-ai/flux-lora',method:'POST',headers:{authorization:'Key fal-worker-only'}}).reply(200,reply()).times(4);
 mock.get('https://v3.fal.media').intercept({path:'/files/one.jpg'}).reply(200,new Uint8Array([255,216,255,1]),{headers:{'content-type':'image/jpeg'}}).times(4);
 mock.get('https://v3.fal.media').intercept({path:'/files/two.jpg'}).reply(200,new Uint8Array([255,216,255,2]),{headers:{'content-type':'image/jpeg'}}).times(4);
 const bindings={FAL_KEY:'fal-worker-only',FAL_LORA_URL:'https://v3b.fal.media/files/b/x/pytorch_lora_weights.safetensors',AI_ENABLE_IMAGES:'I_ACCEPT_PAID_IMAGES'};
 const mf=new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-15',fetchMock:mock,d1Databases:['DB'],bindings});
 try{
  const db=await mf.getD1Database('DB');
  for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())
   for(const sql of readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8').split(';').map(x=>x.replace(/--> statement-breakpoint/g,'').trim()).filter(Boolean))await db.prepare(sql).run();
  const post=(body:unknown,cookie?:string)=>mf.dispatchFetch('http://localhost/api/ai/paint',{method:'POST',headers:{Origin:'http://localhost','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
  assert.equal((await post({...paint,description:'x'.repeat(90)})).status,400);
  const off=await post(paint,'painted-realms-ai-preference=off');assert.equal(off.status,403);
  const first=await post(paint);assert.equal(first.status,200);const {images}=await first.json() as {images:string[]};assert.equal(images.length,2);
  const picture=await mf.dispatchFetch(`http://localhost/api/ai/image/${images[0]}`);
  assert.equal(picture.status,200);assert.equal(picture.headers.get('content-type'),'image/jpeg');assert.match(picture.headers.get('cache-control')??'',/immutable/);
  assert.deepEqual([...new Uint8Array(await picture.arrayBuffer())],[255,216,255,1]);
  assert.equal((await mf.dispatchFetch(`http://localhost/api/ai/image/${'0'.repeat(32)}`)).status,404);
  assert.equal((await mf.dispatchFetch('http://localhost/api/ai/image/not-an-id')).status,404);
  // Four pictures a day for each kind (two tries): a third Game Master try is refused before fal is called, a hero still paints.
  assert.equal((await post({...paint,requestId:'paint-worker-2'})).status,200);
  const second=await post({...paint,requestId:'paint-worker-5'});assert.equal(second.status,429);assert.equal((await second.json() as {code?:string}).code,'PAINT_DAILY_LIMIT');
  assert.equal((await post({kind:'hero',name:'Tamsin',heroClass:'ranger',color:'#b2c877',description:'',requestId:'paint-worker-3'})).status,200);
  assert.equal((await post({kind:'hero',name:'Tamsin',heroClass:'ranger',color:'#b2c877',description:'',requestId:'paint-worker-4'})).status,200);
  assert.equal((await post({kind:'hero',name:'Tamsin',heroClass:'ranger',color:'#b2c877',description:'',requestId:'paint-worker-6'})).status,429);
  mock.assertNoPendingInterceptors();
 }finally{await mf.dispose();}
});

test('an unconfigured server refuses to paint',async()=>{
 const bundle=await build({stdin:{contents:`import {POST} from './app/api/ai/paint/route.ts';export default {fetch:POST};`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser',external:['cloudflare:workers']});
 const mock=createFetchMock();mock.disableNetConnect();
 const mf=new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-15',fetchMock:mock,d1Databases:['DB']});
 try{
  const db=await mf.getD1Database('DB');
  for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())
   for(const sql of readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8').split(';').map(x=>x.replace(/--> statement-breakpoint/g,'').trim()).filter(Boolean))await db.prepare(sql).run();
  const response=await mf.dispatchFetch('http://localhost/api/ai/paint',{method:'POST',headers:{Origin:'http://localhost','Content-Type':'application/json'},body:JSON.stringify(paint)});
  assert.equal(response.status,503);assert.equal((await response.json() as {code?:string}).code,'PAINT_UNAVAILABLE');
 }finally{await mf.dispose();}
});
