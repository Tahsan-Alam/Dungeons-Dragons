import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../../game/engine.ts';
import {DEFAULT_OPTIONS} from '../../game/types.ts';
import type {GameState} from '../../game/types.ts';
import {collectBoardFeedback} from './board-feedback.ts';
import {upcomingTurns} from './turn-order.ts';

function fixture(){
 const game=createGame([{id:'you',name:'Tester',heroClass:'ranger',color:'#abc',bot:false}],{...DEFAULT_OPTIONS,companions:1});
 game.events=[];game.eventSequence=0;
 return game;
}
function after(game:GameState,change:(next:GameState)=>void){const next=structuredClone(game);change(next);return next}
const foe=(game:GameState)=>game.actors.find(a=>a.enemy)!,hero=(game:GameState)=>game.actors.find(a=>!a.enemy)!;

test('a hit, a critical hit and a miss each produce a result on the target',()=>{
 const game=fixture(),target=foe(game);
 const next=after(game,g=>{
  const t=foe(g);t.hp-=5;
  g.events.push({id:1,kind:'roll',text:'hit',roll:12,attack:{targetId:t.id,action:'attack',hit:true,critical:false,damage:3}},{id:2,kind:'roll',text:'crit',roll:20,attack:{targetId:t.id,action:'attack',hit:true,critical:true,damage:2}},{id:3,kind:'roll',text:'miss',roll:1,attack:{targetId:t.id,action:'attack',hit:false,critical:false,damage:0}});
  g.eventSequence=3;
 });
 const items=collectBoardFeedback(game,next);
 assert.deepEqual(items.map(i=>[i.kind,i.text,i.key]),[['damage','−3','event-1'],['critical','−2!','event-2'],['miss','Miss','event-3']]);
 assert.ok(items.every(i=>i.actorId===target.id&&i.x===target.x&&i.y===target.y));
});

test('healing is reported, including healing after a strike in the same snapshot',()=>{
 const game=fixture();hero(game).hp=10;
 const healed=after(game,g=>{hero(g).hp=16;g.events.push({id:1,kind:'action',text:'potion'});g.eventSequence=1});
 assert.deepEqual(collectBoardFeedback(game,healed).map(i=>[i.kind,i.text]),[['heal','+6']]);
 const both=after(game,g=>{const h=hero(g);h.hp=9;g.events.push({id:1,kind:'roll',text:'hit',roll:9,attack:{targetId:h.id,action:'attack',hit:true,critical:false,damage:4}},{id:2,kind:'action',text:'heal'});g.eventSequence=2});
 assert.deepEqual(collectBoardFeedback(game,both).map(i=>[i.kind,i.text]),[['damage','−4'],['heal','+3']]);
});

test('unchanged, rewound and new-scene snapshots produce nothing',()=>{
 const game=fixture();game.eventSequence=4;
 assert.deepEqual(collectBoardFeedback(game,game),[]);
 assert.deepEqual(collectBoardFeedback(game,after(game,g=>{g.eventSequence=2;hero(g).hp-=1})),[]);
 assert.deepEqual(collectBoardFeedback(game,after(game,g=>{g.scene++;g.eventSequence=6;hero(g).hp=1;foe(g).hp+=0})),[]);
});

test('turn order starts with the active character, wraps once and skips the fallen',()=>{
 const game=fixture(),order=game.turnOrder;
 game.activeActorId=order[1];
 const slots=upcomingTurns(game);
 assert.deepEqual(slots.map(s=>s.actor.id),[...order.slice(1),order[0]]);
 assert.deepEqual(slots.map(s=>s.current),slots.map((_,i)=>i===0));
 assert.deepEqual(slots.filter(s=>s.nextRound).map(s=>s.actor.id),[order[0]]);
 const fallen=game.actors.find(a=>a.id===order[2])!;fallen.hp=0;fallen.defeated=true;
 assert.ok(!upcomingTurns(game).some(s=>s.actor.id===fallen.id));
 game.status='victory';assert.deepEqual(upcomingTurns(game),[]);
});
