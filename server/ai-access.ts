import {RoomError} from './rooms.ts';

const SESSION_SECONDS=365*24*60*60;
type AccessEnv={DB?:D1Database;AI_ACCESS_MODE?:string;AI_ACCESS_PASSWORD_HASH?:string;AI_MODE?:string;AI_ENABLE_PAID?:string;OPENAI_API_KEY?:string;AI_ENABLE_AUDIO?:string};
export function passwordRequired(env:AccessEnv){return env.AI_ACCESS_MODE==='password';}
export function accessConfigured(env:AccessEnv){
 if(!env.DB)return false;
 if(env.AI_ACCESS_MODE===undefined||env.AI_ACCESS_MODE==='open')return true;
 return passwordRequired(env)&&/^pbkdf2-sha256:100000:[a-f0-9]{32}:[a-f0-9]{64}$/.test(env.AI_ACCESS_PASSWORD_HASH??'');
}
export function paidAvailable(env:AccessEnv){return accessConfigured(env)&&env.AI_MODE==='openai'&&env.AI_ENABLE_PAID==='I_ACCEPT_SMALL_API_CHARGES'&&!!env.OPENAI_API_KEY;}
const hex=(bytes:Uint8Array)=>Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join('');
async function digest(value:string){return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))));}
async function passwordHash(password:string,salt:string){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 return hex(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',iterations:100_000,salt:Uint8Array.from(salt.match(/../g)!,x=>parseInt(x,16))},key,256)));
}
function cookieName(request:Request){return new URL(request.url).protocol==='https:'?'__Host-painted-realms-ai':'painted-realms-ai';}
function token(request:Request){
 const values=(request.headers.get('cookie')??'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(cookieName(request)+'='));
 if(values.length!==1)return null;
 const value=values[0].slice(cookieName(request).length+1);return /^[a-f0-9]{64}$/.test(value)?value:null;
}
function cookie(request:Request,value:string,seconds:number){return `${cookieName(request)}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${new URL(request.url).protocol==='https:'?'; Secure':''}`;}
function preferenceCookie(request:Request,enabled:boolean){return `${cookieName(request)}-preference=${enabled?'on':'off'}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${new URL(request.url).protocol==='https:'?'; Secure':''}`;}
export async function aiAccessState(request:Request,env:AccessEnv,now=Date.now()){
 const absent={remembered:false,enabled:false};
 if(!accessConfigured(env))return absent;
 // Open access needs no session row. The cookie is only a device opt-out,
 // never an authorization token; server flags and the ledger still gate spend.
 if(!passwordRequired(env))return {remembered:true,enabled:!(request.headers.get('cookie')??'').split(';').some(value=>value.trim()===`${cookieName(request)}-preference=off`)};
 const value=token(request);if(!value)return absent;
 const row=await env.DB!.prepare('SELECT password_version, enabled FROM ai_access_sessions WHERE token_hash = ? AND expires_at > ?').bind(await digest(value),now).first<{password_version:string;enabled:number}>();
 return row&&row.password_version===await digest(env.AI_ACCESS_PASSWORD_HASH!)?{remembered:true,enabled:row.enabled===1}:absent;
}
export async function aiAccessAllowed(request:Request,env:AccessEnv,now=Date.now()){
 return paidAvailable(env)&&(await aiAccessState(request,env,now)).enabled;
}
export async function setAIEnabled(request:Request,env:AccessEnv,enabled:boolean,now=Date.now()){
 if(accessConfigured(env)&&!passwordRequired(env))return preferenceCookie(request,enabled);
 if(!(await aiAccessState(request,env,now)).remembered)throw new RoomError('Enter the team password to remember this device.',403,'AI_PASSWORD_REQUIRED');
 await env.DB!.prepare('UPDATE ai_access_sessions SET enabled = ? WHERE token_hash = ?').bind(enabled?1:0,await digest(token(request)!)).run();
}
export async function unlockAI(request:Request,env:AccessEnv,password:unknown,now=Date.now()){
 if(!paidAvailable(env))throw new RoomError('Team AI is not available yet. Ask the site owner to finish setup.',503,'AI_UNAVAILABLE');
 if(!passwordRequired(env))return preferenceCookie(request,true);
 if(typeof password!=='string'||password.length<12||password.length>128)throw new RoomError('That password did not match. Try again.',403,'AI_PASSWORD_INCORRECT');
 const [,,salt,expected]=env.AI_ACCESS_PASSWORD_HASH!.split(':');
 const supplied=await passwordHash(password,salt);
 let mismatch=0;for(let i=0;i<expected.length;i++)mismatch|=expected.charCodeAt(i)^supplied.charCodeAt(i);
 if(mismatch)throw new RoomError('That password did not match. Try again.',403,'AI_PASSWORD_INCORRECT');
 const version=await digest(env.AI_ACCESS_PASSWORD_HASH!);
 const value=hex(crypto.getRandomValues(new Uint8Array(32)));
 await env.DB!.prepare('DELETE FROM ai_access_sessions WHERE token_hash IN (SELECT token_hash FROM ai_access_sessions WHERE expires_at <= ? OR password_version != ? LIMIT 512)').bind(now,version).run();
 // Renew this browser without accumulating sessions. The new token is never stored raw.
 const previous=token(request);if(previous)await env.DB!.prepare('DELETE FROM ai_access_sessions WHERE token_hash = ?').bind(await digest(previous)).run();
 const inserted=await env.DB!.prepare('INSERT INTO ai_access_sessions (token_hash, password_version, expires_at, enabled) SELECT ?, ?, ?, 1 WHERE (SELECT COUNT(*) FROM ai_access_sessions) < 512 RETURNING token_hash').bind(await digest(value),version,now+SESSION_SECONDS*1000).first();
 if(!inserted)throw new RoomError('Team access is busy. Please try again later.',429,'AI_ACCESS_FULL');
 return cookie(request,value,SESSION_SECONDS);
}
export async function lockAI(request:Request,env:AccessEnv){
 const value=token(request);if(value&&env.DB)await env.DB.prepare('DELETE FROM ai_access_sessions WHERE token_hash = ?').bind(await digest(value)).run();
 return cookie(request,'',0);
}
