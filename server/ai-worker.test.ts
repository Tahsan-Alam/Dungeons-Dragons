import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare,createFetchMock} from 'miniflare';

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
