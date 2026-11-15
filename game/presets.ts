import {HERO_COLORS} from './types.ts';
import type {Biome,HeroClass} from './types.ts';
import type {HeroProfile,NarratorProfile,StoryBlueprint} from './creation.ts';

/* Built-in Game Masters, tales and heroes. Each preset carries the same validated profile the AI produces
   (NarratorProfile, StoryBlueprint, HeroProfile), so built-in and generated content mix freely: any hero can
   join any tale, and any Game Master can tell a custom story. The presentation fields (art, face centre,
   epithet) only drive the interface. */

/** Where a face sits in a drawing, as fractions of the art's width and height. Used to crop portraits. */
export interface FaceCentre {x:number;y:number}
/** Fraction of the art's height where every figure's boots meet the ground. */
export const HERO_FEET=0.955;
export const GAME_MASTER_FEET=0.935;
export const HERO_ART_RATIO=376/488;
export const GAME_MASTER_ART_RATIO=400/520;

export type GameMasterId='wanderer'|'survivor'|'cursed';
/** `lines` are what the Game Master says on the Tale and Set Out screens; `scene` is their backdrop on the selection screen. */
export interface GameMasterPreset {id:GameMasterId;title:string;realName:string;mood:string;tone:string;style:string;excerpt:string;quote:string;art:string;scene:string;face:FaceCentre;lines:{tale:string;setOut:string};profile:NarratorProfile}

export const GAME_MASTERS:readonly GameMasterPreset[]=[
 {id:'wanderer',title:'The Wanderer',realName:'Oswin Marsh',mood:'Optimistic',tone:'Tells it with hope',style:'Hopeful · Curious · Without judgment',
  excerpt:'His wife asked one thing before she died. So he walks from fire to fire, carrying other people’s stories from one place to the next: heroes, villains and everyone caught between.',
  quote:'Don’t let the stories die with the people who lived them.',art:'/art/game-masters/wanderer.svg',scene:'/art/scenes/gm-wanderer.svg',face:{x:.50,y:.28},
  lines:{tale:'Every road keeps a story. Pick one, or tell me yours.',setOut:'A good road, good company. This one will be worth writing down.'},
  profile:{name:'The Wanderer',persona:'Oswin Marsh, a laughing traveller in a patched coat who keeps other people’s stories so they are not lost.',personality:['Warm','Curious'],speakingStyle:['Hopeful','Unjudging'],appearance:['Patched coat','Lantern staff'],model:'ranger',color:HERO_COLORS[2],avatar:{form:'human',accessory:'none'},voice:'cedar'}},
 {id:'survivor',title:'The Survivor',realName:'Liora Thorne',mood:'Wicked',tone:'Tells it with a smile',style:'Measured · Cunning · Always a step ahead',
  excerpt:'War took her family and taught her that banners protect no one. She lived by reading people faster than they could read her, and now she trades in secrets and favours.',
  quote:'Kindness only gets you buried first.',art:'/art/game-masters/survivor.svg',scene:'/art/scenes/gm-survivor.svg',face:{x:.52,y:.30},
  lines:{tale:'Choose your stage carefully. Or write your own, if you think you can do better.',setOut:'Everyone has a price. Let’s go and find out yours.'},
  profile:{name:'The Survivor',persona:'Liora Thorne, the calmest person in the room, who trades in secrets and favours and is always a step ahead.',personality:['Sarcastic','Calculating'],speakingStyle:['Silken','Amused'],appearance:['Plum coat','Wine glass'],model:'mage',color:HERO_COLORS[3],avatar:{form:'human',accessory:'none'},voice:'willow'}},
 {id:'cursed',title:'The Cursed One',realName:'Ser Dorian Vane',mood:'Broken by past battles',tone:'Tells it at a cost',style:'Grave · Spare with words · Mindful of the cost',
  excerpt:'Betrayed by those he trusted and left to die, the knight took a demon’s bargain. It gave him life and took his shape. Now he looks for a way to break the curse, or a death worth dying.',
  quote:'Some days I cannot tell which thoughts are mine.',art:'/art/game-masters/cursed.svg',scene:'/art/scenes/gm-cursed.svg',face:{x:.49,y:.36},
  lines:{tale:'Choose the road. I will tell you what it costs.',setOut:'Keep your eyes on the road. It remembers every step.'},
  profile:{name:'The Cursed One',persona:'Ser Dorian Vane, a knight cursed into the shape of a cat, who speaks rarely and counts the cost of every victory.',personality:['Dramatic','Grim'],speakingStyle:['Low','Spare'],appearance:['Dented armour','Violet eye'],model:'knight',color:HERO_COLORS[9],avatar:{form:'cat',accessory:'none'},voice:'stone'}},
];

