import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GameAI} from './ai-service.ts';
import {BudgetLedger,MemoryLedger} from './ai-ledger.ts';
import {AETHER,creationFixture} from '../game/creation.ts';
import type {CreationRequest} from '../game/creation.ts';
import {DEFAULT_OPTIONS} from '../game/types.ts';

const input:CreationRequest={action:'narrators',scope:'creation-test',requestId:'first',enabled:true,prompt:'A wandering library on a moon of silver trees.',message:'A gentle but sarcastic guide',traits:{personality:['Sarcastic']},history:[]};
const config={mode:'openai',enabled:'I_ACCEPT_SMALL_API_CHARGES',key:'mock-only'};
const envelope=(result:unknown)=>Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(result)}]}],usage:{input_tokens:100,output_tokens:200}});
test('creation uses the real structured adapter, bounded reservations, deduplication and conversation context',async()=>{
 const store=new MemoryLedger();let calls=0;
 const ai=new GameAI(config,new BudgetLedger(store),async(_url,options)=>{
  calls++;const body=JSON.parse(String(options?.body)),context=JSON.parse(body.input);assert.equal(body.model,'gpt-6-luna');assert.equal(body.text.format.strict,true);assert.equal(body.max_output_tokens,1600);assert.match(context.prompt,/wandering library/);assert.equal(context.history[0].text,'Less cruel, more playful.');
  assert.ok(Object.values((await store.read()).entries)[0].reserved>0);
  const result=creationFixture(input);return envelope({reply:'Three guides for your library.',narrators:result.narrators});
 });
 const request={...input,history:[{role:'player' as const,text:'Less cruel, more playful.'}]};
 const first=await ai.createDraft(request);assert.equal(first.source,'openai');assert.equal(first.narrators!.length,3);assert.deepEqual(await ai.createDraft(request),first);assert.equal(calls,1);
 const receipts=Object.values((await store.read()).entries);assert.equal(receipts.length,1);assert.equal(receipts[0].diagnostic!.outcome,'accepted');
});
test('malformed provider recipes and disabled AI return safe drafts without installing arbitrary assets',async()=>{
 let calls=0;const transport:typeof fetch=async()=>{calls++;return envelope({reply:'Oops',narrators:[{name:'Unsafe',model:'dragon',color:'<svg>'}]});};
 const ai=new GameAI(config,new BudgetLedger(new MemoryLedger()),transport);assert.equal((await ai.createDraft(input)).source,'fixture');assert.equal(calls,1);
 const disabled=new GameAI({},new BudgetLedger(new MemoryLedger()),transport);assert.equal((await disabled.createDraft({...input,enabled:false})).source,'fixture');assert.equal(calls,1);
});
test('reviewed creation is installed without a second planning call that could overwrite edits',async()=>{
 let calls=0;const narrator=creationFixture(input).narrators![0],story=creationFixture({...input,action:'story',narrator}).story!,hero=creationFixture({...input,action:'heroes',narrator,story}).heroes![0];story.synopsis='My edited synopsis, exactly as approved.';
 const ai=new GameAI(config,new BudgetLedger(new MemoryLedger()),async()=>{calls++;throw Error('Must not plan again');});
 const campaign=await ai.plan('room',{...DEFAULT_OPTIONS,creation:{narrator,story,hero}},[{...hero,id:'you',bot:false}]);assert.equal(campaign.premise,story.synopsis);assert.equal(calls,0);
});
test('Responses commentary is separate from the validated final draft; missing or competing finals fail closed',async()=>{
 const draft=creationFixture(input),text=JSON.stringify({reply:'Three guides.',narrators:draft.narrators});
 const message=(phase:string,value:string)=>({type:'message',role:'assistant',phase,content:[{type:'output_text',text:value}]});
 const response=(output:unknown[])=>Response.json({status:'completed',output});
 const ai=new GameAI(config,new BudgetLedger(new MemoryLedger()),async()=>response([message('commentary','I will design three guides.'),message('final_answer',text)]));
 assert.equal((await ai.createDraft(input)).source,'openai');
 for(const outputs of [[message('commentary',text)],[message('final_answer',text),message('final_answer',text)]]){
  const unsafe=new GameAI(config,new BudgetLedger(new MemoryLedger()),async()=>response(outputs));assert.equal((await unsafe.createDraft(input)).source,'fixture');
 }
});

