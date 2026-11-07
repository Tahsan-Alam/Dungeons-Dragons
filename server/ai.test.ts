import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {BudgetLedger,MemoryLedger,D1Ledger,DEFAULT_CAPS} from './ai-ledger.ts';
import {GameAI} from './ai-service.ts';
import {RoomService} from './rooms.ts';
import {MemoryRoomStore} from './room-store.ts';
import {createGame,applyAction,getReachable,getValidTargets,hasLineOfSight,encounterCleared} from '../game/engine.ts';
import type {GameAction,GameState} from '../game/types.ts';
import {DEFAULT_OPTIONS,HERO_COLORS} from '../game/types.ts';
import {campaignFixture,installCampaign,parseCampaign,narrationFixture,acceptNarration,applyStoryDirection,guidanceFixture,storyGoal} from '../game/campaign.ts';
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
test('planner validation rejects renamed human recipes while allowing generated companion names',async()=>{
 const party=[...players,{id:'friend',name:'Fern',heroClass:'cleric' as const,color:HERO_COLORS[1],bot:true}],base=campaignFixture(DEFAULT_OPTIONS,party);let calls=0;
 const ai=new GameAI(config,new BudgetLedger(new MemoryLedger()),async()=>{calls++;return reply({title:'The Beacon',premise:'Friends recover the lantern shards.',resolution:'The beacon welcomes everyone home.',characters:base.characters.map(character=>({...character,name:character.id==='you'&&calls===1?'Changed human':character.id==='friend'?'Clover':character.name}))});});
 const rejected=await ai.plan('rename-human',DEFAULT_OPTIONS,party);assert.equal(rejected.source,'fixture');assert.equal(rejected.characters[0].name,'Ada');
 const installed=installCampaign(createGame(party,DEFAULT_OPTIONS),rejected);assert.equal(installed.actors.find(actor=>actor.playerId==='you')!.name,'Ada');assert.equal(installed.story!.campaign.characters[0].name,'Ada');
 const accepted=await ai.plan('rename-companion',DEFAULT_OPTIONS,party);assert.equal(accepted.source,'openai');assert.equal(accepted.characters[0].name,'Ada');assert.equal(accepted.characters[1].name,'Clover');assert.equal(calls,2);
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

test('revoked seats cannot receive in-flight suggestions or speech, even without a version change',async()=>{
 for(const audio of [false,true]){
  const store=new MemoryRoomStore(),base=new RoomService(store);
  const {session,room}=await base.create({name:'Ada',heroClass:'ranger',options:{...DEFAULT_OPTIONS,companions:0}});
  const begun=await base.command(room.code,session.token,{version:room.version,requestId:'begin-revoke',command:{type:'start'}});assert.ok('room'in begun);
  const narrated=await base.command(room.code,session.token,{version:begun.room.version,requestId:'caption-revoke',command:{type:'narrate'}});assert.ok('room'in narrated);
  let entered!:()=>void,release!:()=>void;const started=new Promise<void>(r=>entered=r),wait=new Promise<void>(r=>release=r);
  const ai={async choose(){entered();await wait;return null;},async speak(){entered();await wait;return 'data:audio/wav;base64,fixture';}} as unknown as GameAI;
  const pending=new RoomService(store,Date.now,ai).assist(room.code,session.token,{version:narrated.room.version,audio,text:'guard'});
  await started;const record=(await store.read(room.code))!;delete record.tokenHashes[session.playerId];const previous=record.revision;record.revision++;assert.ok(await store.compareAndSwap(room.code,previous,record));
  release();await assert.rejects(pending,(e:any)=>e.code==='UNAUTHORIZED');
 }
});

test('explicit player opt-out prevents planning, narration, action interpretation and guidance spending',async()=>{
 const store=new MemoryLedger(),ai=new GameAI(config,new BudgetLedger(store),async()=>{throw new Error('No paid request should run');});
 const options={...DEFAULT_OPTIONS,aiEnabled:false},state=createGame(players,options);
 assert.equal((await ai.plan('opt-out',options,players)).source,'fixture');
 assert.equal((await ai.narrate('opt-out',state)).source,'fixture');
 await ai.choose('opt-out',state,'you','guard');assert.equal((await ai.guide('opt-out',state,'you','How do I play?')).source,'fixture');
 assert.deepEqual((await store.read()).entries,{});
});

test('AI guidance carries story memory and direction, caches identical questions and never mutates the game',async()=>{
 const state=applyStoryDirection(game(),'Make the woods hopeful and full of curious foxes.');
 state.story!.memories=[{chapter:1,title:'Earlier crossing',summary:'Ada protected a courier.'}];
 const before=structuredClone(state);let calls=0,payload:any;
 const ai=new GameAI(config,new BudgetLedger(new MemoryLedger()),async(_url,init)=>{calls++;payload=JSON.parse(String(init?.body));return reply({reply:'Move toward the guardians, then choose a reachable target.'});});
 const result=await ai.guide('guide',state,'you','What next?');assert.equal(result.source,'openai');
 assert.deepEqual(await ai.guide('guide',state,'you','What next?'),result);assert.equal(calls,1);
 const context=JSON.parse(payload.input);assert.match(context.memories[0].summary,/courier/);assert.match(context.direction.prompt,/foxes/);assert.equal(context.totalChapters,3);
 assert.deepEqual(state,before);assert.ok(!('tools' in payload));
});

test('guidance and narration do not receive the future payoff before it becomes a committed event',async()=>{
 const state=game(),payoff='The secret beacon brings the missing keeper home.';state.story!.campaign.resolution=payoff;
 const inputs:string[]=[];
 const ai=new GameAI(config,new BudgetLedger(new MemoryLedger()),async(_url,init)=>{const body=JSON.parse(String(init?.body));inputs.push(body.input);const input=JSON.parse(body.input);return reply(body.text.format.name==='guide'?{reply:'Follow the highlighted path.'}:{eventId:input.eventId,caption:'Your party follows the lantern light.'});});
 await ai.guide('no-spoilers',state,'you','What next?');await ai.narrate('no-spoilers',state);assert.equal(inputs.length,2);assert.ok(inputs.every(input=>!input.includes(payoff)));assert.equal(state.story!.campaign.resolution,payoff);
 state.status='victory';state.eventSequence++;state.events.push({id:state.eventSequence,kind:'story',text:payoff});await ai.narrate('no-spoilers',state);assert.ok(inputs.at(-1)!.includes(payoff));assert.equal(JSON.parse(inputs.at(-1)!).campaign.resolution,undefined);
});

test('invalid guidance retains its reservation and falls back to grounded next-step instructions',async()=>{
 const store=new MemoryLedger();let calls=0;
 const ai=new GameAI(config,new BudgetLedger(store),async()=>{calls++;return reply({reply:'<script>teleport</script>',hp:100});});
 const first=await ai.guide('invalid-guide',game(),'you','What next?');assert.equal(first.source,'fixture');assert.equal(first.reply,guidanceFixture(game(),'What next?','you'));
 await ai.guide('invalid-guide',game(),'you','What next?');assert.equal(calls,1);assert.ok(Object.values((await store.read()).entries)[0].reserved>0);
});

test('only host steering changes the ending; guidance works outside a turn and steering survives service restart/replay',async()=>{
 const store=new MemoryRoomStore(),service=new RoomService(store);
 const host=await service.create({name:'Ada',heroClass:'ranger',options:{...DEFAULT_OPTIONS,companions:0,duration:'long',aiEnabled:false}});
 const guest=await service.join({code:host.room.code,name:'Fern',heroClass:'mage'});
 const ready=await service.command(guest.room.code,guest.session.token,{version:guest.room.version,requestId:'guest-ready-story',command:{type:'ready',ready:true}});assert.ok('room'in ready);
 const started=await service.command(host.room.code,host.session.token,{version:ready.room.version,requestId:'host-begin-story',command:{type:'start'}});assert.ok('room'in started);
 const idlePlayer=started.room.game!.actors.find(a=>!a.bot&&!a.enemy&&a.id!==started.room.game!.activeActorId)!;
 const seat=idlePlayer.playerId===host.session.playerId?host.session:guest.session;
 const help=await service.assist(host.room.code,seat.token,{version:started.room.version,guidance:true,text:'What do I do next?'});
 assert.ok('reply'in help);assert.match(help.reply!,/turn/);
 await assert.rejects(service.command(host.room.code,guest.session.token,{version:started.room.version,requestId:'guest-steer-story',command:{type:'steer',text:'End after this chapter.'}}),(e:any)=>e.code==='HOST_ONLY');
 const directed=await service.command(host.room.code,host.session.token,{version:started.room.version,requestId:'host-steer-story',command:{type:'steer',text:'End after this chapter.'}});assert.ok('room'in directed);
 assert.equal(storyGoal(directed.room.game!),1);assert.equal(directed.room.game!.status,'playing');assert.equal(directed.room.game!.relics,0);
 const resumed=await new RoomService(store).get(host.room.code,host.session.token);assert.ok('room'in resumed);assert.equal(storyGoal(resumed.room.game!),1);
 assert.deepEqual(reconstructReplay(directed.room.replay!).at(-1),directed.room.game);
 const unchanged=structuredClone(directed.room.game);await service.assist(host.room.code,host.session.token,{version:directed.room.version,guidance:true,text:'How can we end soon?'});
 const latest=await service.get(host.room.code,host.session.token);assert.ok('room'in latest);assert.deepEqual(latest.room.game,unchanged);
});

test('AI-enabled room saves exactly one automatic telling on start and chapter advance, with exact replay',async()=>{
 let tellings=0;
 const ai={async plan(_scope:string,options:typeof DEFAULT_OPTIONS,heroes:typeof players){return campaignFixture(options,heroes);},async narrate(_scope:string,state:GameState){tellings++;return narrationFixture(state);}} as unknown as GameAI;
 const service=new RoomService(new MemoryRoomStore(),Date.now,ai),created=await service.create({name:'Ada',heroClass:'ranger',options:{...DEFAULT_OPTIONS,seed:'automatic-chapter-story',companions:3,aiEnabled:true,duration:'standard'}});
 const started=await service.command(created.room.code,created.session.token,{requestId:'automatic-story-start',version:created.room.version,command:{type:'start'}});assert.ok('room'in started);
 let room=started.room,steps=0;assert.equal(tellings,1);assert.equal(room.game!.story!.narrations.length,1);assert.deepEqual(reconstructReplay(room.replay!).at(-1),room.game);
 const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
 while(room.game!.scene===0&&room.game!.status==='playing'&&steps++<350){
  const state=room.game!,actor=state.actors.find(a=>a.id===state.activeActorId)!;
  let action:GameAction={type:'end'};
  const enemies=state.actors.filter(a=>a.enemy&&a.hp>0&&!a.defeated);
  if(encounterCleared(state)){
   const goal=state.chest.opened?state.exit:state.chest;
   if(distance(actor,goal)<=1)action={type:state.chest.opened?'advance':'interact'};
   else{const move=getReachable(state,actor).sort((a,b)=>distance(a,goal)-distance(b,goal))[0];if(move&&distance(move,goal)<distance(actor,goal))action={type:'move',...move};}
  }else if(!actor.actionUsed){
   const abilities=getValidTargets(state,actor,true).sort((a,b)=>a.hp-b.hp),targets=getValidTargets(state,actor).sort((a,b)=>a.hp-b.hp);
   if(actor.hp<actor.maxHp*.4&&actor.potions>0)action={type:'potion'};
   else if(abilities.length)action={type:'ability',targetId:abilities[0].id};
   else if(targets.length)action={type:'attack',targetId:targets[0].id};
   else{
    const enemy=enemies.sort((a,b)=>distance(actor,a)-distance(actor,b))[0];
    const score=(p:{x:number;y:number})=>Math.max(0,distance(p,enemy)-5)*100+(hasLineOfSight(state,p,enemy)?0:20)+distance(actor,p);
    const move=enemy&&getReachable(state,actor).sort((a,b)=>score(a)-score(b))[0];action=move&&score(move)<score(actor)?{type:'move',...move}:{type:'guard'};
   }
  }
  const result=await service.command(room.code,created.session.token,{requestId:`automatic-story-step-${steps}`,version:room.version,command:{type:'action',action}});assert.ok('room'in result);room=result.room;
 }
 assert.equal(room.game!.scene,1);assert.equal(tellings,2);assert.equal(room.game!.story!.narrations.length,2);assert.equal(room.game!.story!.memories!.length,1);
 assert.deepEqual(reconstructReplay(room.replay!).at(-1),room.game);
 await service.get(room.code,created.session.token);await service.get(room.code,created.session.token);assert.equal(tellings,2,'Polling cannot generate another telling');
});