export type TaleId='lantern'|'crown'|'salt';
export interface TalePreset {id:TaleId;title:string;premise:string;region:string;chapters:number;biome:Biome;story:StoryBlueprint}
/** Scene art for a biome; custom tales use the built-in tale that shares their biome. */
export const SCENE_FOR_BIOME:Record<Biome,{scene:string;thumb:string}>={woodland:{scene:'/art/scenes/tale-lantern.svg',thumb:'/art/scenes/tale-lantern-thumb.svg'},ruins:{scene:'/art/scenes/tale-crown.svg',thumb:'/art/scenes/tale-crown-thumb.svg'},coast:{scene:'/art/scenes/tale-salt.svg',thumb:'/art/scenes/tale-salt-thumb.svg'}};
export const TALES:readonly TalePreset[]=[
 {id:'lantern',title:'The Lantern Road',region:'Woodland',chapters:3,biome:'woodland',
  premise:'Three lantern shards lie along a forest road. Bring the light home before the paths between villages vanish.',
  story:{title:'The Lantern Road',synopsis:'Three lantern shards lie along a forest road. Bring the light home before the paths between villages vanish.',timeline:'Before the last lantern goes out',world:'Lanternwood',locations:['Starfall Market','The forest road','The lantern shrine'],biome:'woodland'}},
 {id:'crown',title:'The Hollow Crown',region:'Ruins',chapters:3,biome:'ruins',
  premise:'A ruined keep holds the crown of a king nobody remembers. Something in the ruins remembers him.',
  story:{title:'The Hollow Crown',synopsis:'A ruined keep holds the crown of a king nobody remembers. Something in the ruins remembers him.',timeline:'Long after the last coronation',world:'The Hollow Reach',locations:['The broken arch','The ridge road','The hollow keep'],biome:'ruins'}},
 {id:'salt',title:'Salt and Silver',region:'Coast',chapters:3,biome:'coast',
  premise:'A harbour town trades in secrets and lantern glass. Someone is paying to keep the docks dark.',
  story:{title:'Salt and Silver',synopsis:'A harbour town trades in secrets and lantern glass. Someone is paying to keep the docks dark.',timeline:'The night the docks went dark',world:'Saltreach Harbour',locations:['The lantern pier','The glassmakers’ row','The harbour vaults'],biome:'coast'}},
];

/** The eight classes as the designs present them. `heroClass` is the rules class each hero plays as. */
export type ClassName='Warrior'|'Guardian'|'Rogue'|'Ranger'|'Mage'|'Cleric'|'Bard'|'Druid';
export type Role='Tank'|'Damage'|'Support'|'Control';
export interface HeroPreset {id:string;name:string;short:string;className:ClassName;subclass:string;role:Role;epithet:string;intro:string;art:string;face:FaceCentre;profile:HeroProfile}

// Until the class expansion lands, the four new classes play as the nearest existing rules class.
const PLAYS_AS:Record<ClassName,HeroClass>={Warrior:'knight',Guardian:'knight',Rogue:'ranger',Ranger:'ranger',Mage:'mage',Cleric:'cleric',Bard:'cleric',Druid:'mage'};
const ROLE:Record<ClassName,Role>={Warrior:'Tank',Guardian:'Tank',Rogue:'Damage',Ranger:'Damage',Mage:'Damage',Cleric:'Support',Bard:'Support',Druid:'Control'};

