import { env } from 'cloudflare:workers';
import { D1RoomStore } from './room-store.ts';
import { RoomError, RoomService } from './rooms.ts';
import { D1RateLimiter } from './rate-limit.ts';
import type { RateCategory } from './rate-limit.ts';
import {GameAI} from './ai-service.ts';
import {BudgetLedger,D1Ledger} from './ai-ledger.ts';
import {aiCaps} from './ai-config.ts';

export function service(allowPaid=false) {
  if(!env.DB)throw new RoomError('Online rooms are temporarily unavailable. Solo adventures still work.',503,'DATABASE_UNAVAILABLE');
  const ai=new GameAI({mode:env.AI_MODE,enabled:allowPaid?env.AI_ENABLE_PAID:'DISABLED',key:env.OPENAI_API_KEY,audio:env.AI_ENABLE_AUDIO,planner:env.AI_PLANNER_MODEL},new BudgetLedger(new D1Ledger(env.DB),aiCaps(env)));
  return new RoomService(new D1RoomStore(env.DB),Date.now,ai);
}
export async function throttle(request:Request,category:RateCategory,token?:string) {
  if(!env.DB)throw new RoomError('Online rooms are temporarily unavailable. Solo adventures still work.',503,'DATABASE_UNAVAILABLE');
  const limiter=new D1RateLimiter(env.DB);
  // Cloudflare supplies/overwrites this header at the trusted edge. Loopback
  // previews share a conservative fallback bucket; no raw address is persisted.
  const identity=request.headers.get('cf-connecting-ip')??'local-preview';
  if(!await limiter.consume(category,identity))throw new RoomError('Too many requests. Please wait a minute and try again.',429,'RATE_LIMITED');
  if(category==='unlock'&&!await limiter.consume('unlock','all-browsers',Date.now(),30))throw new RoomError('Too many unlock attempts. Please wait a minute and try again.',429,'RATE_LIMITED');
  if(category==='command'&&token&&!await limiter.consume(category,`seat:${token}`,Date.now(),120))throw new RoomError('Please slow down for a moment before trying another action.',429,'RATE_LIMITED');
}
export function bearer(request:Request) {
  const value=request.headers.get('authorization');
  if(!value || !/^Bearer [a-f0-9]{64}$/.test(value))throw new RoomError('Reconnect to your room to continue.',401,'UNAUTHORIZED');
  return value.slice(7);
}
export async function body(request:Request):Promise<Record<string,unknown>> {
  const origin=request.headers.get('origin');
  if(origin && origin!==new URL(request.url).origin)throw new RoomError('Use this game’s own page to make changes.',403,'ORIGIN_MISMATCH');
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new RoomError('Send this request as JSON.',415,'INVALID_CONTENT_TYPE');
  if(Number(request.headers.get('content-length')??0)>8192)throw new RoomError('This request is too large.',413,'BODY_TOO_LARGE');
  if(!request.body)throw new RoomError('The request is empty.');
  const reader=request.body.getReader();const chunks:Uint8Array[]=[];let size=0;
  for(;;) {
    const part=await reader.read();if(part.done)break;
    size+=part.value.length;
    if(size>8192) {await reader.cancel();throw new RoomError('This request is too large.',413,'BODY_TOO_LARGE');}
    chunks.push(part.value);
  }
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  try {
    const result=JSON.parse(new TextDecoder().decode(bytes));
    if(!result || typeof result!=='object' || Array.isArray(result))throw new Error('object required');
    return result;
  }catch{throw new RoomError('The request could not be read.');}
}
export function json(value:unknown,status=200) {
  return Response.json(value,{status,headers:{'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff',...(status===429?{'Retry-After':'60'}:{})}});
}
export async function handle(action:()=>Promise<unknown>) {
  try{return json(await action());}
  catch(error) {
    if(error instanceof RoomError)return json({error:error.message,code:error.code,...(error.room?{room:error.room}:{})},error.status);
    // Do not include raw database errors or authentication material in responses.
    console.error('Room operation failed:',error instanceof Error?error.name:'unknown error');
    return json({error:'The room could not be reached. Please try again in a moment.',code:'SERVER_ERROR'},503);
  }
}
