import {HERO_CLASSES,HERO_COLORS,type HeroClass} from './types.ts';
import {isPortraitId,parseHero,type HeroProfile} from './creation.ts';
import {ownPortrait,parsePaintings,type OwnMode} from './own-paintings.ts';
import {PLAYS_AS,ROLE,type ClassName,type Role} from './presets.ts';

/**
 * "Your own hero": the seventeenth card on the Hero step. The player names them, picks one of the eight classes
 * and a colour, and may say who they are; the result is an ordinary hero profile checked by parseHero, the same
 * boundary as every other hero. The class sets every rule. A painted portrait, if chosen, is only a server id.
 */
/** Like your own Game Master: drawn, or painted from the player's description (mode, portrait and paintings as there). */
export interface OwnHeroInput {name:string;heroClass:HeroClass;color:string;who:string;mode?:OwnMode;portrait?:string;paintings?:string[]}
export const OWN_HERO_DEFAULT:OwnHeroInput={name:'',heroClass:'ranger',color:HERO_COLORS[8],who:'',mode:'draw',paintings:[]};
/** Names the player can start from; never sent anywhere. */
export const OWN_HERO_NAME_IDEAS=['Tamsin','Rook','Wynn','Odalys','Bram','Sorrel'];

const CLASS_NAME=Object.fromEntries(Object.entries(PLAYS_AS).map(([name,heroClass])=>[heroClass,name])) as Record<HeroClass,ClassName>;
export const ownHeroClassName=(heroClass:HeroClass):ClassName=>CLASS_NAME[heroClass];
export const ownHeroRole=(heroClass:HeroClass):Role=>ROLE[CLASS_NAME[heroClass]];
/** Two traits per class, so a hero made in a moment still reads as a person in narration. */
const TRAITS:Record<HeroClass,[string,string]>={knight:['Brave','Steady'],guardian:['Loyal','Patient'],rogue:['Quick','Sly'],ranger:['Watchful','Quiet'],
 mage:['Curious','Bold'],cleric:['Kind','Stubborn'],bard:['Charming','Restless'],druid:['Calm','Wild']};
const clean=(text:string)=>text.replace(/[<>\u0000-\u001f\u007f]/g,'').replace(/\s+/g,' ').trim();

/** The hero profile for these choices, or null while the name is missing or anything fails validation. */
export function ownHero(input:OwnHeroInput):HeroProfile|null{
 const name=clean(input.name).slice(0,24);
 if(!name||!HERO_CLASSES.includes(input.heroClass))return null;
 const background=clean(input.who).slice(0,240)||`${name}, a ${ownHeroClassName(input.heroClass).toLowerCase()} the Lantern Marches haven’t heard of yet.`;
 return parseHero({name,background,personality:[...TRAITS[input.heroClass]],heroClass:input.heroClass,color:input.color,...(ownPortrait(input)?{portrait:ownPortrait(input)}:{})});
}

/** Restores saved choices, falling back to the defaults for anything that is no longer valid. */
export function parseOwnHeroInput(raw:unknown):OwnHeroInput{
 const v=raw&&typeof raw==='object'?raw as Partial<OwnHeroInput>:{};
 return {
  name:typeof v.name==='string'?v.name.slice(0,24):'',who:typeof v.who==='string'?v.who.slice(0,240):'',
  heroClass:HERO_CLASSES.includes(v.heroClass as HeroClass)?v.heroClass!:OWN_HERO_DEFAULT.heroClass,
  color:HERO_COLORS.includes(String(v.color))?v.color!:OWN_HERO_DEFAULT.color,
  // Creations saved before the two modes kept a chosen painting: they open painted, with it in their list.
  mode:v.mode==='paint'||(v.mode===undefined&&isPortraitId(v.portrait))?'paint':'draw',paintings:parsePaintings([...(Array.isArray(v.paintings)?v.paintings:[]),v.portrait]),
  ...(isPortraitId(v.portrait)?{portrait:v.portrait}:{}),
 };
}
