import {test,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBObjectStore} from 'fake-indexeddb';
import {AdventureStore,soloRecord,roomRecord} from './library.ts';
import {newReplay} from './replay.ts';
import {createGame} from './engine.ts';
import {DEFAULT_OPTIONS} from './types.ts';
import type {Session} from './types.ts';

// Every test gets an isolated in-memory IndexedDB implementation. These tests
// cannot access the user's real browser profile, library, or hosted database.
let stores:AdventureStore[]=[];
beforeEach(()=>{globalThis.indexedDB=new IDBFactory();stores=[];});
afterEach(()=>{for(const store of stores)store.close();});
const store=()=>{const value=new AdventureStore();stores.push(value);return value;};
const game=()=>createGame([{id:'you',name:'QA',heroClass:'ranger',color:'#abc',bot:false}],{...DEFAULT_OPTIONS,companions:0});
const record=(id:string)=>{const state=game();return soloRecord(state,newReplay(state),id,1);};
const seat=(n:number):Session=>({code:['ABCDEF','BCDEFG'][n],playerId:`qa-${n}`,token:String(n+1).repeat(64)});

test('AdventureStore saves independent games across new store connections and deletes only its target',async()=>{
 const first=store();await first.put(record('one'),0);await first.put(record('two'),0);
 const second=store();assert.deepEqual((await second.all()).map(r=>r.meta.id).sort(),['one','two']);
 await second.delete('one');assert.deepEqual((await first.all()).map(r=>r.meta.id),['two']);
 assert.deepEqual((await store().all()).map(r=>r.meta.id),['two']);
});
test('migration keeps deleted legacy solo and online records deleted after a new tab opens',async()=>{
 const first=store(),legacy=game(),auth=seat(0);await first.migrate(legacy,auth);
 const imported=await first.all();assert.equal(imported.length,2);
 for(const saved of imported)await first.delete(saved.meta.id);
 const second=store();await second.migrate(legacy,auth);assert.deepEqual(await second.all(),[]);
});
test('legacy online seats migrate independently even when another tab already migrated its own seat',async()=>{
 const first=store(),second=store();await first.migrate(game(),seat(0));await second.migrate(game(),seat(1));
 const all=await second.all();assert.equal(all.length,3);assert.equal(all.filter(r=>r.meta.kind==='solo').length,1);
 assert.deepEqual(all.filter(r=>r.session).map(r=>r.session!.playerId).sort(),['qa-0','qa-1']);
 // Overlapping migration calls are serialized transactions, not last-writer-wins replacements.
 await Promise.all([first.migrate(game(),seat(0)),second.migrate(game(),seat(1))]);assert.equal((await first.all()).length,3);
});
test('optimistic concurrency rejects stale saves and preserves the winning tab revision',async()=>{
 const first=store(),second=store(),original=record('shared');await first.put(original,0);
 const a=structuredClone(original),b=structuredClone(original);a.revision=2;a.meta.title='Winning tab';b.revision=2;b.meta.title='Stale tab';
 const results=await Promise.allSettled([first.put(a,1),second.put(b,1)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);const failure=results.find(r=>r.status==='rejected');assert.ok(failure?.status==='rejected');assert.match(failure.reason.message,/another tab/);
 const current=(await first.all())[0];assert.equal(current.revision,2);assert.equal(current.meta.title,'Winning tab');
 const recovered={...current,revision:3,meta:{...current.meta,title:'Reopened tab'}};await second.put(recovered,current.revision);assert.equal((await first.all())[0].meta.title,'Reopened tab');
});
test('durable deletion tombstones reject queued and newly opened stale tabs even after revision metadata is lost',async()=>{
 const first=store(),second=store(),original=record('deleted');await first.put(original,0);
 await first.delete(original.meta.id);
 // A stale tab knows its old revision. A reloaded stale cache may mistakenly use zero.
 for(const revision of [1,0,undefined])await assert.rejects(()=>second.put({...original,revision:2},revision),/deleted in another tab/);
 const third=store();await assert.rejects(()=>third.put(original),/deleted in another tab/);assert.deepEqual(await first.all(),[]);
});
test('a delete racing a queued save always leaves the game deleted',async()=>{
 const first=store(),second=store(),original=record('racing');await first.put(original,0);
 const next={...original,revision:2,meta:{...original.meta,title:'Queued edit'}};
 const outcomes=await Promise.allSettled([first.delete(original.meta.id),second.put(next,1)]);
 assert.equal(outcomes[0].status,'fulfilled');assert.deepEqual(await second.all(),[]);
});
test('a storage write failure aborts the transaction and preserves the last successful save',async()=>{
 const first=store(),original=record('full-disk');await first.put(original,0);
 const originalPut=IDBObjectStore.prototype.put;
 IDBObjectStore.prototype.put=function(...args:Parameters<IDBObjectStore['put']>){if(this.name==='adventures')throw new DOMException('Synthetic quota failure','QuotaExceededError');return originalPut.apply(this,args);};
 try{await assert.rejects(()=>first.put({...original,revision:2,meta:{...original.meta,title:'Unsaved change'}},1),/could not save/);}finally{IDBObjectStore.prototype.put=originalPut;}
 assert.deepEqual((await first.all())[0],original);
 await first.put({...original,revision:2},1);assert.equal((await first.all())[0].revision,2);
});
test('independent online records retain their exact session and cached replay after a storage round trip',async()=>{
 const first=store();const a=roomRecord(null,seat(0)),b=roomRecord(null,seat(1));a.game=game();a.replay=newReplay(a.game);
 await first.put(a,0);await first.put(b,0);const all=await store().all();assert.deepEqual(all.find(r=>r.meta.id===a.meta.id),a);assert.deepEqual(all.find(r=>r.meta.id===b.meta.id),b);
});
