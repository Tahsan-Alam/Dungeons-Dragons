import assert from 'node:assert/strict';
import test from 'node:test';
import {nextNarrationCue} from './narration-cue.ts';
import {createGame} from '../../game/engine.ts';
import {DEFAULT_OPTIONS} from '../../game/types.ts';
const makeGame=()=>createGame([{id:'you',name:'Mira',heroClass:'ranger',color:'#ef997c',bot:false}],DEFAULT_OPTIONS);
test('accepted chapter and victory captions are read once and ordinary moves never repeat their base story',()=>{
 const game=makeGame();game.story!.narrations=[{eventId:game.eventSequence,caption:'Mira follows the lighthouse beam.',source:'openai'}];
 const cue=nextNarrationCue(game,'quest','')!;assert.equal(cue.caption,'Mira follows the lighthouse beam.');
 assert.equal(nextNarrationCue(game,'quest',cue.key),null);
 game.eventSequence++;game.events.push({id:game.eventSequence,kind:'action',text:'Mira moves.'});assert.equal(nextNarrationCue(game,'quest',cue.key),null);
 game.eventSequence++;game.status='victory';game.events.push({id:game.eventSequence,kind:'story',text:'The lantern is restored.'});game.story!.narrations.push({eventId:game.eventSequence,caption:'Together, Mira and her friends bring the keeper’s last light home. Farewell!',source:'openai'});
 const ending=nextNarrationCue(game,'quest',cue.key)!;assert.match(ending.caption,/Farewell/);assert.equal(nextNarrationCue(game,'quest',ending.key),null);
});
test('an explicitly saved new telling may replace the local caption for the same beat',()=>{
 const game=makeGame(),local=nextNarrationCue(game,'quest','')!;
 game.story!.narrations.push({eventId:game.eventSequence,caption:'A newly accepted story.',source:'openai'});
 const saved=nextNarrationCue(game,'quest',local.key)!;assert.equal(saved.caption,'A newly accepted story.');assert.notEqual(saved.key,local.key);
 assert.ok(nextNarrationCue(game,'another-quest',saved.key));
});
