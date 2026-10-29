import { bearer, body, handle, service, throttle } from '../../../../server/http.ts';
export const dynamic='force-dynamic';
type Context={params:Promise<{code:string}>};
export async function GET(request:Request,context:Context) {
  return handle(async()=>{const {code}=await context.params;const token=bearer(request);await throttle(request,'read');const params=new URL(request.url).searchParams;const version=params.get('version');return service().get(code,token,version===null?undefined:Number(version),params.get('background')==='1');});
}
export async function POST(request:Request,context:Context) {
  return handle(async()=>{const {code}=await context.params;const token=bearer(request);const data=await body(request);await throttle(request,'command',token);return service().command(code,token,{requestId:data.requestId,version:data.version,command:data.command});});
}