test('guide adapter supplies draft context and only returns a version-matched proposal',async()=>{
 const guide:CreationRequest={...input,action:'guide',focus:'narrator',draftVersion:7,narrator:AETHER,message:'Make a sarcastic celestial cat with glasses.'};
 const store=new MemoryLedger();let calls=0;
 const ai=new GameAI(config,new BudgetLedger(store),async(_url,options)=>{
  calls++;const payload=JSON.parse(String(options?.body)),context=JSON.parse(payload.input);
  assert.equal(context.draftVersion,7);assert.equal(context.narrator.name,'Aether');assert.match(context.task,/explicit confirmation/);
  assert.deepEqual(payload.text.format.schema.properties.guide.properties.proposal.anyOf[0].properties.baseVersion.enum,[7]);
  return envelope({reply:'A dry wit, a celestial coat, and spectacles. Shall we keep this?',guide:{proposal:{baseVersion:7,narrator:{...AETHER,name:'Nyx',personality:['Sarcastic'],avatar:{form:'cat',accessory:'glasses'},voice:'willow'},story:null,hero:null}}});
 });
 const result=await ai.createDraft(guide);assert.equal(result.source,'openai');assert.equal(result.guide!.proposal!.narrator!.avatar!.form,'cat');assert.equal(guide.narrator!.name,'Aether');
 assert.deepEqual(await ai.createDraft(guide),result);assert.equal(calls,1);
 const bad=new GameAI(config,new BudgetLedger(new MemoryLedger()),async()=>envelope({reply:'Already applied.',guide:{proposal:{baseVersion:6,narrator:AETHER,story:null,hero:null}}}));
 assert.equal((await bad.createDraft(guide)).source,'fixture');
});

test('guide replies use the selected confirmed speaker while proposed edits target the separate draft',async()=>{
 const target={...AETHER,name:'Nyx',personality:['Sarcastic'],avatar:{form:'cat' as const,accessory:'glasses' as const},voice:'willow' as const};
 const guide:CreationRequest={...input,action:'guide',focus:'narrator',draftVersion:8,narrator:target,guideNarrator:AETHER,message:'Keep the cat and make it curious.'};
 const received:string[]=[];
 const ai=new GameAI(config,new BudgetLedger(new MemoryLedger()),async(_url,options)=>{
  const payload=JSON.parse(String(options?.body)),context=JSON.parse(payload.input);received.push(context.speaker.name);
  assert.equal(context.narrator.name,'Nyx');assert.equal(context.narrator.avatar.form,'cat');assert.match(payload.instructions,/editable narrator profile may be unconfirmed/);assert.match(context.task,/not your speaking identity/);
  return envelope({reply:'Here is a curious variation. Shall we keep it?',guide:{proposal:{baseVersion:8,narrator:{...target,personality:['Curious']},story:null,hero:null}}});
 });
 const withGuide=await ai.createDraft(guide);assert.equal(withGuide.source,'openai');assert.equal(withGuide.guide!.proposal!.narrator!.name,'Nyx');assert.equal(withGuide.guide!.proposal!.narrator!.voice,'willow');
 await ai.createDraft({...guide,requestId:'selected-narrator',guideNarrator:target});
 await ai.createDraft({...guide,requestId:'legacy-guide',guideNarrator:undefined});
 assert.deepEqual(received,['Aether','Nyx','Aether']);assert.equal(guide.narrator!.personality[0],'Sarcastic');
});
