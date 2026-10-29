import { body, handle, service, throttle } from '../../../../server/http.ts';
export const dynamic='force-dynamic';
export async function POST(request:Request) {
  return handle(async()=>{const data=await body(request);await throttle(request,'join');return service().join({code:data.code,name:data.name,heroClass:data.heroClass,requestId:data.requestId});});
}
