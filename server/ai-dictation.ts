import {tidyDictation,wavDuration} from '../game/dictation.ts';
import type {BudgetLedger} from './ai-ledger.ts';
export async function transcribeQuest(bytes:Uint8Array,key:string,ledger:BudgetLedger,transport:typeof fetch=fetch,signal?:AbortSignal):Promise<{transcript:string;text:string}> {
 if(wavDuration(bytes)===null)throw new Error('Record up to 60 seconds of mono audio.');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as Uint8Array<ArrayBuffer>))).map(b=>b.toString(16).padStart(2,'0')).join('');
 const receiptKey=`dictation-v1:${hash}`;
 // At most one minute, $0.0045/minute, >4x margin. Shared global caps apply.
 // A room does not exist during setup. Bound each recording separately while
 // retaining global day/month caps; old drafts must not exhaust one lifetime pool.
 const receipt=await ledger.reserve(receiptKey,`quest-dictation:${hash}`,20_000,16000);
 if(receipt==='blocked')throw new Error('Dictation allowance reached. You can type your quest.');
 if(receipt!=='reserved'){
  if(receipt.status==='done'&&receipt.result)return receipt.result as {transcript:string;text:string};
  throw new Error('This recording could not be transcribed. You can type your quest.');
 }
 let result:{transcript:string;text:string}|null=null;
 try{
  const form=new FormData();form.set('model','gpt-transcribe');form.set('file',new Blob([bytes as Uint8Array<ArrayBuffer>],{type:'audio/wav'}),'quest.wav');
  const response=await transport('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{Authorization:`Bearer ${key}`},body:form,signal:AbortSignal.any([AbortSignal.timeout(20_000),...(signal?[signal]:[])]),redirect:'manual'});
  if(!response.ok)throw new Error('Transcription unavailable');
  const reader=response.body?.getReader();if(!reader)throw new Error('Empty transcription');
  const chunks:Uint8Array[]=[];let length=0;
  for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>16000){await reader.cancel();throw new Error('Transcript too long');}chunks.push(value);}
  const raw=new Uint8Array(length);let offset=0;for(const chunk of chunks){raw.set(chunk,offset);offset+=chunk.length;}
  const data=JSON.parse(new TextDecoder().decode(raw));
  if(typeof data.text!=='string'||!data.text.trim()||data.text.length>3000)throw new Error('Invalid transcript');
  result={transcript:data.text,text:tidyDictation(data.text)};
 }catch{/* No retries or raw provider errors. */}
 await ledger.finish(receiptKey,result,undefined,{outcome:result?'accepted':'transcription_failed'});
 if(!result)throw new Error('Transcription unavailable. Your existing quest text is unchanged.');
 return result;
}