type Row=[id:string,name:string,short:string,className:ClassName,subclass:string,face:[number,number],colour:number,epithet:string,traits:[string,string],intro?:string];
const ROWS:Row[]=[
 ['corin','Corin Vale','Corin','Warrior','Champion',[.52,.27],0,'The Last Banner-Bearer',['Steady','Stubborn'],'The last Grey Lantern left standing at Hollow Ford. He takes the front of every fight.'],
 ['brunna','Brunna Oxthroat','Brunna','Warrior','Berserker',[.52,.28],0,'Ash-Born',['Fierce','Loyal']],
 ['ilsa','Ilsa Marrow','Ilsa','Guardian','Sentinel',[.52,.29],9,'The Gatekeeper of Thorn Pass',['Watchful','Patient']],
 ['aldric','Sir Aldric Fenn','Aldric','Guardian','Paladin',[.505,.28],7,'The Oath of the Unmarked Grave',['Devout','Honourable']],
 ['vess','Vess','Vess','Rogue','Assassin',[.50,.29],9,'The Name on the List',['Quiet','Precise']],
 ['pip','Pip Larkspur','Pip','Rogue','Trickster',[.48,.31],3,'The Man of a Hundred Faces',['Playful','Bold']],
 ['talen','Talen Ashby','Talen','Ranger','Hunter',[.50,.30],4,'The Last Arrow of Greywood',['Calm','Resolute']],
 ['mira','Mira','Mira','Ranger','Beastmaster',[.30,.265],4,'Raised by the Pack',['Wild','Kind']],
 ['seren','Seren Hale','Seren','Mage','Elementalist',[.49,.27],1,'The Girl Who Caught Lightning',['Bright','Restless']],
 ['lucan','Lucan Mire','Lucan','Mage','Necromancer',[.52,.25],3,'The Gravekeeper’s Promise',['Solemn','Gentle']],
 ['amara','Sister Amara Wren','Amara','Cleric','Life',[.51,.30],2,'The Healer of the Siege',['Compassionate','Brave']],
 ['hagan','Brother Hagan Stoke','Hagan','Cleric','War',[.49,.27],7,'The Hammer of the Broken Shrine',['Jovial','Fearless']],
 ['elowen','Elowen Quill','Elowen','Bard','Lore',[.49,.27],5,'The Keeper of Forbidden Songs',['Curious','Witty']],
 ['nerys','Nerys Coral','Nerys','Bard','Siren',[.50,.285],6,'The Voice from the Drowned City',['Haunting','Proud']],
 ['fenn','Fenn Greystone','Fenn','Druid','Shapeshifter',[.51,.27],8,'The Boy Who Forgot to Change Back',['Shy','Wild']],
 ['granny','Granny Marrow','Granny','Druid','Wilds',[.52,.29],4,'The Storm-Speaker of the Salt Marsh',['Sharp','Stormy']],
];
export const HEROES:readonly HeroPreset[]=ROWS.map(([id,name,short,className,subclass,[x,y],colour,epithet,traits,intro=''])=>({
 id,name,short,className,subclass,role:ROLE[className],epithet,intro,art:`/art/heroes/${id}.svg`,face:{x,y},
 profile:{name,background:intro||`${epithet}. ${className} · ${subclass}.`,personality:[...traits],heroClass:PLAYS_AS[className],color:HERO_COLORS[colour]},
}));

export const gameMaster=(id:string)=>GAME_MASTERS.find(g=>g.id===id);
export const tale=(id:string)=>TALES.find(t=>t.id===id);
export const heroPreset=(id:string)=>HEROES.find(h=>h.id===id);

/**
 * Head-to-chest portrait crop: draws the art `scale` times the box width and places the face centre
 * half-way across and `eye` of the way down the box. Returns CSS pixel values for an absolutely positioned image.
 */
export function portraitCrop(face:FaceCentre,box:{w:number;h:number},ratio:number,scale=1.33,eye=0.36){
 const width=box.w*scale,height=width/ratio;
 return {left:Math.round(box.w/2-face.x*width),top:Math.round(box.h*eye-face.y*height),width:Math.round(width),height:Math.round(height)};
}
