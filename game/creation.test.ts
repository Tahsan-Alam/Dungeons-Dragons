import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AETHER,creationFixture,parseCreationRequest,parseCreationResult,parseBlueprint,parseNarrator} from './creation.ts';
import type {CreationRequest} from './creation.ts';
import {applyCreatorProposal,editCreatorDraft,emptyCreatorDraft} from './creator-state.ts';
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

test('guide can start with the story, asks focused questions and never applies its own proposal',()=>{
 const start:CreationRequest={...request,action:'guide',focus:'story',draftVersion:0,message:'',prompt:''};
 assert.ok(parseCreationRequest(start));assert.equal(creationFixture(start).guide!.proposal,null);
 const result=creationFixture({...start,message:'An island whose lighthouse has forgotten the sea. No spiders.'});
 assert.equal(result.source,'fixture');assert.equal(result.guide!.proposal!.narrator,null);assert.match(result.guide!.proposal!.story!.synopsis,/No spiders/);
 const draft=emptyCreatorDraft();assert.equal(draft.story,null);
 const confirmed=applyCreatorProposal(draft,result.guide!.proposal!)!;assert.equal(confirmed.version,1);assert.ok(confirmed.story);assert.equal(confirmed.narrator,null);
 assert.equal(creationFixture({...start,focus:'hero',message:'A gentle healer'}).guide!.proposal,null);
});

test('new narrator form and voice are bounded metadata, while legacy profiles still parse',()=>{
 assert.ok(parseNarrator(blueprint().narrator));assert.deepEqual(parseNarrator(AETHER),AETHER);
 for(const extra of [{avatar:{form:'arbitrary-model',accessory:'none'}},{avatar:{form:'cat',accessory:'glasses',url:'https://evil.test'}},{voice:'voice-arbitrary-id'},{hp:999}])assert.equal(parseNarrator({...AETHER,...extra}),null);
 const made=blueprint();made.narrator={...AETHER,name:'Nyx',avatar:{form:'cat',accessory:'glasses'},voice:'willow'};
 const game=createGame([{id:'you',name:made.hero.name,heroClass:made.hero.heroClass,color:made.hero.color,bot:false}],{...DEFAULT_OPTIONS,creation:made});
 assert.deepEqual(reconstructReplay(newReplay(game)).at(-1)!.options.creation!.narrator,made.narrator);
});

test('guided traits appear in proposals and built-in corrections are conservative',()=>{
 const start:CreationRequest={...request,action:'guide',focus:'narrator',draftVersion:3,message:'A sarcastic cat with glasses',traits:{speakingStyle:['Soft-spoken']},prompt:'',narrator:AETHER};
 const result=creationFixture(start),profile=result.guide!.proposal!.narrator!;
 assert.equal(profile.avatar!.form,'cat');assert.equal(profile.avatar!.accessory,'glasses');assert.equal(profile.name,'Nyx');assert.deepEqual(profile.personality,['Sarcastic']);assert.deepEqual(profile.speakingStyle,['Soft-spoken']);
 assert.ok(parseCreationResult({reply:result.reply,guide:result.guide},start));
 assert.equal(creationFixture({...start,message:'Please don’t make it a cat'}).guide!.proposal,null);
 const removed=creationFixture({...start,narrator:profile,message:'Remove the glasses',traits:{}}).guide!.proposal!.narrator!;
 assert.equal(removed.avatar!.accessory,'none');assert.equal(removed.avatar!.form,'cat');assert.equal(removed.name,'Nyx');assert.equal(removed.appearance.some(x=>/glasses/i.test(x)),false);
 assert.equal(AETHER.avatar!.accessory,'hood');assert.deepEqual(AETHER.appearance,['Starlight','Ethereal']);
});

test('existing narrator traits do not turn fixture help questions into replacement proposals',()=>{
 const current={...AETHER,name:'Nyx',avatar:{form:'cat' as const,accessory:'glasses' as const}};
 const start:CreationRequest={...request,action:'guide',focus:'narrator',draftVersion:3,narrator:current,prompt:'',traits:{personality:current.personality,speakingStyle:current.speakingStyle,appearance:current.appearance},message:'What should I do next?'};
 for(const message of ['What should I do next?','How does this work?','Help me understand my options.'])assert.equal(creationFixture({...start,message}).guide!.proposal,null);
 const created=creationFixture({...start,message:'Create a narrator from my choices.'}).guide!.proposal!.narrator!;
 assert.equal(created.name,'Nyx');assert.deepEqual(created.personality,current.personality);assert.equal(created.avatar!.form,'cat');
 const renamed=creationFixture({...start,message:'A narrator named Nimbus'}).guide!.proposal!.narrator!;
 assert.equal(renamed.name,'Nimbus');assert.deepEqual(renamed.personality,current.personality);
});

