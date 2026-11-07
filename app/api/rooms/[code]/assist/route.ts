import {body,bearer,handle,service,throttle} from '../../../../../server/http';
export async function POST(request:Request,{params}:{params:Promise<{code:string}>}){
 return handle(async()=>{const token=bearer(request);await throttle(request,'command',token);const input=await body(request);return service().assist((await params).code,token,{version:input.version,text:input.text,audio:input.audio,guidance:input.guidance},request.signal);});
}
