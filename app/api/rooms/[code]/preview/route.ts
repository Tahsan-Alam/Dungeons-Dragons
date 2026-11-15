import { handle, service, throttle } from '../../../../../server/http.ts';
export const dynamic='force-dynamic';
type Context={params:Promise<{code:string}>};
/** The party invitation shown before joining. The party code is the only credential needed. */
export async function GET(request:Request,context:Context) {
  return handle(async()=>{const {code}=await context.params;await throttle(request,'read');return service().preview(code);});
}
