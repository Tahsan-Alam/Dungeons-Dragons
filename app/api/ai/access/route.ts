import {env} from 'cloudflare:workers';
import {body,handle,throttle} from '../../../../server/http.ts';
import {aiAccessState,paidAvailable,passwordRequired,unlockAI,lockAI,setAIEnabled} from '../../../../server/ai-access.ts';
import {RoomError} from '../../../../server/rooms.ts';
import {aiCaps} from '../../../../server/ai-config.ts';
export const dynamic='force-dynamic';
const status=(state:{remembered:boolean;enabled:boolean})=>({available:paidAvailable(env),passwordRequired:passwordRequired(env),...state,unlocked:paidAvailable(env)&&state.enabled,audioAvailable:paidAvailable(env)&&env.AI_ENABLE_AUDIO==='I_ACCEPT_PAID_AUDIO',limits:aiCaps(env)});
export async function GET(request:Request){return handle(async()=>{await throttle(request,'read');return status(await aiAccessState(request,env));});}
export async function POST(request:Request){
 let setCookie:string|undefined;
 const response=await handle(async()=>{
  const input=await body(request);
  if(input.action==='forget'){await throttle(request,'command');if(!passwordRequired(env))throw new RoomError('No password is saved. Choose Disable AI to turn it off.');setCookie=await lockAI(request,env);return status({remembered:false,enabled:false});}
  if(input.action==='enable'||input.action==='disable'){await throttle(request,'command');setCookie=await setAIEnabled(request,env,input.action==='enable');return status(setCookie?{remembered:true,enabled:input.action==='enable'}:await aiAccessState(request,env));}
  if(input.action!=='unlock')throw new RoomError('Choose an AI access action.');
  await throttle(request,'unlock');
  setCookie=await unlockAI(request,env,input.password);return status({remembered:true,enabled:true});
 });
 if(setCookie)response.headers.set('Set-Cookie',setCookie);
 return response;
}
