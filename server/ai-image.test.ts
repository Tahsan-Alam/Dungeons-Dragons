import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BudgetLedger,MemoryLedger} from './ai-ledger.ts';
import {MemoryImageStore,heroPaintPrompt,imagesConfigured,imagesPerPlayerDay,paintPicture,paintPrompt,parsePaintRequest,type PaintRequest} from './ai-image.ts';
import {parseNarrator} from '../game/creation.ts';
import {ownGameMaster} from '../game/own-game-master.ts';

const env={FAL_KEY:'fal-test-only',FAL_LORA_URL:'https://v3b.fal.media/files/b/lora/pytorch_lora_weights.safetensors',AI_ENABLE_IMAGES:'I_ACCEPT_PAID_IMAGES'};
const request:PaintRequest={kind:'gm',description:'a retired lighthouse keeper with a lantern',requestId:'paint-0001'};
const jpeg=(n:number)=>new Uint8Array([0xff,0xd8,0xff,n,1,2,3]);

function fakeFal(options:{nsfw?:boolean[];urls?:string[];status?:number;flagged?:boolean}={}){
 const calls:{url:string;init?:RequestInit}[]=[];
 const fetcher=(async(url:string,init?:RequestInit)=>{
  calls.push({url,init});
  if(url.includes('/v1/moderations'))return Response.json({results:[{flagged:!!options.flagged}]});
  if(url==='https://fal.run/fal-ai/flux-lora')return options.status?new Response('no',{status:options.status}):Response.json({images:(options.urls??['https://v3.fal.media/files/a.jpg','https://v3.fal.media/files/b.jpg']).map(u=>({url:u})),has_nsfw_concepts:options.nsfw??[false,false]});
  const n=url.endsWith('a.jpg')?1:2;
  return new Response(jpeg(n),{headers:{'content-type':'image/jpeg'}});
 }) as unknown as typeof fetch;
 return {fetcher,calls};
}

test('a paint request is the player description (required, up to 200 characters); other fields are ignored',()=>{
 const raw={...request} as Record<string,unknown>;
 assert.deepEqual(parsePaintRequest(raw),request);
 assert.deepEqual(parsePaintRequest({...raw,name:'Mother Ash',form:'owl',color:'#000000'}),request);
 assert.equal(parsePaintRequest({...raw,description:'x'.repeat(200)})?.description.length,200);
 assert.equal(parsePaintRequest({...raw,description:'x'.repeat(201)}),null);
 assert.equal(parsePaintRequest({...raw,description:''}),null);
 assert.equal(parsePaintRequest({...raw,description:'ab'}),null);
 assert.equal(parsePaintRequest({...raw,description:'<script>'}),null);
 assert.equal(parsePaintRequest({...raw,requestId:'x'}),null);
});

test('the prompt wraps the player words in the style trigger and the framing the cut-out needs',()=>{
 const prompt=paintPrompt(request);
 assert.equal(prompt.indexOf('PRSTYLE, full body from head to feet, fantasy storyteller, a retired lighthouse keeper with a lantern, '),0);
 assert.match(prompt,/feet visible/);assert.match(prompt,/plain white background/);assert.match(prompt,/no text, no signature$/);
});

test('painting needs the owner to switch it on and a daily allowance',()=>{
 assert.equal(imagesConfigured({}),false);
 assert.equal(imagesConfigured({...env,AI_ENABLE_IMAGES:'yes'}),false);
 assert.equal(imagesConfigured({...env,FAL_LORA_URL:'https://example.com/lora.safetensors'}),false);
 assert.equal(imagesConfigured(env),true);
 assert.equal(imagesPerPlayerDay({}),4);assert.equal(imagesPerPlayerDay({AI_IMAGES_PER_PLAYER_DAY:'40'}),12);assert.equal(imagesPerPlayerDay({AI_IMAGES_PER_PLAYER_DAY:'-1'}),0);
});

test('an unconfigured server never calls the painter',async()=>{
 const {fetcher,calls}=fakeFal();
 await assert.rejects(paintPicture(request,{env:{},ledger:new BudgetLedger(new MemoryLedger()),store:new MemoryImageStore(),fetcher}),{code:'PAINT_UNAVAILABLE'});
 assert.equal(calls.length,0);
});

test('a paint reserves the cost, calls fal with the LoRA for one picture, stores it and is never charged twice',async()=>{
 const {fetcher,calls}=fakeFal(),store=new MemoryImageStore(),ledger=new BudgetLedger(new MemoryLedger());
 const result=await paintPicture(request,{env,ledger,store,fetcher});
 assert.equal(result.images.length,1);assert.match(result.images[0],/^[a-f0-9]{32}$/);
 const fal=calls.find(c=>c.url==='https://fal.run/fal-ai/flux-lora')!;
 assert.equal((fal.init!.headers as Record<string,string>).authorization,'Key fal-test-only');
 const body=JSON.parse(String(fal.init!.body));
 assert.equal(body.loras[0].path,env.FAL_LORA_URL);assert.equal(body.num_images,1);assert.equal(body.enable_safety_checker,true);
 assert.equal((await store.get(result.images[0]))?.contentType,'image/jpeg');
 const again=await paintPicture(request,{env,ledger,store,fetcher});
 assert.deepEqual(again,result);assert.equal(calls.filter(c=>c.url.includes('fal.run')).length,1);
});

