import { body, handle, service, throttle } from '../../../server/http.ts';
export const dynamic='force-dynamic';
export async function POST(request:Request) {
  return handle(async()=>{const data=await body(request);await throttle(request,'create');return service().create({name:data.name,heroClass:data.heroClass,options:data.options,requestId:data.requestId});});
}