test('direct edits and confirmations reject late proposals and preserve unrelated entities',()=>{
 const made=blueprint(),draft={version:5,...made};
 const proposal={baseVersion:5,narrator:{...AETHER,name:'Nyx'},story:null,hero:null};
 const edited=editCreatorDraft(draft,{story:{...made.story,title:'A title I chose'}})!;
 assert.equal(edited.version,6);assert.equal(applyCreatorProposal(edited,proposal),null);assert.equal(edited.story!.title,'A title I chose');
 const confirmed=applyCreatorProposal(draft,proposal)!;assert.equal(confirmed.narrator!.name,'Nyx');assert.deepEqual(confirmed.hero,made.hero);assert.deepEqual(confirmed.story,made.story);
 assert.equal(applyCreatorProposal(confirmed,proposal),null);
 confirmed.hero!.name='Changed after confirmation';assert.equal(draft.hero.name,made.hero.name);
 const unfinished=editCreatorDraft(draft,{narrator:{...draft.narrator,name:'',persona:'',personality:[]}})!;
 assert.equal(unfinished.narrator!.name,'');assert.equal(parseBlueprint({narrator:unfinished.narrator,story:unfinished.story,hero:unfinished.hero}),null);
 assert.ok(parseCreationRequest({...request,action:'guide',focus:'narrator',draftVersion:unfinished.version,narrator:unfinished.narrator}));
 const typing=editCreatorDraft(draft,{narrator:{...draft.narrator,name:'Morrow '},story:{...draft.story,synopsis:'First sentence.\n\nSecond sentence. '},hero:{...draft.hero,name:'Mira '}})!;
 assert.equal(typing.narrator!.name,'Morrow ');assert.equal(typing.hero!.name,'Mira ');assert.equal(typing.story!.synopsis,'First sentence.\n\nSecond sentence. ');
 const submitted=parseCreationRequest({...request,action:'guide',focus:'narrator',draftVersion:typing.version,narrator:typing.narrator,story:typing.story,hero:typing.hero})!;
 assert.equal(submitted.narrator!.name,'Morrow');assert.equal(submitted.story!.synopsis,'First sentence. Second sentence.');
 assert.equal(editCreatorDraft(draft,{narrator:{...draft.narrator,name:'<script>'}}),null);
});

test('guide request and response validators reject missing versions, empty changes and injected rules',()=>{
 const guide:CreationRequest={...request,action:'guide',focus:'narrator',draftVersion:2};
 assert.equal(parseCreationRequest({...guide,draftVersion:undefined}),null);assert.equal(parseCreationRequest({...guide,draftVersion:-1}),null);assert.equal(parseCreationRequest({...guide,draftVersion:2.5}),null);
 assert.equal(parseCreationRequest({...guide,focus:'inventory'}),null);
 const proposal={baseVersion:2,narrator:AETHER,story:null,hero:null};
 assert.ok(parseCreationResult({reply:'Shall we keep these traits?',guide:{proposal}},guide));
 for(const changes of [{baseVersion:1},{narrator:null},{hero:{...blueprint().hero,hp:999}},{execute:'start-game'}])assert.equal(parseCreationResult({reply:'Shall we keep these traits?',guide:{proposal:{...proposal,...changes}}},guide),null);
 assert.ok(parseCreationResult({reply:'Which traits appeal to you?',guide:{proposal:null}},guide));
});

test('guide speaker is a complete confirmed profile separate from the editable narrator target',()=>{
 const guide:CreationRequest={...request,action:'guide',focus:'narrator',draftVersion:2,guideNarrator:AETHER,narrator:{...AETHER,name:'',personality:['Sarcastic'],avatar:{form:'cat',accessory:'glasses'}}};
 const parsed=parseCreationRequest(guide)!;
 assert.deepEqual(parsed.guideNarrator,AETHER);assert.equal(parsed.narrator!.name,'');assert.equal(parsed.narrator!.avatar!.form,'cat');
 for(const changes of [{name:''},{voice:'arbitrary-provider-id'},{avatar:{form:'cat',accessory:'glasses',url:'https://evil.test'}},{hp:999}])assert.equal(parseCreationRequest({...guide,guideNarrator:{...AETHER,...changes}}),null);
 parsed.guideNarrator!.personality.push('Changed');assert.deepEqual(AETHER.personality,['Patient','Curious']);
});

test('multiline conversation history remains usable on the next creation turn without relaxing boundaries',()=>{
 const history=[{role:'player' as const,text:'A floating city.\n\nNo spiders.\t Keep it gentle.'}];
 const parsed=parseCreationRequest({...request,history})!;
 assert.equal(parsed.history[0].text,'A floating city. No spiders. Keep it gentle.');assert.equal(history[0].text,'A floating city.\n\nNo spiders.\t Keep it gentle.');
 assert.ok(parseCreationRequest({...parsed,action:'guide',focus:'story',draftVersion:1,message:'Make it moonlit.'}));
 for(const text of ['<script>evil</script>','A city.\u0000More text.','x'.repeat(401),'\n\t '])assert.equal(parseCreationRequest({...request,history:[{role:'player',text}]}),null);
});
