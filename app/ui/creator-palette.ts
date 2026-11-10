import {AETHER} from '../../game/creation.ts';
import type {NarratorProfile} from '../../game/creation.ts';

const SWATCHES = {
 violet:{primary:'#7355b9',secondary:'#b39bea'},
 rose:{primary:'#b04476',secondary:'#f0aac5'},
 amber:{primary:'#946017',secondary:'#edc070'},
 teal:{primary:'#247b71',secondary:'#8cd5bc'},
 blue:{primary:'#386aa6',secondary:'#93c4f0'},
 coral:{primary:'#ad503a',secondary:'#efaa8c'},
};
type Hue=keyof typeof SWATCHES;
const ASSOCIATIONS:Record<string,Hue>={sarcastic:'violet',bubbly:'rose',compassionate:'teal',mysterious:'violet',playful:'amber',stoic:'blue',curious:'teal',dramatic:'coral',courageous:'coral',gentle:'teal','soft-spoken':'blue',theatrical:'coral','dry wit':'violet',poetic:'violet',conversational:'amber',whispery:'blue',booming:'coral','quick-witted':'amber',measured:'blue',lyrical:'rose','starry robes':'violet','travel cloak':'amber',clockwork:'amber',woodland:'teal',seafaring:'blue',moonlit:'blue',scholarly:'violet',regal:'amber',cat:'violet',owl:'blue',fox:'amber',dragon:'coral',human:'teal'};
const customHue=(text:string):Hue=>Object.keys(SWATCHES)[Array.from(text.toLowerCase()).reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,0)%6] as Hue;
export const isUnformedNarrator=(profile:NarratorProfile)=>JSON.stringify(profile)===JSON.stringify(AETHER);
/** Personality has the strongest vote; delivery and appearance add secondary colors.
 * Ignore untouched Aether defaults, so a first choice has an immediate visible effect.
 * Pure and order-independent: re-rendering and Paint/Pixel never change identity.
 */
export function creatorPalette(profile:NarratorProfile){
 if(isUnformedNarrator(profile))return {primary:'#202127',secondary:'#b9bac3',neutral:true,label:'Unformed'};
 const scores=new Map<Hue,number>();
 const vote=(text:string,weight:number)=>{const hue=ASSOCIATIONS[text.toLowerCase()]??customHue(text);scores.set(hue,(scores.get(hue)??0)+weight);};
 for(const [key,weight] of [['personality',4],['speakingStyle',2],['appearance',1]] as const){
  for(const trait of profile[key])if(!AETHER[key].includes(trait))vote(trait,weight);
 }
 if(profile.avatar?.form&&profile.avatar.form!=='spirit')vote(profile.avatar.form,1);
 const ranked=[...scores.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
 const first=ranked[0]?.[0]??'violet',second=ranked[1]?.[0];
 return {...SWATCHES[first],secondary:second?SWATCHES[second].secondary:SWATCHES[first].secondary,neutral:false,label:first};
}
