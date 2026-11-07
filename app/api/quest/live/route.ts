import {env,waitUntil} from 'cloudflare:workers';
import {aiAccessAllowed} from '../../../../server/ai-access';
import {aiCaps} from '../../../../server/ai-config';
import {BudgetLedger,D1Ledger} from '../../../../server/ai-ledger';
import {json,throttle} from '../../../../server/http';
import {attachLiveRelay} from '../../../../server/live-relay';

export const dynamic='force-dynamic';
export async function GET(request:Request){
 const origin=new URL(request.url).origin;
 if(request.headers.get('origin')!==origin)return json({error:'Open voice from this game’s own page.'},403);
 if(request.headers.get('upgrade')?.toLowerCase()!=='websocket')return json({error:'A live connection is required.'},426);
 if(!env.DB||env.AI_ENABLE_AUDIO!=='I_ACCEPT_PAID_AUDIO'||!await aiAccessAllowed(request,env))return json({error:'Unlock team AI to use live voice.'},403);
 try{await throttle(request,'creator');}catch{return json({error:'Please wait a moment before starting voice again.'},429);}
 const pair=new WebSocketPair();
 attachLiveRelay(pair[1],{key:env.OPENAI_API_KEY!,ledger:new BudgetLedger(new D1Ledger(env.DB),aiCaps(env)),background:waitUntil});
 return new Response(null,{status:101,webSocket:pair[0]});
}
