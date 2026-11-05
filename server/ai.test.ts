import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {BudgetLedger,MemoryLedger,D1Ledger,DEFAULT_CAPS} from './ai-ledger.ts';
import {GameAI} from './ai-service.ts';
import {RoomService} from './rooms.ts';
import {MemoryRoomStore} from './room-store.ts';
import {createGame,applyAction} from '../game/engine.ts';
import {DEFAULT_OPTIONS,HERO_COLORS} from '../game/types.ts';
import {campaignFixture,parseCampaign,narrationFixture,acceptNarration} from '../game/campaign.ts';
import {legalChoices} from '../game/legal-actions.ts';
import {newReplay,appendReplay,reconstructReplay} from '../game/replay.ts';
const players=[{id:'you',name:'Ada',heroClass:'ranger' as const,color:HERO_COLORS[0],bot:false}];
const config={mode:'openai',enabled:'I_ACCEPT_SMALL_API_CHARGES',key:'mock-only-not-a-real-key'};
const game=()=>createGame(players,DEFAULT_OPTIONS);
const reply=(value:unknown)=>Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{input_tokens:100,output_tokens:50}});
test('fixture mode and key-only configuration make zero network calls and zero reservations',async()=>{
 for(const c of [{},{key:'mock'}, {...config,mode:'fixture'},{...config,enabled:''}]){
  const store=new MemoryLedger(),ai=new GameAI(c,new BudgetLedger(store),async()=>{throw new Error('Network must not run');});
  assert.equal((await ai.plan('room',DEFAULT_OPTIONS,players)).source,'fixture');
  assert.equal((await ai.narrate('room',game())).source,'fixture');await ai.choose('room',game(),'you','guard');assert.equal(await ai.speak('room',narrationFixture(game())),null);
  assert.deepEqual((await store.read()).entries,{});
 }
});
test('unavailable durable ledger falls back before any outbound request',async()=>{
 let calls=0;const broken={async read(){throw new Error('missing migration');},async cas(){return false;}};
 const ai=new GameAI(config,new BudgetLedger(broken),async()=>{calls++;throw new Error('Unexpected network');});
 assert.equal((await ai.plan('a',DEFAULT_OPTIONS,players)).source,'fixture');assert.equal((await ai.narrate('a',game())).source,'fixture');assert.equal(calls,0);
});
test('two D1 ledger instances atomically reserve only the budget and deduplicate keys',async()=>{
 const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../drizzle/0001_ai_ledger.sql',import.meta.url),'utf8'));
 const binding={prepare(sql:string){return {async first(){return db.prepare(sql).get()??null;},bind(...values:(string|number)[]){return {async run(){return {meta:{changes:Number(db.prepare(sql).run(...values).changes)}};}};}};}} as unknown as D1Database;
 try{
  const caps={campaign:10,day:10,month:10,concurrency:10},a=new BudgetLedger(new D1Ledger(binding),caps),b=new BudgetLedger(new D1Ledger(binding),caps);
  const results=await Promise.all(Array.from({length:30},(_,i)=>(i%2?a:b).reserve(`key-${i}`,'campaign',3)));
  assert.equal(results.filter(r=>r==='reserved').length,3);
  const state=await new D1Ledger(binding).read();assert.equal(Object.values(state.entries).reduce((s,r)=>s+r.reserved,0),9);
  const key=Object.keys(state.entries)[0];assert.equal(typeof await b.reserve(key,'campaign',3),'object');
 }finally{db.close();}
});
test('campaign/day/month caps, concurrency, storage ceiling and invalid caps fail closed',async()=>{
 const store=new MemoryLedger();let time=Date.parse('2026-11-05');
 const ledger=new BudgetLedger(store,{campaign:5,day:7,month:10,concurrency:1},()=>time);
 assert.equal(await ledger.reserve('a','one',5),'reserved');assert.equal(await ledger.reserve('b','two',2),'blocked');
 await ledger.finish('a',{});assert.equal(await ledger.reserve('c','one',1),'blocked');assert.equal(await ledger.reserve('d','two',3),'blocked');
 assert.equal(await ledger.reserve('b','two',2),'reserved');await ledger.finish('b',{});
 time+=86400000;assert.equal(await ledger.reserve('e','three',4),'blocked');assert.equal(await ledger.reserve('e','three',3),'reserved');await ledger.finish('e',{});
 assert.equal(await ledger.reserve('f','four',1),'blocked');
 assert.equal(await new BudgetLedger(store,{...DEFAULT_CAPS,day:NaN}).reserve('x','x',1),'blocked');
 const large=new MemoryLedger();const ll=new BudgetLedger(large);await ll.reserve('big','big',1);await assert.rejects(ll.finish('big','x'.repeat(600001)),/storage/);assert.equal(await ll.reserve('next','big',1,600_000),'blocked');
});
test('concurrent duplicate generation and restart reuse one persisted receipt',async()=>{
 let calls=0,release!:()=>void;const wait=new Promise<void>(r=>release=r),store=new MemoryLedger();
 const transport:typeof fetch=async()=>{calls++;await wait;return reply({eventId:game().eventSequence,caption:'The party gathers.'});};
 const ai=new GameAI(config,new BudgetLedger(store),transport),first=ai.narrate('a',game());
 while(!calls)await new Promise(r=>setTimeout(r,1));
 await assert.rejects(ai.narrate('a',game()),/already reserved/);release();const accepted=await first;
 const restarted=new GameAI(config,new BudgetLedger(store),transport);assert.deepEqual(await restarted.narrate('a',game()),accepted);assert.equal(calls,1);
 assert.equal(Object.values((await store.read()).entries)[0].usage?.input,100);
});
test('timeouts, HTTP errors, refusals, malformed and stale narration cache fallback without retry',async()=>{
 for(const failure of [()=>{throw new Error('timeout');},()=>new Response('',{status:429}),()=>Response.json({status:'incomplete'}),()=>reply({eventId:-1,caption:'Wrong turn'}),()=>reply({eventId:game().eventSequence,caption:'<script>bad</script>'}),()=>reply({eventId:game().eventSequence,caption:'Fine',hp:999})]){
  let calls=0;const store=new MemoryLedger(),ai=new GameAI(config,new BudgetLedger(store),async()=>{calls++;return failure();});
  assert.equal((await ai.narrate('a',game())).source,'fixture');await ai.narrate('a',game());assert.equal(calls,1);assert.ok(Object.values((await store.read()).entries)[0].reserved>0);
 }
});
test('request schema, model roles, output bounds and no provider tools are explicit',async()=>{
 const bodies:Record<string,unknown>[]=[];
 const ai=new GameAI({...config,planner:'gpt-6.1-terra'},new BudgetLedger(new MemoryLedger()),async(_url,init)=>{bodies.push(JSON.parse(String(init?.body)));return new Response('',{status:500});});
 await ai.plan('a',DEFAULT_OPTIONS,players);await ai.narrate('a',game());
 assert.equal(bodies[0].model,'gpt-6.1-terra');assert.equal(bodies[1].model,'gpt-6-luna');
 for(const b of bodies){assert.equal(b.store,false);assert.equal(b.service_tier,'default');assert.ok(!('tools'in b));assert.ok(Number(b.max_output_tokens)<=1600);}
});
test('seeded recipes preserve human identity, reject unknown components, and never change RNG',()=>{
 const base=campaignFixture(DEFAULT_OPTIONS,players);assert.deepEqual(base,campaignFixture(DEFAULT_OPTIONS,players));
 assert.ok(new Set(Array.from({length:20},(_,i)=>campaignFixture({...DEFAULT_OPTIONS,seed:String(i)},players).premise)).size>1);
 assert.equal(parseCampaign({...base,characters:[]},base),null);
 assert.equal(parseCampaign({title:'Title',premise:'Premise',characters:[{...base.characters[0],heroClass:'dragon'}]},base),null);
 const state=game(),before=structuredClone(state),choices=legalChoices(state,'you');assert.deepEqual(state,before);assert.ok(choices.length>0);
 for(const c of choices)assert.doesNotThrow(()=>applyAction(state,'you',c.action));assert.deepEqual(legalChoices(state,'stranger'),[]);
});
test('accepted generated plan is cached, retains fixed facts, and oversized inputs never call',async()=>{
 const base=campaignFixture(DEFAULT_OPTIONS,players);let calls=0;
 const ai=new GameAI(config,new BudgetLedger(new MemoryLedger()),async()=>{calls++;return reply({title:'The Courier',premise:'A courier seeks the lantern shards.',characters:base.characters.map(c=>({...c,personality:'Thoughtful and loyal'}))});});
 const plan=await ai.plan('a',DEFAULT_OPTIONS,players);assert.equal(plan.source,'openai');assert.equal(plan.title,'The Courier');assert.deepEqual(plan.facts,base.facts);assert.deepEqual(plan.chapters,base.chapters);assert.equal(plan.characters[0].name,'Ada');
 assert.deepEqual(await ai.plan('a',DEFAULT_OPTIONS,players),plan);assert.equal(calls,1);
 const tooLarge=await ai.plan('b',{...DEFAULT_OPTIONS,storyPrompt:'x'.repeat(20000)},players);assert.equal(tooLarge.source,'fixture');assert.equal(calls,1);
});
test('illegal model choice cannot produce an action and ambiguity does not execute',async()=>{
 const state=game(),ai=new GameAI(config,new BudgetLedger(new MemoryLedger()),async()=>reply({choiceId:'invented-action'}));
 assert.equal(await ai.choose('a',state,'you','teleport'),null);assert.deepEqual(state,game());
 const clarify=new GameAI(config,new BudgetLedger(new MemoryLedger()),async()=>reply({choiceId:null}));
 assert.equal(await clarify.choose('b',state,'you','guard'),null);
});
test('narration persists through replay without generation and rejects stale acceptance',()=>{
 const initial=game(),n=narrationFixture(initial),accepted=acceptNarration(initial,n);
 const archive=appendReplay(newReplay(initial),{type:'narration',record:n});assert.deepEqual(reconstructReplay(archive).at(-1),accepted);
 assert.deepEqual(acceptNarration(accepted,n),accepted);assert.throws(()=>acceptNarration(applyAction(initial,'you',{type:'guard'}),n),/moved on/);
});
test('room narration authenticates host, persists once, and cannot overwrite concurrent game actions',async()=>{
 const store=new MemoryRoomStore(),service=new RoomService(store);
 const {session,room}=await service.create({name:'Ada',heroClass:'ranger',options:{...DEFAULT_OPTIONS,companions:0}});
 const started=await service.command(room.code,session.token,{requestId:'start-ai-test',version:room.version,command:{type:'start'}});assert.ok('room'in started);
 const version=started.room.version;
 const narrated=await service.command(room.code,session.token,{requestId:'narrate-test',version,command:{type:'narrate'}});assert.ok('room'in narrated);
 assert.equal(narrated.room.game!.story!.narrations.length,1);
 assert.deepEqual(reconstructReplay(narrated.room.replay!).at(-1),narrated.room.game);
 await assert.rejects(service.assist(room.code,session.token,{version,text:'guard'}),/changed/);
 await assert.rejects(service.assist(room.code,'wrong-token',{version:narrated.room.version,text:'guard'}),/seat/);
});
test('an in-flight narration cannot overwrite an action committed at a newer room version',async()=>{
 let release!:()=>void,entered!:()=>void;const wait=new Promise<void>(r=>release=r),started=new Promise<void>(r=>entered=r);
 const store=new MemoryRoomStore(),base=new RoomService(store),created=await base.create({name:'Ada',heroClass:'ranger',options:{...DEFAULT_OPTIONS,companions:0}});
 const {session}=created;const begin=await base.command(session.code,session.token,{version:1,requestId:'start-race',command:{type:'start'}});assert.ok('room'in begin);
 const ai=new GameAI(config,new BudgetLedger(new MemoryLedger()),async()=>{entered();await wait;return reply({eventId:begin.room.game!.eventSequence,caption:'The party gathers.'});});
 const slow=new RoomService(store,Date.now,ai);
 const pending=slow.command(session.code,session.token,{version:begin.room.version,requestId:'narrate-race',command:{type:'narrate'}});
 await started;
 const moved=await base.command(session.code,session.token,{version:begin.room.version,requestId:'guard-race',command:{type:'action',action:{type:'guard'}}});assert.ok('room'in moved);
 release();await assert.rejects(pending,/changed/);
 const final=await base.get(session.code,session.token);assert.ok('room'in final);assert.deepEqual(final.room.game,moved.room.game);
});

