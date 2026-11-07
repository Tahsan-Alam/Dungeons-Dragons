import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from './engine.ts';
import {applyStoryDirection,storyGoal} from './campaign.ts';
import {DEFAULT_OPTIONS} from './types.ts';
const game=()=>createGame([{id:'you',name:'Mira',heroClass:'ranger',color:'#ef997c',bot:false}],{...DEFAULT_OPTIONS,duration:'long'});
test('negated wrap-up and early-ending requests keep the adventure open',()=>{
 for(const text of ['Please do not wrap up yet.','I do not want an early ending.',"Don't end the quest now.",'Please don’t end the story yet.','No early ending, please.']){assert.equal(storyGoal(applyStoryDirection(game(),text)),5,text);}
});
test('creative descriptions of an eventual ending never shorten the adventure',()=>{
 for(const text of ['Finish the story with a dragon appearing.','End the story with a warm reunion.','The final ending should be early morning.','A faster pace, but no early ending.']){const next=applyStoryDirection(game(),text);assert.equal(storyGoal(next),5,text);assert.equal(next.story?.direction?.prompt,text);}
});
test('complete ending requests work and typographic negation cancels a saved early ending',()=>{
 for(const text of ['End after this chapter.','Please end after this chapter.','Can we finish the quest soon?','Wrap up soon.'])assert.equal(storyGoal(applyStoryDirection(game(),text)),1,text);
 const ending=applyStoryDirection(game(),'End after this chapter');for(const text of ['Please don’t end the story yet.','No early ending, please.'])assert.equal(storyGoal(applyStoryDirection(ending,text)),5,text);
});
test('keep going reverses an already selected early ending',()=>{
 const ending=applyStoryDirection(game(),'End after this chapter');assert.equal(storyGoal(ending),1);
 const continued=applyStoryDirection(ending,'Keep going');assert.equal(storyGoal(continued),5);assert.equal(continued.story?.direction?.endAfterChapter,false);
});
test('pace changes preserve creative detail and respect requests to slow down',()=>{
 const brisk=applyStoryDirection(game(),'Pick up the pace');assert.equal(brisk.story?.direction?.pace,'brisk');
 const slower=applyStoryDirection(brisk,'A slower pace with a curious dragon.');assert.equal(slower.story?.direction?.pace,'steady');assert.match(slower.story!.direction!.prompt,/curious dragon/);
 assert.equal(applyStoryDirection(brisk,'Please do not hurry.').story?.direction?.pace,'steady');
});
