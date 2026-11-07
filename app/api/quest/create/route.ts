import {env} from 'cloudflare:workers';
import {body,handle,throttle} from '../../../../server/http';
import {RoomError} from '../../../../server/rooms';
import {aiAccessAllowed} from '../../../../server/ai-access';
import {aiCaps} from '../../../../server/ai-config';
import {BudgetLedger,D1Ledger,MemoryLedger} from '../../../../server/ai-ledger';
import {GameAI} from '../../../../server/ai-service';
import {parseCreationRequest} from '../../../../game/creation';

export async function POST(request:Request){
 return handle(async()=>{
  const input=parseCreationRequest(await body(request));
  if(!input)throw new RoomError('Check your creation details and keep each message within 400 characters.');
  if(env.DB)await throttle(request,'creator');
  const allowed=input.enabled&&await aiAccessAllowed(request,env);
  const ai=new GameAI({mode:env.AI_MODE,enabled:allowed?env.AI_ENABLE_PAID:'DISABLED',key:env.OPENAI_API_KEY,audio:env.AI_ENABLE_AUDIO},new BudgetLedger(env.DB?new D1Ledger(env.DB):new MemoryLedger(),aiCaps(env)));
  const result=await ai.createDraft(input,request.signal);
  if(allowed&&result.source==='fixture')throw new RoomError('Live generation is unavailable or the shared allowance is reached. Your draft is unchanged. Try again or use built-in drafts.',503,'CREATION_UNAVAILABLE');
  return result;
 });
}
