import type {GameOptions, GameState, PlayerSpec, HeroClass} from './types.ts';
import {HERO_COLORS} from './types.ts';
export interface CharacterRecipe {id:string; name:string; heroClass:HeroClass; color:string; personality:string;}
export interface Campaign {title:string; premise:string; resolution?:string; facts:string[]; chapters:string[]; characters:CharacterRecipe[]; source:'fixture'|'openai';}
export interface StoryRecord {eventId:number; caption:string; source:'fixture'|'openai';}
export interface StoryDirection {prompt:string; pace:'steady'|'brisk'; endAfterChapter:boolean;}
export interface ChapterMemory {chapter:number; title:string; summary:string;}
export interface StoryState {campaign:Campaign; narrations:StoryRecord[]; direction?:StoryDirection; memories?:ChapterMemory[];}
export const cleanPrompt=(value:unknown,limit=400)=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f<>]/g,' ').trim().slice(0,limit):'';
const pick=(seed:string,values:readonly string[])=>{let h=2166136261;for(const c of seed)h=Math.imul(h^c.charCodeAt(0),16777619);return values[(h>>>0)%values.length];};
export function campaignFixture(options:GameOptions,players:PlayerSpec[]):Campaign {
 const motif=pick(options.seed,['a wandering lantern keeper','a missing courier','a patient mapmaker','a stranded musician']);
 const count=options.duration==='short'?1:options.duration==='long'?5:3,shards=count===3?'three':String(count);
 const created=options.creation;
 return {title:created?.story.title??pick(options.seed+'title',['The Lantern Promise','Letters by Moonlight','The Last Beacon']),
  premise:created?.story.synopsis??`In the ${options.biome}, ${motif} needs the ${shards} lantern shards restored. ${cleanPrompt(options.storyPrompt)}`.trim(),
  ...(created?{resolution:`The recovered shards light the gateway of ${created.story.world}. ${created.hero.name} and the party have brought the lantern home. ${created.narrator.name} closes this chapter, leaving its next unwritten page to you.`.slice(0,400)}:{}),
  facts:[`The party cooperates to recover ${shards} lantern shards.`,'Each chapter has one chest and one gateway.','Only committed game events establish outcomes.',...(created?[`World: ${created.story.world}. Timeline: ${created.story.timeline}.`,`Key locations: ${created.story.locations.join(', ')}.`,`Narrator: ${created.narrator.name}, ${created.narrator.persona}`]:[])],
  chapters:Array.from({length:count},(_,i)=>i===count-1?'Restore the lantern with the final shard.':i===0?'Find the first shard.':i===1?'Recover the second shard.':`Recover shard ${i+1}.`),
  characters:players.map(p=>({id:p.id,name:p.bot?pick(options.seed+p.id,['Rowan','Fern','Wren','Clover','Bramble'])+' '+(players.indexOf(p)+1):p.name,heroClass:p.heroClass,color:p.color,
   personality:!p.bot&&created?`${created.hero.personality.join(', ')}. ${created.hero.background}`.slice(0,160):cleanPrompt(options.characterPrompt)||pick(options.seed+p.id+'trait',['Curious and careful','Loyal and wry','Quietly courageous'])})),source:'fixture'};
}

/** The ending is an engine-owned chapter boundary, never a model instruction. */
export function storyGoal(game:GameState):number {
 const selected=game.options.duration==='short'?1:game.options.duration==='long'?5:3;
 return game.story?.direction?.endAfterChapter?Math.min(selected,game.scene+1):selected;
}

