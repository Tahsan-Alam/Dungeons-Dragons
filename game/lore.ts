import type {GameState,Narrator} from './types.ts';
import type {StoryBlueprint} from './creation.ts';
import {TALES,SETTING} from './presets.ts';
import type {TaleId} from './presets.ts';

/* The Lantern Marches (World Guide): chapter openings that lead with a clue the party can see, and the
   branch-specific victory line. Only the three built-in tales use this text; custom tales keep their own world.
   `LORE_EDITION` is stamped on new games so saves replay with the text and rules they were played with:
   edition 1 added these openings and the opening set pieces, edition 2 the named Keepers, edition 3 the custom-tale
   boss pool and wider enemy groups (game/keepers.ts). */
export const LORE_EDITION=3;

type Lines=Record<Narrator,readonly [string,string,string]>;
interface TaleLore {road:string;clues:readonly [string,string,string];openings:Lines;}

const LORE:Record<TaleId,TaleLore>={
 lantern:{road:'west road',
  clues:['The salt stall stands empty, and an oil cart waits for a road that never opened.','Two waymarks wait along the raised cobbles, the second one dark.','The shrine’s light still burns, and something large keeps watch at its edge.'],
  openings:{
   warm:['A crooked little path leads into Starfall Market. The salt stall stands empty and an oil cart waits for a road that never opened. One lantern still burns toward the gateway. Your first shard is close.',
    'Your lantern glows a little brighter. Follow Aether’s light to the next waymark. Ahead, the forest road rustles with secrets. Did you see those eyes beyond the light?',
    'The shrine still burns. The wolf has been keeping watch over that light. Stay close to the lanterns.'],
   wry:['Welcome to Starfall Market. An empty salt stall, oil stuck on a cart, and one lantern doing all the work. The guardians are grumpy, and somehow this is your problem now. Find three shards.',
    'The forest road. Lovely scenery, terrible hospitality. Something big has been following us past the lanterns.',
    'That wolf has made its opinion of visitors clear. Keep a lantern within reach.'],
   dramatic:['Starfall Market. An empty salt stall. An oil cart that never left. The dark is taking root. Three shards. One fellowship. Your story begins here.',
    'A single shard burns against the darkness. Aether’s light reaches for the next waymark. Beyond it, something on four feet keeps pace.',
    'The Wolf at the Last Light stands between us and the shard. When it marks you, seek the shrine’s light.']}},
 crown:{road:'north road',
  clues:['Beneath the carved dragon and its crowned king, someone has chiselled the name away.','Above the ridge, the dragon flies toward the keep.','The dragon stands guard over a crown no one else remembers.'],
  openings:{
   warm:['The broken arch still shows a dragon beside a crowned king. Someone chiselled away the name beneath them, stroke by careful stroke. Three shards wait in the Hollow Reach. Your first is close.',
    'Your lantern glows a little brighter. Follow Aether’s light to the next waymark. And look up: the dragon is crossing toward the keep, as if it has somewhere it must be.',
    'The hollow keep. The dragon stands before the treasury, still guarding a crown no one else remembers. The final shard is here. Stand together.'],
   wry:['Someone took a chisel to that carving: a dragon, a crown, and no name. Whoever did it wanted a king forgotten. Find three shards, and perhaps we’ll learn why.',
    'The ridge road. Narrow, windy, and that dragon is heading for the keep. I’d say it’s expecting company.',
    'The dragon got here first. It has the crown, the chest and the last shard. Mind the marked ground, and don’t stand in front of its mouth.'],
   dramatic:['The broken arch. A dragon carved beside a crowned king, and beneath them a scar where a name was chiselled away. Three shards. One fellowship. Your story begins here.',
    'A single shard burns against the wind. Above the ridge, the dragon flies for the keep. It is keeping an oath.',
    'The Hollow Keeper waits in the keep: the dragon that never forgot its king. Claim the final shard. Mind the marked ground.']}},
 salt:{road:'harbour road',
  clues:['One lamp cage on the pier stands empty, its glass lifted out and its clips bent back.','The brass racks are empty, and the same mark runs through every missing order.','The vault captain sealed the last shard here to keep it from smugglers.'],
  openings:{
   warm:['The lantern pier is darker than it should be. One lamp cage stands empty, its glass lifted out and its clips bent back, while the next still burns. Someone took that lens with care. Your first shard is close.',
    'Your lantern glows a little brighter. Follow Aether’s light to the next waymark. Along glassmakers’ row the racks are empty, and the same mark repeats on every missing order.',
    'The harbour vaults. Their captain sealed the last shard here to keep it from smugglers, and she is still standing guard. Stand together.'],
   wry:['Look at that cage: glass gone, clips bent back, not a scratch on the frame. Well-paid thieves work tidily. Find three shards, and we’ll find who paid them.',
    'Glassmakers’ row. Empty racks, shuttered shops, and an invoice someone forgot to burn. Paper always talks.',
    'The Tideglass Warden has turned everyone away. Let’s see whether she likes us any better. The last shard is behind her.'],
   dramatic:['The lantern pier. A cage stripped of its glass, its clips bent back. The docks went dark by someone’s choice. Three shards. One fellowship. Your story begins here.',
    'A single shard burns in the fog. The racks are bare, and the marks on the ledgers lead below, to the vaults.',
    'The Hollow Keeper of the vaults draws her glass blade. She sealed the shard to keep it safe. Show her you are not what she guards against.']}},
};

/** The built-in tale a story is, if it is one. Custom tales never match. */
export function builtInTale(story:StoryBlueprint|undefined):TaleId|undefined {
 if(!story)return undefined;
 return TALES.find(t=>t.story.title===story.title&&t.story.world===story.world&&t.story.locations.length===story.locations.length&&t.story.locations.every((l,i)=>story.locations[i]===l))?.id;
}

/** “The Lantern Marches · Lanternwood” for a built-in tale; the story's own world otherwise. */
export function settingLine(story:StoryBlueprint|undefined):string|undefined {
 if(!story)return undefined;
 return builtInTale(story)?`${SETTING} · ${story.world}`:story.world;
}

/** The chapter opening for a built-in tale in a game stamped with the current edition, or undefined to keep the classic text. */
export function loreOpening(game:GameState,standard:boolean,final:boolean,goal:number):string|undefined {
 if((game.lore??0)<1)return undefined;
 const id=builtInTale(game.options.creation?.story);if(!id)return undefined;
 const lore=LORE[id],place=game.scene%3;
 if(standard)return lore.openings[game.options.narrator][place];
 return `${game.sceneName}. ${lore.clues[place]} ${game.relics} of ${goal} lantern shards recovered. ${final?'The final shard is here. Face the Hollow Keeper and bring the lantern home.':'Defeat the guardians, recover this shard, and follow Aether’s light to the next waymark.'}`;
}

/** At victory, the waymarks relight along the tale's branch toward the Waylantern. */
export function loreResolution(story:StoryBlueprint,hero:string,narrator:string):string|undefined {
 const id=builtInTale(story);if(!id)return undefined;
 const [first,,last]=story.locations;
 return `The waymarks relight along the ${LORE[id].road}, from ${first} to ${last.charAt(0).toLowerCase()+last.slice(1)}, and Aether’s light runs home to the Waylantern at Threeway Crossing. ${hero} and the party have brought the lantern home. ${narrator} closes this chapter.`.slice(0,400);
}