test('safe provider diagnostics distinguish auth, access, quota, rate and schema failures without leaking messages',async()=>{
 for(const [status,code,outcome] of [[401,'invalid_api_key','authentication'],[403,'permission_denied','access_denied'],[404,'model_not_found','access_denied'],[429,'insufficient_quota','quota_exhausted'],[429,'rate_limit_exceeded','rate_limited'],[400,'invalid_parameter','invalid_request']] as const){
  const store=new MemoryLedger();let calls=0;
  const ai=new GameAI(config,new BudgetLedger(store),async()=>{calls++;return Response.json({error:{code,message:'sensitive provider echo'}},{status});});
  await ai.narrate('diagnostics',game());await ai.narrate('diagnostics',game());
  const state=await store.read(),receipt=Object.values(state.entries)[0];
  assert.deepEqual(receipt.diagnostic,{outcome,httpStatus:status});assert.equal(calls,1);assert.ok(receipt.reserved>0);assert.ok(!JSON.stringify(state).includes('sensitive provider echo'));
 }
});
test('rejected generated text still records reported usage and retains its full reservation',async()=>{
 const store=new MemoryLedger(),ai=new GameAI(config,new BudgetLedger(store),async()=>reply({eventId:-1,caption:'Stale'}));
 assert.equal((await ai.narrate('usage',game())).source,'fixture');
 const receipt=Object.values((await store.read()).entries)[0];assert.deepEqual(receipt.usage,{input:100,output:50});assert.equal(receipt.diagnostic?.outcome,'invalid_response');assert.ok(receipt.reserved>0);
});
