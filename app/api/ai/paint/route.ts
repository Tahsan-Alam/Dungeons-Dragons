import {env} from 'cloudflare:workers';
import {body,handle,throttle} from '../../../../server/http';
import {RoomError} from '../../../../server/rooms';
import {aiAccessState,accessConfigured} from '../../../../server/ai-access';
import {aiCaps} from '../../../../server/ai-config';
import {BudgetLedger,D1Ledger} from '../../../../server/ai-ledger';
import {D1RateLimiter} from '../../../../server/rate-limit';
import {D1ImageStore,IMAGES_PER_PAINT,imagesConfigured,imagesPerPlayerDay,paintPicture,parsePaintRequest} from '../../../../server/ai-image';

/** Paint your own Game Master or hero: two options from the image model, stored and returned by id. */
export async function POST(request:Request){
 return handle(async()=>{
  const input=parsePaintRequest(await body(request));
  if(!input)throw new RoomError('Describe them in 3 to 200 characters.');
  await throttle(request,'creator');
  if(!accessConfigured(env)||!imagesConfigured(env))throw new RoomError('Painting is not set up on this server. You can still draw them.',503,'PAINT_UNAVAILABLE');
  const access=await aiAccessState(request,env);
  if(!access.enabled)throw new RoomError('AI is switched off for this device. Turn it on in settings to paint.',403,'AI_DISABLED');
  // Each player (by connection) gets a few paintings per UTC day, on top of the site-wide ledger caps.
  const paints=Math.floor(imagesPerPlayerDay(env)/IMAGES_PER_PAINT);
  const identity=request.headers.get('cf-connecting-ip')??'local-preview';
  // Game Masters and heroes have separate allowances.
  const who=input.kind==='hero'?'hero':'Game Master';
  if(paints<1||!await new D1RateLimiter(env.DB!).consume(input.kind==='hero'?'paint-hero':'paint',identity,Date.now(),paints,86_400_000))
   throw new RoomError(`You’ve used today’s ${who} paintings. Choose one you painted, draw them, or paint again tomorrow.`,429,'PAINT_DAILY_LIMIT');
  return paintPicture(input,{env,ledger:new BudgetLedger(new D1Ledger(env.DB!),aiCaps(env)),store:new D1ImageStore(env.DB!),signal:request.signal});
 });
}
