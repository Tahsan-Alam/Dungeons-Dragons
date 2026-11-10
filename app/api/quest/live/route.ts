import {env,waitUntil} from 'cloudflare:workers';
import {aiAccessState,paidAvailable} from '../../../../server/ai-access';
import {aiCaps} from '../../../../server/ai-config';
import {BudgetLedger,D1Ledger} from '../../../../server/ai-ledger';
import {json,throttle} from '../../../../server/http';
import {attachLiveRelay} from '../../../../server/live-relay';

export const dynamic='force-dynamic';
export async function GET(request:Request){
 const origin=new URL(request.url).origin;
 const upgrade=request.headers.get('upgrade')?.toLowerCase()==='websocket',sentOrigin=request.headers.get('origin');
 if((upgrade&&sentOrigin!==origin)||(sentOrigin&&sentOrigin!==origin))return json({error:'Open voice from this game’s own page.'},403);
 if(!paidAvailable(env))return json({error:'AI voice is unavailable on this server. You can keep creating with text.',code:'AI_UNAVAILABLE'},503);
 const access=await aiAccessState(request,env);
 if(!access.enabled)return json({error:access.remembered?'Enable AI in settings before starting a voice call.':'Unlock AI in settings before starting a voice call.',code:access.remembered?'AI_DISABLED':'AI_PASSWORD_REQUIRED'},403);
 if(env.AI_ENABLE_AUDIO!=='I_ACCEPT_PAID_AUDIO')return json({error:'Voice is switched off by the site owner. Text AI is still available.',code:'AI_AUDIO_DISABLED'},503);
 // Browser WebSocket errors hide HTTP bodies. A free preflight gives the player
 // an actionable error before asking for a microphone or reserving any money.
 if(!upgrade){try{await throttle(request,'read');}catch{return json({error:'Please wait a moment before checking voice again.'},429);}return json({ready:true});}
 try{await throttle(request,'creator');}catch{return json({error:'Please wait a moment before starting voice again.'},429);}
 const pair=new WebSocketPair();
 attachLiveRelay(pair[1],{key:env.OPENAI_API_KEY!,ledger:new BudgetLedger(new D1Ledger(env.DB!),aiCaps(env)),background:waitUntil});
 return new Response(null,{status:101,webSocket:pair[0]});
}
