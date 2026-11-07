import {test} from 'node:test';
import assert from 'node:assert/strict';
import {creationFixture,parseCreationRequest,parseCreationResult,parseBlueprint} from './creation.ts';
import type {CreationRequest} from './creation.ts';
import {createGame,applyAction} from './engine.ts';
import {DEFAULT_OPTIONS} from './types.ts';
import {narrationFixture} from './campaign.ts';
import {newReplay,appendReplay,reconstructReplay} from './replay.ts';

const request:CreationRequest={action:'narrators',scope:'test-creator',requestId:'one',enabled:false,prompt:'A moonlit city of clockwork dragons. No spiders.',message:'A sarcastic archivist',traits:{personality:['Sarcastic'],speakingStyle:['Soft-spoken']},history:[]};
function blueprint(){
 const narrator=creationFixture(request).narrators![0];
 const story=creationFixture({...request,action:'story',narrator}).story!;
 const hero=creationFixture({...request,action:'heroes',narrator,story}).heroes![0];
 return {narrator,story,hero};
}
test('generated setup yields three distinct narrator/hero choices and a validated playable blueprint',()=>{
 const narrators=creationFixture(request).narrators!;assert.equal(new Set(narrators.map(n=>n.name)).size,3);assert.equal(new Set(narrators.map(n=>n.model)).size,3);
 const created=blueprint();assert.deepEqual(parseBlueprint(created),created);assert.match(created.story.synopsis,/No spiders/);
 assert.equal(parseBlueprint({...created,hero:{...created.hero,heroClass:'invincible',hp:999}}),null);
 assert.equal(parseBlueprint({...created,narrator:{...created.narrator,color:'url(evil)'}}),null);
});
test('custom category validation rejects misplaced values and suggests a fitting replacement',()=>{
 for(const [category,value] of [['personality','Cheeseburger'],['speakingStyle','2020'],['background','Sarcastic']]){
  const result=creationFixture({...request,action:'trait',category:category as 'personality',value});assert.equal(result.trait!.accepted,false);assert.ok(result.trait!.suggestion);
 }
 assert.equal(creationFixture({...request,action:'trait',category:'speakingStyle',value:'Deadpan'}).trait!.accepted,true);
 const response={reply:'Try Curious instead.',trait:{accepted:false,value:'Cheeseburger',suggestion:'Curious'}};
 assert.ok(parseCreationResult(response,{...request,action:'trait',category:'personality',value:'Cheeseburger'}));
 assert.ok(parseCreationResult({reply:'Try Curious instead.',trait:{accepted:false,suggestion:'Curious'}},{...request,action:'trait',category:'personality',value:'Cheeseburger'}));
 assert.equal(parseCreationResult({...response,trait:{...response.trait,value:'Something else'}},{...request,action:'trait',value:'Cheeseburger'}),null);
});
test('creation input boundaries reject overlong conversation, unbounded histories and missing story context',()=>{
 assert.ok(parseCreationRequest(request));assert.equal(parseCreationRequest({...request,message:'x'.repeat(401)}),null);
 assert.equal(parseCreationRequest({...request,history:Array(7).fill({role:'player',text:'Hi'})}),null);
 assert.equal(parseCreationRequest({...request,action:'heroes'}),null);
 assert.equal(parseCreationRequest({...request,traits:{personality:['a','b','c','d']}}),null);
 assert.equal(parseCreationRequest({...request,action:'trait',category:'personality',value:'four very long words'}),null);
 const drafts=creationFixture(request);assert.equal(parseCreationResult({reply:drafts.reply,narrators:[drafts.narrators![0],drafts.narrators![0],drafts.narrators![0]]},request),null);
 assert.ok(parseCreationRequest({...request,traits:{personality:[]}}));
 const retained=parseCreationRequest({...request,narratorBrief:'A kind archivist',candidates:creationFixture(request).narrators,history:Array(6).fill({role:'player',text:'Keep the earlier qualities.'})});assert.equal(retained!.narratorBrief,'A kind archivist');assert.equal(retained!.candidates![1].name,'Tansy');
});
test('generated prose accepts paragraph breaks without relaxing markup or speech length boundaries',()=>{
 const sampleRequest={...request,action:'sample' as const,narrator:blueprint().narrator};
 assert.equal(parseCreationResult({reply:'A fresh\nsample.',sample:'Come closer.\n\nThe stars are listening.'},sampleRequest)!.sample,'Come closer. The stars are listening.');
 assert.equal(parseCreationResult({reply:'A fresh sample.',sample:'<script>hello</script>'},sampleRequest),null);
 assert.equal(parseCreationResult({reply:'A fresh sample.',sample:'x'.repeat(601)},sampleRequest),null);
});
test('conversation accepts unfinished edits, while game start still requires a complete blueprint',()=>{
 const created=blueprint(),story={...created.story,title:'',synopsis:'A clockwork city.\nA missing mentor.'},hero={...created.hero,name:'',background:'',personality:[]};
 const edit=parseCreationRequest({...request,action:'hero',narrator:created.narrator,story,hero});assert.ok(edit);assert.equal(edit.story!.synopsis,'A clockwork city. A missing mentor.');assert.equal(edit.hero!.name,'');
 assert.equal(parseBlueprint({...created,story}),null);assert.equal(parseBlueprint({...created,hero}),null);
});
test('edited synopsis, world, narrator and hero survive game start and exact replay',()=>{
 const created=blueprint();created.story.title='The Clockmaker’s Daughter';created.story.synopsis='Find the daughter before the city unwinds. No spiders.';created.story.world='The Brass Moon';created.story.locations=['The moving observatory'];created.hero.name='Mira';created.hero.heroClass='knight';created.hero.background='A clock repairer who knows the missing girl.';
 const players=[{id:'you',name:'Mira',heroClass:'knight' as const,color:created.hero.color,bot:false}];
 const initial=createGame(players,{...DEFAULT_OPTIONS,companions:0,creation:created});
 assert.equal(initial.story!.campaign.title,created.story.title);assert.equal(initial.story!.campaign.premise,created.story.synopsis);assert.equal(initial.options.creation!.narrator.name,created.narrator.name);assert.equal(initial.sceneName,'The moving observatory');
 assert.equal(initial.actors[0].color,created.hero.color);assert.ok(initial.story!.campaign.facts.some(f=>f.includes('The Brass Moon')));
 assert.match(narrationFixture(initial).caption,/Find the daughter before the city unwinds/);
 const next=applyAction(initial,'you',{type:'guard'}),replay=appendReplay(newReplay(initial),{type:'action',playerId:'you',action:{type:'guard'}});
 assert.deepEqual(reconstructReplay(replay).at(-1),next);
 assert.throws(()=>createGame([{...players[0],name:'Imposter'}],{...DEFAULT_OPTIONS,creation:created}));
});