test('pictures the safety checker flags, or from anywhere but fal, are dropped',async()=>{
 const flagged=fakeFal({nsfw:[true]});
 await assert.rejects(paintPicture({...request,requestId:'paint-0002'},{env,ledger:new BudgetLedger(new MemoryLedger()),store:new MemoryImageStore(),fetcher:flagged.fetcher}),{code:'PAINT_EMPTY'});
 const none=fakeFal({urls:['https://example.com/a.jpg']});
 await assert.rejects(paintPicture({...request,requestId:'paint-0003'},{env,ledger:new BudgetLedger(new MemoryLedger()),store:new MemoryImageStore(),fetcher:none.fetcher}),{code:'PAINT_EMPTY'});
});

test('a flagged description is refused before anything is reserved or painted',async()=>{
 const {fetcher,calls}=fakeFal({flagged:true}),memory=new MemoryLedger();
 await assert.rejects(paintPicture(request,{env:{...env,OPENAI_API_KEY:'sk-test'},ledger:new BudgetLedger(memory),store:new MemoryImageStore(),fetcher}),{code:'PAINT_REJECTED'});
 assert.ok(!calls.some(c=>c.url.includes('fal.run')));
 assert.deepEqual((await memory.read()).entries,{});
});

test('the shared allowance stops painting when it runs out',async()=>{
 const {fetcher,calls}=fakeFal();
 const ledger=new BudgetLedger(new MemoryLedger(),{campaign:400_000,day:30_000,month:4_000_000,concurrency:8});
 await assert.rejects(paintPicture(request,{env,ledger,store:new MemoryImageStore(),fetcher}),{code:'PAINT_ALLOWANCE'});
 assert.equal(calls.length,0);
});

test('a failed paint keeps its reservation and is not retried blindly',async()=>{
 const {fetcher}=fakeFal({status:500}),memory=new MemoryLedger(),ledger=new BudgetLedger(memory);
 await assert.rejects(paintPicture(request,{env,ledger,store:new MemoryImageStore(),fetcher}),{code:'PAINT_UNAVAILABLE'});
 const receipt=(await memory.read()).entries['paint:paint-0001'];
 assert.equal(receipt.status,'done');assert.equal(receipt.diagnostic?.outcome,'fal 500');
 await assert.rejects(paintPicture(request,{env,ledger,store:new MemoryImageStore(),fetcher}),{code:'PAINT_UNAVAILABLE'});
});

test('a narrator carries a painted portrait only as a server id, and only when painted',()=>{
 const base={name:'Mother Ash',who:'',tone:'hopeful',form:'owl',accessory:'none',color:'#87bdcf'} as const;
 const own=ownGameMaster({...base,mode:'paint',portrait:'a'.repeat(32)})!;
 assert.equal(own.portrait,'a'.repeat(32));
 assert.equal(parseNarrator({...own,portrait:'https://example.com/x.png'}),null);
 assert.equal(ownGameMaster({...base,mode:'paint',portrait:'nope'})!.portrait,undefined);
 assert.equal(ownGameMaster({...base,mode:'draw',portrait:'a'.repeat(32)})!.portrait,undefined,'a drawn Game Master keeps their drawing');
});

test('a description naming a character from another story is refused before anything is reserved',async()=>{
 const {fetcher,calls}=fakeFal(),memory=new MemoryLedger();
 await assert.rejects(paintPicture({...request,description:'Avatar the last airbender'},{env,ledger:new BudgetLedger(memory),store:new MemoryImageStore(),fetcher}),{code:'PAINT_BORROWED'});
 assert.equal(calls.length,0);assert.deepEqual((await memory.read()).entries,{});
});

test('a hero paint request names a class, and the class sets the gear in the prompt',()=>{
 const hero=parsePaintRequest({kind:'hero',name:'Tamsin',heroClass:'ranger',color:'#b2c877',description:'freckles and a fox-fur collar',requestId:'hero-0001'});
 assert.deepEqual(hero,{kind:'hero',heroClass:'ranger',description:'freckles and a fox-fur collar',requestId:'hero-0001'});
 assert.equal(parsePaintRequest({kind:'hero',heroClass:'wizard',description:'freckles',requestId:'hero-0001'}),null);
 assert.equal(parsePaintRequest({kind:'villain',description:'freckles',requestId:'hero-0001'}),null);
 const prompt=heroPaintPrompt(hero as Parameters<typeof heroPaintPrompt>[0]);
 assert.match(prompt,/^PRSTYLE, full body from head to feet, fantasy hero, a ranger in a hood and cloak with a longbow and a quiver, freckles and a fox-fur collar, feet visible/);
});
test('a hero is painted through the same checks and ledger',async()=>{
 const {fetcher,calls}=fakeFal();
 const result=await paintPicture({kind:'hero',heroClass:'mage',description:'a tall mage with a grey beard',requestId:'hero-0002'},{env,ledger:new BudgetLedger(new MemoryLedger()),store:new MemoryImageStore(),fetcher});
 assert.equal(result.images.length,1);
 assert.match(JSON.parse(String(calls.find(c=>c.url.includes('fal.run'))!.init!.body)).prompt,/fantasy hero, a mage in a long robe/);
});
