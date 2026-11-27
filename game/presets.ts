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
/** The shared setting of the three built-in tales (World Guide). Display only: `story.world` keeps the region name. */
export const SETTING='The Lantern Marches';
/** `region` is the region's display name; the tale's art and enemies follow `biome`. */
export interface TalePreset {id:TaleId;title:string;premise:string;region:string;chapters:number;biome:Biome;story:StoryBlueprint}
/** Scene art for a biome; custom tales use the built-in tale that shares their biome. */
export const SCENE_FOR_BIOME:Record<Biome,{scene:string;thumb:string}>={woodland:{scene:'/art/scenes/tale-lantern.svg',thumb:'/art/scenes/tale-lantern-thumb.svg'},ruins:{scene:'/art/scenes/tale-crown.svg',thumb:'/art/scenes/tale-crown-thumb.svg'},coast:{scene:'/art/scenes/tale-salt.svg',thumb:'/art/scenes/tale-salt-thumb.svg'}};
export const TALES:readonly TalePreset[]=[
 {id:'lantern',title:'The Lantern Road',region:'Lanternwood',chapters:3,biome:'woodland',
  premise:'Three lantern shards lie along a forest road. Bring the light home before the paths between villages vanish.',
  story:{title:'The Lantern Road',synopsis:'Three lantern shards lie along a forest road. Bring the light home before the paths between villages vanish.',timeline:'Before the last lantern goes out',world:'Lanternwood',locations:['Starfall Market','The forest road','The lantern shrine'],biome:'woodland'}},
 {id:'crown',title:'The Hollow Crown',region:'The Hollow Reach',chapters:3,biome:'ruins',
  premise:'A ruined keep holds the crown of a king nobody remembers. Something in the ruins remembers him.',
  story:{title:'The Hollow Crown',synopsis:'A ruined keep holds the crown of a king nobody remembers. Something in the ruins remembers him.',timeline:'Long after the last coronation',world:'The Hollow Reach',locations:['The broken arch','The ridge road','The hollow keep'],biome:'ruins'}},
 {id:'salt',title:'Salt and Silver',region:'Saltreach Harbour',chapters:3,biome:'coast',
  premise:'A harbour town trades in secrets and lantern glass. Someone is paying to keep the docks dark.',
  story:{title:'Salt and Silver',synopsis:'A harbour town trades in secrets and lantern glass. Someone is paying to keep the docks dark.',timeline:'The night the docks went dark',world:'Saltreach Harbour',locations:['The lantern pier','The glassmakers’ row','The harbour vaults'],biome:'coast'}},
];

/** The eight classes as the designs present them. `heroClass` is the rules class each hero plays as. */
export type ClassName='Warrior'|'Guardian'|'Rogue'|'Ranger'|'Mage'|'Cleric'|'Bard'|'Druid';
export type Role='Tank'|'Damage'|'Support'|'Control';
export interface HeroPreset {id:string;name:string;short:string;className:ClassName;subclass:string;role:Role;epithet:string;intro:string;story:string;art:string;face:FaceCentre;profile:HeroProfile}

// Warrior is the rules' knight; every other class plays as itself.
export const PLAYS_AS:Record<ClassName,HeroClass>={Warrior:'knight',Guardian:'guardian',Rogue:'rogue',Ranger:'ranger',Mage:'mage',Cleric:'cleric',Bard:'bard',Druid:'druid'};
export const ROLE:Record<ClassName,Role>={Warrior:'Tank',Guardian:'Tank',Rogue:'Damage',Ranger:'Damage',Mage:'Damage',Cleric:'Support',Bard:'Support',Druid:'Control'};

