/** Conservative cleanup: keep names, negation, order and creative detail intact. */
export function tidyDictation(text:string):string {
 return text.replace(/(^|[,.!?]\s+)(?:um+|uh+|erm),\s*(?=\w)/gi,(_match,prefix:string)=>prefix).replace(/\b(I|we|the)(?:\s+\1\b)+/g,'$1').replace(/\s+([,.!?])/g,'$1').replace(/\s+/g,' ').trim();
}
export function wavDuration(bytes:Uint8Array):number|null {
 if(bytes.length<44)return null;
 const tag=(start:number,len:number)=>String.fromCharCode(...bytes.slice(start,start+len));
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(tag(0,4)!=='RIFF'||tag(8,4)!=='WAVE'||tag(12,4)!=='fmt '||tag(36,4)!=='data'||view.getUint32(16,true)!==16||view.getUint16(20,true)!==1||view.getUint16(22,true)!==1||view.getUint32(24,true)!==16000||view.getUint32(28,true)!==32000||view.getUint16(32,true)!==2||view.getUint16(34,true)!==16||view.getUint32(40,true)!==bytes.length-44||view.getUint32(4,true)!==bytes.length-8||(bytes.length-44)%2)return null;
 const duration=(bytes.length-44)/32000;
 return duration>0&&duration<=60?duration:null;
}
