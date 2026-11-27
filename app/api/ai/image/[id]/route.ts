import {env} from 'cloudflare:workers';
import {throttle,json} from '../../../../../server/http';
import {RoomError} from '../../../../../server/rooms';
import {D1ImageStore} from '../../../../../server/ai-image';
import {isPortraitId} from '../../../../../game/creation';

type Context={params:Promise<{id:string}>};
/** A painted Game Master portrait by id. Ids are content hashes, so the response never changes. */
export async function GET(request:Request,context:Context){
 try{
  const {id}=await context.params;
  if(!isPortraitId(id)||!env.DB)return json({error:'Not found.',code:'NOT_FOUND'},404);
  await throttle(request,'read');
  const row=await new D1ImageStore(env.DB).get(id);
  if(!row)return json({error:'Not found.',code:'NOT_FOUND'},404);
  const bytes=Uint8Array.from(atob(row.base64),c=>c.charCodeAt(0));
  return new Response(bytes,{headers:{'Content-Type':row.contentType,'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'"}});
 }catch(error){
  if(error instanceof RoomError)return json({error:error.message,code:error.code},error.status);
  return json({error:'The picture could not be loaded.',code:'SERVER_ERROR'},503);
 }
}
