import type {GameOptions, GameState, PlayerSpec, HeroClass} from './types.ts';
import {HERO_COLORS} from './types.ts';
export interface CharacterRecipe {id:string; name:string; heroClass:HeroClass; color:string; personality:string;}
export interface Campaign {title:string; premise:string; facts:string[]; chapters:string[]; characters:CharacterRecipe[]; source:'fixture'|'openai';}
export interface StoryRecord {eventId:number; caption:string; source:'fixture'|'openai';}
export interface StoryState {campaign:Campaign; narrations:StoryRecord[];}
export const cleanPrompt=(value:unknown,limit=400)=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f<>]/g,' ').trim().slice(0,limit):'';
const pick=(seed:string,values:readonly string[])=>{let h=2166136261;for(const c of seed)h=Math.imul(h^c.charCodeAt(0),16777619);return values[(h>>>0)%values.length];};
export function campaignFixture(options:GameOptions,players:PlayerSpec[]):Campaign {
 const motif=pick(options.seed,['a wandering lantern keeper','a missing courier','a patient mapmaker','a stranded musician']);
 return {title:pick(options.seed+'title',['The Lantern Promise','Letters by Moonlight','The Last Beacon']),
  premise:`In the ${options.biome}, ${motif} needs the three lantern shards restored. ${cleanPrompt(options.storyPrompt)}`.trim(),
  facts:['The party cooperates to recover three lantern shards.','Each chapter has one chest and one gateway.','Only committed game events establish outcomes.'],
  chapters:['Find the first shard.','Recover the second shard.','Restore the lantern with the final shard.'],
  characters:players.map(p=>({id:p.id,name:p.bot?pick(options.seed+p.id,['Rowan','Fern','Wren','Clover','Bramble'])+' '+(players.indexOf(p)+1):p.name,heroClass:p.heroClass,color:p.color,
   personality:cleanPrompt(options.characterPrompt)||pick(options.seed+p.id+'trait',['Curious and careful','Loyal and wry','Quietly courageous'])})),source:'fixture'};
}
const text=(v:unknown,n:number):v is string=>typeof v==='string'&&v.trim().length>0&&v.length<=n&&!/[<>\u0000-\u001f]/.test(v);
const exact=(o:Record<string,unknown>,keys:string[])=>Object.keys(o).length===keys.length&&keys.every(k=>k in o);
export function parseCampaign(value:unknown,base:Campaign):Campaign|null {
 if(!value||typeof value!=='object')return null;
 const v=value as Record<string,unknown>;
 if(!exact(v,['title','premise','characters'])||!text(v.title,80)||!text(v.premise,700)||!Array.isArray(v.characters)||v.characters.length!==base.characters.length)return null;
 const characters:CharacterRecipe[]=[];
 for(let i=0;i<v.characters.length;i++){
  const c=v.characters[i] as CharacterRecipe,b=base.characters[i];
  if(!c||!exact(c as unknown as Record<string,unknown>,['id','name','heroClass','color','personality'])||c.id!==b.id||c.heroClass!==b.heroClass||!text(c.name,28)||!HERO_COLORS.includes(c.color)||!text(c.personality,160))return null;
  characters.push({...c});
 }
 return {...base,title:v.title,premise:v.premise,characters,source:'openai'};
}
export function installCampaign(game:GameState,campaign:Campaign):GameState {
 const next=structuredClone(game);next.story={campaign:structuredClone(campaign),narrations:[]};
 for(const actor of next.actors){const c=campaign.characters.find(c=>c.id===actor.playerId);if(c){actor.color=c.color;if(actor.bot)actor.name=c.name;}}
 return next;
}
export function narrationFixture(game:GameState):StoryRecord {
 return {eventId:game.eventSequence,caption:game.events.slice(-3).map(e=>e.text).join(' ').slice(0,800)||game.objective,source:'fixture'};
}
export function acceptNarration(game:GameState,record:StoryRecord):GameState {
 if(!game.story||record.eventId!==game.eventSequence)throw new Error('The story moved on. Request narration again.');
 if(game.story.narrations.some(n=>n.eventId===record.eventId))return game;
 return {...game,story:{...game.story,narrations:[...game.story.narrations,record]}};
}
