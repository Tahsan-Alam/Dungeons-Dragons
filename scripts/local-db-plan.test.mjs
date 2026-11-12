import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {localMigrationPlan} from './local-db-plan.mjs';
const files=readdirSync(new URL('../drizzle/',import.meta.url)).filter(name=>name.endsWith('.sql')).sort().map(name=>({name,sql:readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8')}));
function plan(db){
 const objects=db.prepare("SELECT name,type FROM sqlite_master WHERE type IN ('table','index')").all();
 return localMigrationPlan(files,Object.fromEntries(objects.filter(row=>row.type==='table').map(row=>[row.name,db.prepare(`PRAGMA table_info("${row.name}")`).all().map(col=>col.name)])),objects.filter(row=>row.type==='index').map(row=>row.name));
}
test('local setup is repeatable and upgrades manually initialized databases without losing saves or spend',()=>{
 for(const applied of [0,1,2,3,4]){
  const db=new DatabaseSync(':memory:');try{
   for(const file of files.slice(0,applied))db.exec(file.sql);
   if(applied>=1)db.prepare('INSERT INTO rooms VALUES (?,?,?,?)').run('KEEP',7,'saved adventure',99999);
   if(applied>=2)db.prepare('INSERT INTO ai_ledger VALUES (?,?,?)').run(1,3,'retained receipts');
   for(const sql of plan(db))db.exec(sql);
   assert.deepEqual(plan(db),[]);
   assert.ok(db.prepare('PRAGMA table_info(ai_access_sessions)').all().some(col=>col.name==='enabled'));
   if(applied>=1)assert.equal(db.prepare('SELECT payload FROM rooms').get().payload,'saved adventure');
   if(applied>=2)assert.equal(db.prepare('SELECT payload FROM ai_ledger').get().payload,'retained receipts');
  }finally{db.close();}
 }
});
test('unexpected schema or non-additive migrations stop setup before execution',()=>{
 assert.throws(()=>localMigrationPlan(files,{rooms:['code']},[]),/Unexpected schema/);
 assert.throws(()=>localMigrationPlan([{name:'future.sql',sql:'DROP TABLE rooms;'}],{},[]),/Unsupported/);
});
