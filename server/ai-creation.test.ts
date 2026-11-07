import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GameAI} from './ai-service.ts';
import {BudgetLedger,MemoryLedger} from './ai-ledger.ts';
import {creationFixture} from '../game/creation.ts';
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
