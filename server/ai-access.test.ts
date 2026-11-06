import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {pbkdf2Sync} from 'node:crypto';
import {aiAccessAllowed,unlockAI,lockAI,paidAvailable,setAIEnabled,aiAccessState} from './ai-access.ts';
const password='test-only-team-password',salt='b'.repeat(32);
const verifier=`pbkdf2-sha256:100000:${salt}:${pbkdf2Sync(password,Buffer.from(salt,'hex'),100_000,32,'sha256').toString('hex')}`;
function setup(){
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE ai_access_sessions (token_hash TEXT PRIMARY KEY, password_version TEXT NOT NULL, expires_at INTEGER NOT NULL, enabled INTEGER NOT NULL DEFAULT 1)');
 const binding={prepare(sql:string){return {bind(...values:(string|number)[]){return {async first(){return db.prepare(sql).get(...values)??null;},async run(){return {meta:{changes:Number(db.prepare(sql).run(...values).changes)}};}};}};}} as unknown as D1Database;
 const env={DB:binding,AI_ACCESS_PASSWORD_HASH:verifier,AI_MODE:'openai',AI_ENABLE_PAID:'I_ACCEPT_SMALL_API_CHARGES',OPENAI_API_KEY:'test-only-key'};
 const request=(cookie?:string,url='https://example.com/api/ai/access')=>new Request(url,{headers:cookie?{Cookie:cookie}:{}});
 return {db,env,request};
}
test('AI sessions are opaque, expire, revoke on logout/rotation, and fail closed',async()=>{
 const {db,env,request}=setup();try{
  assert.equal(paidAvailable({...env,AI_ACCESS_PASSWORD_HASH:undefined}),false);
  assert.equal(await aiAccessAllowed(request(),env,1000),false);
  await assert.rejects(()=>unlockAI(request(),env,'wrong-password',1000),/did not match/);
  const header=await unlockAI(request(),env,password,1000),cookie=header.split(';')[0];
  assert.match(header,/^__Host-painted-realms-ai=[a-f0-9]{64}; Path=\/; HttpOnly; SameSite=Strict; Max-Age=31536000; Secure$/);
  assert.equal(await aiAccessAllowed(request(cookie),env,1001),true);
  await setAIEnabled(request(cookie),env,false,1001);assert.equal(await aiAccessAllowed(request(cookie),env,1002),false);assert.deepEqual(await aiAccessState(request(cookie),env,1002),{remembered:true,enabled:false});
  await setAIEnabled(request(cookie),env,true,1003);assert.equal(await aiAccessAllowed(request(cookie),env,1004),true);
  assert.equal(await aiAccessAllowed(request(cookie),env,1000+31_536_000_000),false);
  assert.equal(await aiAccessAllowed(request(cookie),{...env,AI_ENABLE_PAID:'DISABLED'},1001),false);
  assert.equal(await aiAccessAllowed(request(cookie),{...env,AI_ACCESS_PASSWORD_HASH:verifier.slice(0,-1)+(verifier.endsWith('f')?'e':'f')},1001),false);
  assert.equal(await aiAccessAllowed(request(cookie+'; '+cookie),env,1001),false);
  assert.equal(await aiAccessAllowed(request(cookie.replace(/.$/,'z')),env,1001),false);
  const stored=JSON.stringify(db.prepare('SELECT * FROM ai_access_sessions').all());assert.ok(!stored.includes(cookie.split('=')[1]));assert.ok(!stored.includes(password));
  assert.match(await lockAI(request(cookie),env),/Max-Age=0/);assert.equal(await aiAccessAllowed(request(cookie),env,1001),false);
 }finally{db.close();}
});
test('AI session storage is bounded, renewals replace tokens, expired sessions recover',async()=>{
 const {db,env,request}=setup();try{
  const first=(await unlockAI(request(),env,password,1000)).split(';')[0];
  const second=(await unlockAI(request(first),env,password,1001)).split(';')[0];
  assert.equal(await aiAccessAllowed(request(first),env,1002),false);assert.equal(await aiAccessAllowed(request(second),env,1002),true);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM ai_access_sessions').get()!.n,1);
  const version=db.prepare('SELECT password_version FROM ai_access_sessions').get()!.password_version as string;
  for(let i=0;i<511;i++)db.prepare('INSERT INTO ai_access_sessions VALUES (?,?,?,1)').run('test-'+i,version,40_000_000_000);
  await assert.rejects(()=>unlockAI(request(),env,password,1002),/busy/);
  const header=await unlockAI(request(undefined,'http://localhost/api/ai/access'),env,password,40_000_000_001);
  assert.match(header,/^painted-realms-ai=/);assert.ok(!header.includes('Secure'));
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM ai_access_sessions').get()!.n,1);
 }finally{db.close();}
});
