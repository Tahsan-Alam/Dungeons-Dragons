import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { D1RateLimiter } from './rate-limit.ts';

test('distributed rate bucket accepts only its atomic limit, recovers next minute, and separates clients',async()=>{
  const db=new DatabaseSync(':memory:');
  db.exec('CREATE TABLE room_rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL)');
  const binding={prepare(sql:string){return {bind(...values:(string|number)[]){return {
    async first(){return db.prepare(sql).get(...values)??null;},
    async run(){const result=db.prepare(sql).run(...values);return {meta:{changes:Number(result.changes)}};},
  };}};}} as unknown as D1Database;
  try {
    const a=new D1RateLimiter(binding),b=new D1RateLimiter(binding);
    const results=await Promise.all(Array.from({length:50},(_,i)=>(i%2?a:b).consume('join','203.0.113.1',120_000)));
    assert.equal(results.filter(Boolean).length,40);
    assert.equal(await b.consume('join','203.0.113.1',120_000),false);
    assert.equal(await b.consume('join','203.0.113.2',120_000),true);
    assert.equal(await b.consume('join','203.0.113.1',180_000),true);
    assert.equal(await b.consume('read','203.0.113.1',120_000),true);
    const creator=await Promise.all(Array.from({length:121},(_,i)=>(i%2?a:b).consume('creator','creator-test',120_000)));
    assert.equal(creator.filter(Boolean).length,120);assert.equal(await b.consume('creator','creator-test',180_000),true);
    const stored=JSON.stringify(db.prepare('SELECT * FROM room_rate_limits').all());
    assert.ok(!stored.includes('203.0.113.1'));
    await b.consume('join','cleanup',400_000);
    assert.equal(db.prepare('SELECT COUNT(*) AS total FROM room_rate_limits WHERE expires_at < 400000').get()!.total,0);
  }finally{db.close();}
});
