import {HERO_COLORS,type HeroClass} from './types.ts';
import {NARRATOR_ACCESSORIES,NARRATOR_FORMS,isPortraitId,parseNarrator,type NarratorAvatar,type NarratorProfile} from './creation.ts';
import {GAME_MASTERS} from './presets.ts';
import {ownPortrait,parsePaintings,type OwnMode} from './own-paintings.ts';

/**
 * "Create your own Game Master": the fourth card on the Game Master step. The player names them, says who they are,
 * picks how they tell it and how they look; the result is an ordinary narrator profile that passes the same validation
 * as an AI-made one. Your own Game Master keeps no sealed notes (those belong to the three built-in Game Masters).
 */
export type OwnTone='hopeful'|'wry'|'grave';
export interface OwnGameMasterInput {name:string;who:string;tone:OwnTone;form:NarratorAvatar['form'];accessory:NarratorAvatar['accessory'];color:string;
 /** Draw them (shape, colour, what they wear) or paint them with the image AI from the player's own description. */
 mode?:OwnMode;
 /** The painting the player chose (app/api/ai/paint), used only in paint mode. */
 portrait?:string;
 /** Every painting made for them so far (newest first), so the player can choose among them. */
 paintings?:string[]}


export const OWN_TONES:readonly {id:OwnTone;label:string;tells:string;sample:string}[]=[
 {id:'hopeful',label:'Hopeful',tells:'Tells it with hope',sample:'Every road keeps a light somewhere. Let’s go and find this one.'},
 {id:'wry',label:'Wry',tells:'Tells it with a smile',sample:'A cursed road, a missing shard and you. I’ve had worse odds. Not many.'},
 {id:'grave',label:'Grave',tells:'Tells it at a cost',sample:'The road is listening. Walk it as if every step will be remembered.'},
];
const TRAITS:Record<OwnTone,{personality:string[];speakingStyle:string[];voice:NarratorProfile['voice']}>={
 hopeful:{personality:['Warm','Curious'],speakingStyle:['Hopeful','Gentle'],voice:'cedar'},
 wry:{personality:['Sarcastic','Sharp'],speakingStyle:['Dry','Amused'],voice:'willow'},
 grave:{personality:['Dramatic','Grim'],speakingStyle:['Low','Spare'],voice:'stone'},
};
export const OWN_FORMS:readonly {id:NarratorAvatar['form'];label:string;model:HeroClass}[]=[
 {id:'human',label:'Person',model:'ranger'},{id:'spirit',label:'Spirit',model:'mage'},{id:'cat',label:'Cat',model:'knight'},
 {id:'owl',label:'Owl',model:'cleric'},{id:'fox',label:'Fox',model:'rogue'},{id:'dragon',label:'Dragon',model:'guardian'},
];
export const OWN_ACCESSORIES:readonly {id:NarratorAvatar['accessory'];label:string}[]=[{id:'none',label:'Nothing'},{id:'glasses',label:'Glasses'},{id:'crown',label:'A crown'}];

export const OWN_DEFAULT:OwnGameMasterInput={name:'',who:'',tone:'hopeful',form:'owl',accessory:'none',color:HERO_COLORS[6],mode:'draw',paintings:[]};
/** Names the player can start from; never sent anywhere. */
export const OWN_NAME_IDEAS=['The Lamplighter','Old Mother Reed','The Ferryman','Captain Wren','The Archivist','Bramble'];

/** The built-in Game Masters' names are theirs: the game recognises them by name (their art, their sealed notes). */
export const ownNameTaken=(name:string)=>GAME_MASTERS.some(g=>[g.profile.name,g.title,g.realName].some(n=>n.toLowerCase()===clean(name).toLowerCase()));
const clean=(text:string)=>text.replace(/[<>\u0000-\u001f\u007f]/g,'').replace(/\s+/g,' ').trim();

/** The narration voice for a tone (it also picks what the drawing carries). */
export const ownVoice=(tone:OwnTone)=>TRAITS[tone].voice;

/** The narrator profile for these choices, or null while the name is missing or anything fails validation. */
export function ownGameMaster(input:OwnGameMasterInput):NarratorProfile|null{
 const name=clean(input.name).slice(0,28),tone=TRAITS[input.tone],form=OWN_FORMS.find(f=>f.id===input.form);
 if(!name||ownNameTaken(name)||!tone||!form||!NARRATOR_FORMS.includes(input.form)||!NARRATOR_ACCESSORIES.includes(input.accessory))return null;
 const who=clean(input.who).slice(0,200)||`${name}, who has walked the Lantern Marches longer than anyone remembers.`;
 const accessory=OWN_ACCESSORIES.find(a=>a.id===input.accessory)!;
 const appearance=[form.label,...(input.accessory==='none'?[]:[accessory.label.replace(/^A /,'')])];
 return parseNarrator({name,persona:who,personality:tone.personality,speakingStyle:tone.speakingStyle,appearance,model:form.model,color:input.color,
  avatar:{form:input.form,accessory:input.accessory},voice:tone.voice,...(ownPortrait(input)?{portrait:ownPortrait(input)}:{})});
}

/** Restores saved choices, falling back to the defaults for anything that is no longer valid. */
export function parseOwnInput(raw:unknown):OwnGameMasterInput{
 const v=raw&&typeof raw==='object'?raw as Partial<OwnGameMasterInput>:{};
 return {
  name:typeof v.name==='string'?v.name.slice(0,28):'',who:typeof v.who==='string'?v.who.slice(0,200):'',
  tone:OWN_TONES.some(t=>t.id===v.tone)?v.tone!:OWN_DEFAULT.tone,
  form:OWN_FORMS.some(f=>f.id===v.form)?v.form!:OWN_DEFAULT.form,
  accessory:OWN_ACCESSORIES.some(a=>a.id===v.accessory)?v.accessory!:OWN_DEFAULT.accessory,
  color:HERO_COLORS.includes(String(v.color))?v.color!:OWN_DEFAULT.color,
  // Creations saved before the two modes kept a chosen painting: they open painted, with it in their list.
  mode:v.mode==='paint'||(v.mode===undefined&&isPortraitId(v.portrait))?'paint':'draw',paintings:parsePaintings([...(Array.isArray(v.paintings)?v.paintings:[]),v.portrait]),
  ...(isPortraitId(v.portrait)?{portrait:v.portrait}:{}),
 };
}
