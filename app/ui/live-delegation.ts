export interface LiveDelegation {id:string;text:string;session:number;}

// The relay sends cumulative transcript snapshots. Keep the newest complete
// snapshot; if a caller provides a separate correction, retain both in order.
export function coalesceLiveTranscript(previous:string,next:string){
 const first=previous.trim(),last=next.trim();
 if(!first||last.includes(first))return last.slice(-400);
 if(!last||first.endsWith(last))return first.slice(-400);
 for(let size=Math.min(first.length,last.length);size>=12;size--){
  if(first.endsWith(last.slice(0,size)))return (first+last.slice(size)).slice(-400);
 }
 return (first+'\n'+last).slice(-400);
}

// One running guide request and one latest pending request. This bounds paid
// work while preserving speech received during an earlier request. Scheduling
// the next task also lets the UI publish its pending=false state first.
export function createLiveDelegationQueue(options:{
 request:(task:LiveDelegation)=>Promise<{reply:string}|null>;
 respond:(task:LiveDelegation,text:string)=>void;
 isActive:(task:LiveDelegation)=>boolean;
 schedule?:(run:()=>void)=>void;
}){
 let running:LiveDelegation|null=null,pending:LiveDelegation|null=null,scheduled=false;
 const schedule=options.schedule??(run=>{setTimeout(run,40);});
 function wake(){
  if(scheduled||running||!pending)return;scheduled=true;
  schedule(()=>{scheduled=false;void run();});
 }
 async function run(){
  if(running||!pending)return;
  const task=pending;pending=null;
  if(!options.isActive(task)){wake();return;}
  running=task;let reply='The change could not be prepared. Nothing was saved.';
  try{const result=await options.request(task);reply=result?.reply??'I could not prepare that change. Nothing was saved; please try the text box.';}catch{/* Keep the draft and allow a later queued request to proceed. */}
  finally{
   if(options.isActive(task))options.respond(task,pending?'I have the added details and am updating the proposal.':reply);
   running=null;wake();
  }
 }
 return {
  enqueue(task:LiveDelegation){
   if(!task.text.trim()||!options.isActive(task))return;
   const previous=pending?.session===task.session?pending:running?.session===task.session?running:null;
   pending={...task,text:previous?coalesceLiveTranscript(previous.text,task.text):task.text.slice(-400)};wake();
  },
  cancel(){pending=null;},
 };
}