export function applyStoryDirection(game:GameState,text:string):GameState {
 if(!game.story||game.status!=='playing')throw new Error('Start an active adventure to steer the story.');
 const prompt=cleanPrompt(text);if(!prompt)throw new Error('Describe the direction you would like.');
 const previous=game.story.direction??{prompt:'',pace:'steady' as const,endAfterChapter:false};
 const control=prompt.normalize('NFKC').replace(/[\u2018\u2019\u02bc]/g,"'").replace(/[.,!?;:]/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
 // Only complete, explicit controls change the chapter boundary. Creative clauses
 // such as “finish the story with a dragon” remain creative direction.
 const keepGoing=/^(?:please )?(?:keep (?:going|adventuring)|continue (?:the |this |our )?(?:adventure|quest|story)|cancel (?:the )?(?:early )?ending)(?: please)?$/.test(control)||
  /^(?:please )?(?:i |we )?(?:don't|do not|never|not)(?: (?:want|wish) to)? (?:end|finish|stop|wrap up)(?: (?:the|this|our|my) (?:adventure|quest|game|story))?(?: (?:yet|now|soon|early|here|after this chapter))?(?: please)?$/.test(control)||
  /^(?:please )?(?:(?:i |we )?(?:don't|do not|never|not) want (?:an? |the )?|no )(?:early )?ending(?: yet)?(?: please)?$/.test(control);
 const ending=!keepGoing&&/^(?:(?:please|can we|could we|let's|i want to|we want to|i would like to) )?(?:(?:end|finish|stop)(?: (?:the|this|our|my) (?:adventure|quest|game|story))?(?: (?:now|soon|early|here|after (?:this|the current) chapter))?|wrap(?: it)? up(?: (?:now|soon|after this chapter))?)$/.test(control);
 const steady=/\b(don't|do not|never|not)\s+(?:want\s+to\s+)?(?:hurry|speed\s*up|rush)|\b(slower|slow\s+down|steady\s+pace)\b/.test(control);
 const brisk=!steady&&/\b(faster|hurry|quicker|speed\s*up|brisk|pick\s+up\s+the\s+pace)\b/.test(control);
 const controlOnly=ending||keepGoing||/^(pick up the pace|a little faster|quicker pace|slow down)$/.test(control);
 const direction:StoryDirection={...previous,prompt:controlOnly?previous.prompt:prompt,pace:steady?'steady':brisk||ending?'brisk':previous.pace,endAfterChapter:keepGoing?false:previous.endAfterChapter||ending};
 const eventId=game.eventSequence+1;
 const message=ending?'The party will bring this adventure to a close at this chapter’s gateway. Finish the encounter and collect its shard first.':keepGoing?'The party will continue toward the planned ending. The early ending has been cancelled.':brisk?'The storyteller will keep narration brief and focus on the next objective.':'The storyteller has saved the party’s new creative direction.';
 return {...game,eventSequence:eventId,story:{...game.story,direction},events:[...game.events,{id:eventId,kind:'story' as const,text:message}].slice(-180)};
}

/** Always available, including while another player is taking a turn. */
export function guidanceFixture(game:GameState,text:string,playerId:string):string {
 if(game.status==='victory')return 'The lantern is restored. Your adventure is complete; return to Adventures to replay it or start a new quest.';
 if(game.status==='defeat')return 'The party has fallen. You can replay the adventure or try a new quest with more companions.';
 if(/\b(end|finish|wrap|ending|stop\s+soon)\b/i.test(text))return game.story?.direction?.endAfterChapter?'We’ll end at this chapter’s gateway, after you defeat its guardians and collect the shard.':'The host can choose “End after this chapter”. You’ll still finish this encounter and collect its shard before a short closing scene.';
 if(/\b(faster|hurry|quicker|speed\s*up|brisk|pace)\b/i.test(text))return game.story?.direction?.pace==='brisk'?'I’ll keep narration brief and guide you toward the next objective. Turns and dice still follow the game rules.':'The host can choose “Quicker pace” for shorter narration and direct guidance. Turns and dice still follow the game rules.';
 const active=game.actors.find(a=>a.id===game.activeActorId),mine=game.actors.find(a=>a.playerId===playerId);
 if(active?.playerId!==playerId)return `It’s ${active?.name??'another hero'}’s turn. You can inspect the board and plan your next move. ${game.objective}`;
 if(mine&&mine.hp<=0)return 'Your hero is down. Your companions can heal you; use End turn when it is your turn to let them act.';
 const clear=!game.actors.some(a=>a.enemy&&a.hp>0&&!a.defeated);
 if(clear)return game.chest.opened?`Move beside the glowing gateway, then choose ${game.scene>=storyGoal(game)-1?'Finish adventure':'Next chapter'}.`:'Move beside the chest, then choose Loot chest to collect the shard.';
 if(mine?.actionUsed)return 'Your action is spent. You can use any remaining movement, then choose End turn so your companions can act.';
 return 'Move onto a highlighted tile, choose Attack or your class power, then select a reachable target. Roll d20 to confirm. Guard protects you when no target is in range; End turn lets your companions act.';
}

export function rememberChapter(game:GameState):void {
 if(!game.story)return;
 const memories=game.story.memories??[];
 if(memories.some(m=>m.chapter===game.scene+1))return;
 game.story.memories=[...memories,{chapter:game.scene+1,title:game.sceneName,summary:`The party defeated the guardians in ${game.sceneName}, recovered shard ${game.relics}, and reached the gateway. ${game.actors.filter(a=>!a.enemy).map(a=>a.name).join(', ')} continue together.`.slice(0,600)}].slice(-5);
}
const text=(v:unknown,n:number):v is string=>typeof v==='string'&&v.trim().length>0&&v.length<=n&&!/[<>\u0000-\u001f]/.test(v);
const exact=(o:Record<string,unknown>,keys:string[])=>Object.keys(o).length===keys.length&&keys.every(k=>k in o);
export function parseCampaign(value:unknown,base:Campaign):Campaign|null {
 if(!value||typeof value!=='object')return null;
 const v=value as Record<string,unknown>;
 if(!(exact(v,['title','premise','characters'])||exact(v,['title','premise','resolution','characters']))||!text(v.title,80)||!text(v.premise,700)||('resolution'in v&&!text(v.resolution,400))||!Array.isArray(v.characters)||v.characters.length!==base.characters.length)return null;
 const characters:CharacterRecipe[]=[];
 for(let i=0;i<v.characters.length;i++){
  const c=v.characters[i] as CharacterRecipe,b=base.characters[i];
  if(!c||!exact(c as unknown as Record<string,unknown>,['id','name','heroClass','color','personality'])||c.id!==b.id||c.heroClass!==b.heroClass||!text(c.name,28)||!HERO_COLORS.includes(c.color)||!text(c.personality,160))return null;
  characters.push({...c});
 }
 return {...base,title:v.title,premise:v.premise,...('resolution'in v?{resolution:v.resolution as string}:{}),characters,source:'openai'};
}
export function installCampaign(game:GameState,campaign:Campaign):GameState {
 const next=structuredClone(game);next.story={campaign:structuredClone(campaign),narrations:[]};
 for(const actor of next.actors){const c=campaign.characters.find(c=>c.id===actor.playerId);if(c){actor.color=c.color;if(actor.bot)actor.name=c.name;}}
 return next;
}
export function narrationFixture(game:GameState):StoryRecord {
 const opening=game.options.creation&&game.scene===0&&game.events.every(e=>e.kind==='story'||e.kind==='system')?game.options.creation.story.synopsis+' ':'';
 return {eventId:game.eventSequence,caption:(opening+game.events.slice(game.story?.direction?.pace==='brisk'?-1:-3).map(e=>e.text).join(' ')).slice(0,800)||game.objective,source:'fixture'};
}
export function acceptNarration(game:GameState,record:StoryRecord):GameState {
 if(!game.story||record.eventId!==game.eventSequence)throw new Error('The story moved on. Request narration again.');
 if(game.story.narrations.some(n=>n.eventId===record.eventId))return game;
 return {...game,story:{...game.story,narrations:[...game.story.narrations,record]}};
}
