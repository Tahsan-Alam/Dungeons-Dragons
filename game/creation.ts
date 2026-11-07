import type {Biome,HeroClass} from './types.ts';
import {HERO_COLORS} from './types.ts';

export const TRAITS={
 personality:['Sarcastic','Bubbly','Compassionate','Mysterious','Playful','Stoic','Curious','Dramatic','Courageous','Gentle'],
 speakingStyle:['Soft-spoken','Theatrical','Dry wit','Poetic','Conversational','Whispery','Booming','Quick-witted','Measured','Lyrical'],
 appearance:['Starry robes','Travel cloak','Clockwork','Woodland','Seafaring','Moonlit','Scholarly','Regal'],
 background:['Wanderer','Scholar','Guardian','Outcast','Artisan','Courtier','Sailor','Healer','Treasure hunter','Apprentice'],
} as const;
export type TraitCategory=keyof typeof TRAITS;
export type TraitSelection=Partial<Record<TraitCategory,string[]>>;
export interface NarratorProfile {name:string;persona:string;personality:string[];speakingStyle:string[];appearance:string[];model:HeroClass;color:string;}
export interface StoryBlueprint {title:string;synopsis:string;timeline:string;world:string;locations:string[];biome:Biome;}
export interface HeroProfile {name:string;background:string;personality:string[];heroClass:HeroClass;color:string;}
export interface AdventureBlueprint {narrator:NarratorProfile;story:StoryBlueprint;hero:HeroProfile;}
export type CreationAction='narrators'|'story'|'heroes'|'hero'|'trait'|'sample';
export interface CreationRequest {action:CreationAction;scope:string;requestId:string;enabled:boolean;prompt:string;message:string;traits:TraitSelection;narratorBrief?:string;candidates?:NarratorProfile[];narrator?:NarratorProfile;story?:StoryBlueprint;hero?:HeroProfile;category?:TraitCategory;value?:string;history:{role:'player'|'narrator';text:string}[];}
export interface CreationResult {source:'fixture'|'openai';reply:string;narrators?:NarratorProfile[];story?:StoryBlueprint;heroes?:HeroProfile[];hero?:HeroProfile;trait?:{accepted:boolean;value:string;suggestion:string};sample?:string;audio?:string|null;}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const prose=(value:unknown):unknown=>typeof value==='string'?value.replace(/[\r\n\t]+/g,' ').replace(/ {2,}/g,' ').trim():Array.isArray(value)?value.map(prose):object(value)?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,prose(item)])):value;
const exact=(v:Record<string,unknown>,keys:string[])=>Object.keys(v).length===keys.length&&keys.every(k=>k in v);
export const creationText=(v:unknown,max:number):v is string=>typeof v==='string'&&!!v.trim()&&v.length<=max&&!/[<>\u0000-\u001f\u007f]/.test(v);
const list=(v:unknown,max=3)=>Array.isArray(v)&&v.length>0&&v.length<=max&&v.every(x=>creationText(x,40))&&new Set(v.map(x=>x.toLowerCase())).size===v.length;
const model=(v:unknown)=>['knight','ranger','mage','cleric'].includes(String(v));
export function parseNarrator(v:unknown):NarratorProfile|null {
 v=prose(v);
 if(!object(v)||!exact(v,['name','persona','personality','speakingStyle','appearance','model','color'])||!creationText(v.name,28)||!creationText(v.persona,240)||!list(v.personality)||!list(v.speakingStyle)||!list(v.appearance)||!model(v.model)||!HERO_COLORS.includes(String(v.color)))return null;
 return structuredClone(v) as unknown as NarratorProfile;
}
export function parseStory(v:unknown,editing=false):StoryBlueprint|null {
 v=prose(v);const text=(value:unknown,max:number)=>creationText(value,max)||(editing&&value==='');
 if(!object(v)||!exact(v,['title','synopsis','timeline','world','locations','biome'])||!text(v.title,80)||!text(v.synopsis,700)||!text(v.timeline,80)||!text(v.world,80)||!Array.isArray(v.locations)||v.locations.length<1||v.locations.length>4||!v.locations.every(l=>text(l,60))||!['woodland','ruins','coast'].includes(String(v.biome)))return null;
 return structuredClone(v) as unknown as StoryBlueprint;
}
export function parseHero(v:unknown,editing=false):HeroProfile|null {
 v=prose(v);const text=(value:unknown,max:number)=>creationText(value,max)||(editing&&value==='');
 if(!object(v)||!exact(v,['name','background','personality','heroClass','color'])||!text(v.name,24)||!text(v.background,240)||(!list(v.personality)&&!(editing&&Array.isArray(v.personality)&&v.personality.length===0))||!model(v.heroClass)||!HERO_COLORS.includes(String(v.color)))return null;
 return structuredClone(v) as unknown as HeroProfile;
}
export function parseBlueprint(v:unknown):AdventureBlueprint|null {
 if(!object(v)||!exact(v,['narrator','story','hero']))return null;
 const narrator=parseNarrator(v.narrator),story=parseStory(v.story),hero=parseHero(v.hero);
 return narrator&&story&&hero?{narrator,story,hero}:null;
}
export function parseCreationRequest(v:unknown):CreationRequest|null {
 if(!object(v)||!['narrators','story','heroes','hero','trait','sample'].includes(String(v.action))||typeof v.enabled!=='boolean'||typeof v.scope!=='string'||!/^[-a-zA-Z0-9]{1,64}$/.test(v.scope)||typeof v.requestId!=='string'||!/^[-a-zA-Z0-9]{1,64}$/.test(v.requestId)||typeof v.prompt!=='string'||v.prompt.length>400||typeof v.message!=='string'||v.message.length>400||!object(v.traits)||Object.entries(v.traits).some(([k,value])=>!(k in TRAITS)||(!list(value,3)&&!(Array.isArray(value)&&value.length===0)))||!Array.isArray(v.history)||v.history.length>6||!v.history.every(h=>object(h)&&['player','narrator'].includes(String(h.role))&&creationText(h.text,400)))return null;
 const narrator=v.narrator===undefined?undefined:parseNarrator(v.narrator),story=v.story===undefined?undefined:parseStory(v.story,true),hero=v.hero===undefined?undefined:parseHero(v.hero,true);
 if(v.narratorBrief!==undefined&&(typeof v.narratorBrief!=='string'||v.narratorBrief.length>400))return null;
 if(v.candidates!==undefined&&(!Array.isArray(v.candidates)||v.candidates.length!==3||v.candidates.some(c=>!parseNarrator(c))))return null;
 if(narrator===null||story===null||hero===null||(['story','heroes','hero','sample'].includes(String(v.action))&&!narrator)||(['heroes','hero'].includes(String(v.action))&&!story))return null;
 if(v.action==='trait'&&(!(String(v.category) in TRAITS)||!creationText(v.value,40)||v.value.trim().split(/\s+/).length>2))return null;
 return {action:v.action as CreationAction,enabled:v.enabled,scope:v.scope,requestId:v.requestId,prompt:v.prompt,message:v.message,traits:structuredClone(v.traits) as TraitSelection,history:structuredClone(v.history) as CreationRequest['history'],...(v.narratorBrief!==undefined?{narratorBrief:v.narratorBrief as string}:{}),...(v.candidates?{candidates:structuredClone(v.candidates) as NarratorProfile[]}:{}),...(narrator?{narrator}:{}),...(story?{story}:{}),...(hero?{hero}:{}),...(v.action==='trait'?{category:v.category as TraitCategory,value:String(v.value).trim()}: {})};
}
const obj=(properties:Record<string,unknown>)=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const plain=(max:number)=>({type:'string',pattern:`^[^<>\\u0000-\\u001f\\u007f]{1,${max}}$`});
const labels={type:'array',minItems:1,maxItems:3,items:{type:'string',pattern:'^[^\\s<>]{1,20}(?: [^\\s<>]{1,19})?$'}};
const narratorSchema=obj({name:plain(28),persona:plain(240),personality:labels,speakingStyle:labels,appearance:labels,model:{type:'string',enum:['knight','ranger','mage','cleric']},color:{type:'string',enum:HERO_COLORS}});
const storySchema=obj({title:plain(80),synopsis:plain(700),timeline:plain(80),world:plain(80),locations:{type:'array',minItems:1,maxItems:4,items:plain(60)},biome:{type:'string',enum:['woodland','ruins','coast']}});
const heroSchema=obj({name:plain(24),background:plain(240),personality:labels,heroClass:{type:'string',enum:['knight','ranger','mage','cleric']},color:{type:'string',enum:HERO_COLORS}});
export function creationSchema(action:CreationAction,category?:TraitCategory){return obj({reply:plain(400),...(action==='narrators'?{narrators:{type:'array',minItems:3,maxItems:3,items:narratorSchema}}:action==='story'?{story:storySchema}:action==='heroes'?{heroes:{type:'array',minItems:3,maxItems:3,items:heroSchema}}:action==='hero'?{hero:heroSchema}:action==='trait'?{trait:obj({accepted:{type:'boolean'},suggestion:{type:'string',enum:category?[...TRAITS[category]]:[...TRAITS.personality]}})}:{sample:plain(180)})});}
export function parseCreationResult(v:unknown,request:CreationRequest):CreationResult|null {
 // Model prose may contain paragraph breaks. Flatten whitespace for plain-text
 // cards and read-aloud input; markup and other control characters still fail.
 v=prose(v);
 const key=request.action==='narrators'?'narrators':request.action==='heroes'?'heroes':request.action==='sample'?'sample':request.action;
 if(!object(v)||!exact(v,['reply',key])||!creationText(v.reply,400))return null;
 const base={reply:v.reply,source:'openai' as const};
 if(key==='narrators'||key==='heroes'){
  const values=v[key];if(!Array.isArray(values)||values.length!==3)return null;
  const parsed=values.map(value=>key==='narrators'?parseNarrator(value):parseHero(value));if(parsed.some(x=>!x)||new Set(parsed.map(x=>x!.name.toLowerCase())).size!==3)return null;
  return {...base,[key]:parsed};
 }
 if(key==='story'){const story=parseStory(v.story);return story?{...base,story}:null;}
 if(key==='hero'){const hero=parseHero(v.hero);return hero?{...base,hero}:null;}
 if(key==='trait'){
  const t=v.trait;if(!object(t)||!(exact(t,['accepted','value','suggestion'])||exact(t,['accepted','suggestion']))||typeof t.accepted!=='boolean'||!creationText(request.value,40)||!creationText(t.suggestion,40)||t.suggestion.trim().split(/\s+/).length>2||('value'in t&&(typeof t.value!=='string'||t.value.toLowerCase()!==request.value.toLowerCase())))return null;
  return {...base,trait:{accepted:t.accepted,value:request.value,suggestion:t.suggestion}};
 }
 return creationText(v.sample,600)?{...base,sample:v.sample}:null;
}
export function creationFixture(r:CreationRequest):CreationResult {
 const personality=r.traits.personality??['Curious'],style=r.traits.speakingStyle??['Conversational'],appearance=r.traits.appearance??['Travel cloak'];
 if(r.action==='trait'){
  const value=r.value!,category=r.category!,known=Object.values(TRAITS).flat().some(t=>t.toLowerCase()===value.toLowerCase());
  const customFits={personality:/^(kind|patient|sassy|optimistic|brave|reserved|warm|wry|deadpan|quietly confident)$/i,speakingStyle:/^(eloquent|raspy|breathy|gruff|silvery|deadpan|warm|wry)$/i,appearance:/^(armored|astral|ethereal|shadowy|feathered)$/i,background:/^(bard|ranger|knight|mage|cleric|druid|noble|monk|blacksmith|cartographer)$/i};
  const accepted=TRAITS[category].some(t=>t.toLowerCase()===value.toLowerCase())||(!known&&customFits[category].test(value));
  return {source:'fixture',reply:accepted?`${value} fits. I’ve added it.`:`“${value}” does not clearly describe ${category==='speakingStyle'?'a speaking style':category}. Try ${TRAITS[category][0]}.`,trait:{accepted,value,suggestion:TRAITS[category][0]}};
 }
 if(r.action==='narrators')return {source:'fixture',reply:r.message?`Here are three takes on your direction: ${r.message.slice(0,160)}`:'Three guides, each with a different way into your story.',narrators:[
  {name:'Morrow',persona:`A wandering archivist who finds a secret in every footnote. ${r.message.slice(0,100)}`.trim(),personality:[...new Set([...personality,'Mysterious'])].slice(0,3),speakingStyle:style,appearance,model:'mage',color:HERO_COLORS[3]},
  {name:'Tansy',persona:'A buoyant trail guide who treats a dangerous quest like an invitation to tea.',personality:[...new Set([...personality,'Bubbly'])].slice(0,3),speakingStyle:[...new Set([...style,'Quick-witted'])].slice(0,3),appearance,model:'ranger',color:HERO_COLORS[4]},
  {name:'Brindle',persona:'An old knight with a dry observation for every impossible doorway.',personality:[...new Set([...personality,'Sarcastic'])].slice(0,3),speakingStyle:[...new Set([...style,'Dry wit'])].slice(0,3),appearance,model:'knight',color:HERO_COLORS[0]},
 ]};
 if(r.action==='story'){
  const previous=r.story,seed=r.prompt.trim()||'A city built on a sleeping dragon has lost its guiding star.';
  return {source:'fixture',reply:r.message?'I’ve kept your premise and woven in that direction. You can edit every detail below.':'A small beginning, with room for a very strange journey.',story:{title:previous?.title??'The Star Beneath the City',synopsis:r.message?`${(previous?.synopsis??seed).slice(0,380)} ${r.message.slice(0,220)}`:`${seed} Guided by ${r.narrator!.name}, a band of unlikely heroes must recover the lantern shards before the paths between villages vanish. Their final choice will bring the lost light home.`,timeline:previous?.timeline??'An age of wandering magic',world:previous?.world??'Asterfall',locations:previous?.locations??['Starfall market','The hollow observatory','The lantern gate'],biome:previous?.biome??'ruins'}};
 }
 const story=r.story!;
 if(r.action==='hero')return {source:'fixture',reply:'Here is your character. Adjust their name, class or background before continuing.',hero:{name:r.hero?.name??'Wren',heroClass:r.hero?.heroClass??'ranger',color:r.hero?.color??HERO_COLORS[4],background:(r.message?`${r.message.slice(0,180)} A traveler of ${story.world}.`:`A ${r.traits.background?.join(', ').toLowerCase()??'wanderer'} from ${story.locations[0]}.`).slice(0,240),personality}};
 if(r.action==='heroes')return {source:'fixture',reply:`Three heroes with a reason to explore ${story.world}.`,heroes:[
  {name:'Wren',heroClass:'ranger',color:HERO_COLORS[4],background:`A mapmaker from ${story.locations[0]}, following a trail only they can see.`,personality:['Curious','Courageous']},
  {name:'Orin',heroClass:'mage',color:HERO_COLORS[3],background:`An apprentice studying the strange magic of ${story.world}.`,personality:['Playful','Mysterious']},
  {name:'Sable',heroClass:'cleric',color:HERO_COLORS[2],background:`A healer who promised to bring the light back to ${story.locations[0]}.`,personality:['Compassionate','Stoic']},
 ]};
 return {source:'fixture',reply:'Live voice previews need unlocked team AI and paid audio. The sample text is still here.',sample:`Come closer, traveler. I am ${r.narrator!.name}. ${r.prompt.slice(0,120)||'Beyond that ordinary door waits a most extraordinary adventure.'}`};
}
export function narratorTone(profile:NarratorProfile):'warm'|'wry'|'dramatic'{return profile.personality.includes('Sarcastic')?'wry':profile.personality.includes('Dramatic')?'dramatic':'warm';}
