import {env} from 'cloudflare:workers';
import {handle,throttle} from '../../../../server/http';
import {RoomError} from '../../../../server/rooms';
import {BudgetLedger,D1Ledger} from '../../../../server/ai-ledger';
import {aiAccessAllowed} from '../../../../server/ai-access';
import {aiCaps} from '../../../../server/ai-config';
import {transcribeQuest} from '../../../../server/ai-dictation';
export async function POST(request:Request){
 return handle(async()=>{
  if(request.headers.get('origin')!==new URL(request.url).origin)throw new RoomError('Use this game’s recording button.',403);
  if(!env.DB||env.AI_MODE!=='openai'||env.AI_ENABLE_PAID!=='I_ACCEPT_SMALL_API_CHARGES'||!env.OPENAI_API_KEY)throw new RoomError('AI dictation is unavailable. You can type your quest.',503);
  if(!await aiAccessAllowed(request,env))throw new RoomError('Unlock team AI in Settings → AI before dictating.',403,'AI_PASSWORD_REQUIRED');
  await throttle(request,'create');
  if(request.headers.get('content-type')!=='audio/wav'||Number(request.headers.get('content-length'))>1920044)throw new RoomError('Record up to 60 seconds.',413);
  const reader=request.body?.getReader();if(!reader)throw new RoomError('No recording received.');
  const chunks:Uint8Array[]=[];let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1920044){await reader.cancel();throw new RoomError('Record up to 60 seconds.',413);}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  const ledger=new BudgetLedger(new D1Ledger(env.DB),aiCaps(env));
  try{return await transcribeQuest(bytes,env.OPENAI_API_KEY,ledger,fetch,request.signal);}catch(error){throw new RoomError(error instanceof Error?error.message:'Dictation unavailable.',503);}
 });
}
