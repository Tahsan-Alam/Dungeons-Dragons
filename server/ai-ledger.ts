// Microdollars, not floating-point dollars. Reservations are never refunded automatically.
export interface Receipt {campaign:string;day:string;month:string;reserved:number;status:'pending'|'done';cacheBytes?:number;result?:unknown;usage?:{input:number;output:number};}
export interface Ledger {revision:number;entries:Record<string,Receipt>;}
export interface LedgerStore {read():Promise<Ledger>;cas(previous:number,next:Ledger):Promise<boolean>;}
export class MemoryLedger implements LedgerStore {
 private value:Ledger={revision:0,entries:{}};
 async read(){return structuredClone(this.value);}
 async cas(previous:number,next:Ledger){if(this.value.revision!==previous)return false;this.value=structuredClone(next);return true;}
}
export class D1Ledger implements LedgerStore {
 private database:D1Database;
 constructor(database:D1Database){this.database=database;}
 async read(){const row=await this.database.prepare('SELECT payload FROM ai_ledger WHERE id = 1').first<{payload:string}>();return row?JSON.parse(row.payload) as Ledger:{revision:0,entries:{}};}
 async cas(previous:number,next:Ledger){
  const result=previous===0?await this.database.prepare('INSERT OR IGNORE INTO ai_ledger (id, revision, payload) VALUES (1, ?, ?)').bind(next.revision,JSON.stringify(next)).run():
   await this.database.prepare('UPDATE ai_ledger SET revision = ?, payload = ? WHERE id = 1 AND revision = ?').bind(next.revision,JSON.stringify(next),previous).run();
  return result.meta.changes===1;
 }
}
export interface Caps {campaign:number;day:number;month:number;concurrency:number;}
export const DEFAULT_CAPS:Caps={campaign:100_000,day:250_000,month:1_000_000,concurrency:2};
export const LEDGER_BYTES=600_000;
export class BudgetLedger {
 private store:LedgerStore;private caps:Caps;private now:()=>number;
 constructor(store:LedgerStore,caps:Caps=DEFAULT_CAPS,now=Date.now){this.store=store;this.caps=caps;this.now=now;}
 async cached(key:string){const r=(await this.store.read()).entries[key];return r?.status==='done'?r.result:null;}
 async reserve(key:string,campaign:string,reserved:number,cacheBytes=32_000):Promise<'reserved'|'blocked'|Receipt>{
  if(!Number.isSafeInteger(cacheBytes)||cacheBytes<0||cacheBytes>LEDGER_BYTES||!Number.isSafeInteger(reserved)||reserved<=0||Object.values(this.caps).some(n=>!Number.isSafeInteger(n)||n<1))return 'blocked';
  for(let attempt=0;attempt<32;attempt++){
   const state=await this.store.read();if(state.entries[key])return state.entries[key];
   const day=new Date(this.now()).toISOString().slice(0,10),month=day.slice(0,7),entries=Object.values(state.entries);
   if(entries.length>=2000||new TextEncoder().encode(JSON.stringify(state)).length+entries.reduce((sum,r)=>sum+(r.status==='pending'?(r.cacheBytes??32_000):0),0)+cacheBytes+1024>LEDGER_BYTES||entries.filter(r=>r.status==='pending').length>=this.caps.concurrency)return 'blocked';
   for(const [scope,limit] of [['campaign',this.caps.campaign],['day',this.caps.day],['month',this.caps.month]] as const){
    const value={campaign,day,month}[scope];if(entries.filter(r=>r[scope]===value).reduce((sum,r)=>sum+r.reserved,0)+reserved>limit)return 'blocked';
   }
   const next=structuredClone(state);next.revision++;next.entries[key]={campaign,day,month,reserved,status:'pending',cacheBytes};
   if(await this.store.cas(state.revision,next))return 'reserved';
  }return 'blocked';
 }
 async finish(key:string,result:unknown,usage?:Receipt['usage']){
  for(let attempt=0;attempt<32;attempt++){
   const state=await this.store.read(),receipt=state.entries[key];if(!receipt||receipt.status==='done')return;
   if(new TextEncoder().encode(JSON.stringify(result)??'null').length>(receipt.cacheBytes??32_000))throw new Error('AI result exceeds reserved storage');
   const next=structuredClone(state);next.revision++;next.entries[key]={...receipt,status:'done',result,usage};
   if(new TextEncoder().encode(JSON.stringify(next)).length>LEDGER_BYTES)throw new Error('AI ledger storage exhausted');
   if(await this.store.cas(state.revision,next))return;
  }throw new Error('AI receipt could not be persisted');
 }
}