type Row=[id:string,name:string,short:string,className:ClassName,subclass:string,face:[number,number],colour:number,epithet:string,traits:[string,string]];
const ROWS:Row[]=[
 ['corin','Corin Vale','Corin','Warrior','Champion',[.52,.27],0,'The Last Banner-Bearer',['Steady','Stubborn']],
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
/** Each hero's line under their name, and the short story on their sheet (also the background the Game Master reads, so at most 240 characters). Drawn from the player character backstories. */
const STORIES:Record<string,[intro:string,story:string]>={
 corin:['The last Grey Lantern left standing at Hollow Ford. He takes the front of every fight.',
  'Corin carried the Grey Lanterns’ banner home from Hollow Ford and told forty families how their soldiers fell. Now he fights under no flag but his word, with forty notches under his shield strap and a vow never to add another.'],
 brunna:['She walks in the red, a battle trance where pain disappears. She fears what she does there.',
  'Brunna’s clan taught her to walk in the red. Then she woke in a rival clan’s burning hall with blood on her hands and no memory. She left that night. She still fights, and asks her companions to stop her if she goes too far.'],
 ilsa:['Eleven years alone at Thorn Pass. Then her order vanished, and she came down the mountain.',
  'For eleven years Ilsa held Thorn Pass alone with a goat, a bell and a tower shield. When the supplies stopped, she found her order’s fortress empty and the tables still set. Now she carries her shield into the world to learn why.'],
 aldric:['A temple knight who obeyed one order too many. Now he guards the people the powerful forget.',
  'Aldric cleared a village his temple called plague-worshippers, then learned they only owned land it wanted. He buried them himself and swore a new oath: protect the inconvenient. His holy light still answers. He isn’t sure why.'],
 vess:['Twelve contracts, no failures. The thirteenth had her own name on it.',
  'Raised by the Quiet House to be forgettable, Vess never failed a contract. Her thirteenth came sealed, with her own name inside. She survived the ambush. Now she hunts whoever signed it, and wonders about the life she never had.'],
 pip:['Duke’s nephew, travelling priest, tax inspector. None of it true, all of it profitable.',
  'Pip has been a duke’s nephew, a priest and, for one glorious week, a baroness’s fiancé. One con went too far: a fake cure sold to a fever town. Now he only robs those who can afford it, and keeps a token from every mark.'],
 talen:['The best tracker in Greywood, until it burned. He saves one arrow for the man who ordered it.',
  'Talen was out hunting the night a timber company burned Greywood and his village with it. He reads tracks like books and hunts monsters for coin, carrying one owl-fletched arrow for the man who gave the order.'],
 mira:['Found living with wolves at six. Now she fights beside her wolf, Ash.',
  'Found at six living with wolves, Mira never quite belonged in the village that took her in. Then a wolf pup named Ash came to her door. They hunt in perfect rhythm, searching for why a little girl was left alone in the woods.'],
 seren:['Struck by lightning at nine, she walked away laughing. Her storms are growing.',
  'Lightning found Seren at nine, and sparks have followed her since. Expelled from the Academy of the Five Winds for taking half a tower with her, she teaches herself now. Her storms grow past her control, and she wants to know why.'],
 lucan:['A gravedigger’s son who learned the forbidden art to bring his sister home.',
  'When fever took his little sister Nell, gravedigger’s son Lucan stole forbidden books and taught himself necromancy. He raises the restless dead gently and lets them rest after. He hasn’t brought Nell back. Not yet.'],
 amara:['She healed both armies through a three-hundred-day siege. Everyone deserves saving.',
  'Through the three-hundred-day siege of Kesh, Amara healed soldiers from both armies. The victors executed every healer who treated the enemy. She escaped with bandages and a cracked holy symbol, and still never asks whose side you’re on.'],
 hagan:['A blacksmith turned battle priest. His god answers with fire in his hammer.',
  'When raiders burned his mountain shrine, blacksmith Hagan prayed one angry prayer and went after them alone. His god answered with fire. He laughs loud and leads from the front, but the raiders wore holy symbols too.'],
 elowen:['A royal archivist who memorised a song that could topple a king.',
  'Elowen found a ballad telling how the king really took his throne. She memorised it, burned the copy, and sang her guards to sleep to escape her cell. Now she travels as a performer, passing the forbidden song to anyone who’ll listen.'],
 nerys:['Found singing on a broken door the night her city sank. When she sings, people stop.',
  'Nerys was found floating on a broken door the night her city sank, singing a song no one taught her. Her voice can calm a riot or make a cruel man forget his name. She seeks the drowned city, sure someone below still sings back.'],
 fenn:['He spent three years as a bear. Each time he changes, part of him wants to stay.',
  'Fenn fled slavers as a bear and stayed one for three years, until a druid circle coaxed him home. Now he becomes wolf, hawk or bear at will, though part of him always wants to stay. He fights for forests and anyone who’s been caged.'],
 granny:['Somewhere between sixty and two hundred years old. The weather usually listens to her.',
  'Granny Marrow tended the Salt Marsh for decades, coaxing reeds over sinking paths and calling fog to hide neighbours from tax men. When a duke drained it for a road, the land fell silent. She packed her pipe and went to find him.'],
};
export const HEROES:readonly HeroPreset[]=ROWS.map(([id,name,short,className,subclass,[x,y],colour,epithet,traits])=>({
 id,name,short,className,subclass,role:ROLE[className],epithet,intro:STORIES[id][0],story:STORIES[id][1],art:`/art/heroes/${id}.svg`,face:{x,y},
 profile:{name,background:STORIES[id][1],personality:[...traits],heroClass:PLAYS_AS[className],color:HERO_COLORS[colour]},
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
