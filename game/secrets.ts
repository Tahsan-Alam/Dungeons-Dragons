import type {GameState} from './types.ts';
import {GAME_MASTERS,HEROES} from './presets.ts';

/**
 * Each built-in hero's sealed note: one secret per built-in Game Master (Story Bible, section 6). Only the chosen Game
 * Master's secret is used, and only that hero's player is shown it, once the quest begins. Custom heroes and custom
 * Game Masters have none.
 */
export type SealedGameMaster='wanderer'|'survivor'|'cursed';
export const SECRETS:Readonly<Record<string,Readonly<Record<SealedGameMaster,string>>>>={
 corin:{wanderer:'He once sat with the Lantern widows and wrote down their stories. His journal holds the only true account of Hollow Ford, including a detail about who ordered the retreat that Corin never knew.',
  survivor:'She sold the Lanterns’ battle plans to the enemy. Corin doesn’t know it yet, and she has been paying a quiet pension to his dead captain’s daughter ever since.',
  cursed:'He fought on the other side at Hollow Ford. He spared Corin’s life on the field, and Corin has spent years looking for the scarred knight to repay the debt.'},
 brunna:{wanderer:'He met a survivor of the burned hall. He knows exactly what Brunna did that night, and it is both worse and more forgivable than she fears.',
  survivor:'She knows the rival clan’s hall was set on fire before Brunna ever arrived. Someone used Brunna’s rage as a cover story, and the Survivor knows who.',
  cursed:'He recognises the red trance; a demon’s whisper sounds the same. He wonders whether the storm god Brunna’s clan worships is really a god at all.'},
 ilsa:{wanderer:'He passed through Thorn Pass years ago and shared a meal with Ilsa. A page in his journal holds a letter someone asked him to deliver to her, which he never managed to send.',
  survivor:'She bought the order’s fortress for its land. She knows the Sentinels didn’t vanish; they were paid to leave, and Ilsa was deliberately forgotten.',
  cursed:'He once trained with the Sentinels. The empty fortress is where he was betrayed, and the set tables were for the feast held the night they left him to die.'},
 aldric:{wanderer:'He collected the stories of the buried village from its last survivor, a child who escaped. That child is now an adult, looking for the knight who “cried while he dug.”',
  survivor:'She arranged the land sale that led to the village’s destruction and keeps the deed. She has never met Aldric, but she knows his name very well.',
  cursed:'The demon inside him goes quiet near Aldric’s light, the only time it ever does. He tells no one.'},
 vess:{wanderer:'He knew Vess’s real mother. He has a sketch of her and a story about why she gave Vess up, and it’s not the reason the House told her.',
  survivor:'She signed the contract on Vess. Years ago, on a job, Vess overheard one secret too many without ever realising what she’d heard.',
  cursed:'He was Vess’s first-ever target. She failed to kill him, the only failure she has never told anyone about, and she has never understood why her blade wouldn’t go in.'},
 pip:{wanderer:'He tells Pip’s best stories around fires, but with the real names attached. Pip would very much like that journal.',
  survivor:'She recognises a fellow liar. She hired Pip once for a job and still owes him a favour, or he owes her. They both remember it differently.',
  cursed:'He was in the fever town, one of the sick. Pip’s fake cure was the only thing that gave him hope that night. He doesn’t know it was fake.'},
 talen:{wanderer:'He has a pressed leaf from Greywood, given to him by Talen’s sister. Talen believes she died in the fire.',
  survivor:'She holds shares in the timber company. She didn’t give the order, but she knows who did, and that knowledge is worth a great deal to her alive.',
  cursed:'The fire wasn’t started by axes and torches. He knows the smell of demon fire, and he smelled it on Talen’s clothes the day they met.'},
 mira:{wanderer:'He has a story about a noble family whose daughter vanished on a hunting trip. The family crest in his sketch matches Mira’s pendant.',
  survivor:'She knows the pendant. The noble family is real, and Mira is the rightful heir to lands the Survivor is trying to buy.',
  cursed:'Ash won’t go near him and growls whenever the demon stirs. Ash may be the only creature that can warn when the curse is about to take control.'},
 seren:{wanderer:'He was in the village the day she was struck. He wrote that the storm came from a cloudless sky, and that the lightning didn’t strike her; it found her.',
  survivor:'She paid for Seren’s expulsion. A mage that powerful and that reckless is either a weapon or a threat, and she wants her free and in her debt.',
  cursed:'He feels the same pull from Seren’s storms that he feels from the demon. Whatever is behind that door may be related to what lives inside him.'},
 lucan:{wanderer:'Before Nell died, she told him a story and asked him to keep it safe. It is the only thing left of her voice, and Lucan doesn’t know it exists.',
  survivor:'She wants Lucan’s skill for one thing: to ask one dead person a single question. She will pay almost anything.',
  cursed:'The demon wants Lucan. It whispers that a necromancer could pull it into a new body. He is torn between protecting Lucan and using him to finally be free.'},
 amara:{wanderer:'A soldier he interviewed swore Amara brought him back after his heart had stopped. Amara doesn’t remember doing it.',
  survivor:'She was inside Kesh during the siege, a young woman doing whatever it took. Amara saved her life. She has never thanked her, and has never forgotten.',
  cursed:'Amara once tried to heal him. The demon recoiled, and for one heartbeat he felt like himself again. He wants to know if she can do it again, and is afraid of what it would cost her.'},
 hagan:{wanderer:'He has a story from one of the raiders, a young man who joined because he was starving and now regrets it. He is somewhere in the next town.',
  survivor:'She funded the raid through three middlemen. The shrine was hiding something valuable, and the raiders didn’t find it. Hagan might have it without knowing.',
  cursed:'Hagan forged his armour years ago, when he was still a proud knight. Hagan would recognise his own work instantly, crest scratched off or not.'},
 elowen:{wanderer:'They are two of a kind. He knows a missing verse of the ballad, the one that names who actually killed the old king.',
  survivor:'She wants Elowen silenced, or owned. Sung in the wrong court, the ballad could topple people she has spent years cultivating.',
  cursed:'The ballad is about him. The knight in the song, betrayed and left to die, is him. Elowen has no idea the hero of her song is standing in front of her.'},
 nerys:{wanderer:'He has heard the same song from three different sailors, all of whom claim they heard it from under the waves near the drowned city.',
  survivor:'She sees Nerys as the perfect tool for ruining nobles and has tried twice to recruit her. Nerys is the only person who has ever charmed her back.',
  cursed:'Her song is the only thing that silences the demon’s voice in his head. He pretends not to listen, and lingers every time she sings.'},
 fenn:{wanderer:'Villagers told him of a bear who carried a lost child home through a snowstorm. That bear was Fenn, and the child wants to thank him.',
  survivor:'She sold information to the slavers who hunted Fenn. It was one of her first deals, and she still remembers the boy’s face.',
  cursed:'When the curse rises, Fenn smells it as something animal and wounded. He is the only one who isn’t afraid of him; to Fenn, the knight is just a creature in a trap.'},
 granny:{wanderer:'His late wife grew up near the Salt Marsh. Granny knew her as a girl and has stories about her that he has never heard.',
  survivor:'The duke who drained the marsh is her client; his road is how she moves secrets and coin. Granny is about to become a very large problem for her.',
  cursed:'Granny knows an old marsh ritual for drawing poison out of a wound and suspects it might work on a curse. It would probably also kill whoever performs it.'},
};

/** The sealed note for a hero under a Game Master, if both are built in. */
export function sealedNote(heroId:string|undefined,gameMasterId:string|undefined):string|undefined{
 if(!heroId||!gameMasterId)return undefined;
 return SECRETS[heroId]?.[gameMasterId as SealedGameMaster];
}

/** One player's sealed note: their built-in hero's secret with this game's built-in Game Master. Never for companions. */
export function sealedNoteFor(game:GameState,playerId:string|undefined){
 const actor=game.actors.find(a=>a.playerId===playerId&&!a.bot&&!a.enemy);
 const hero=actor&&HEROES.find(h=>h.name.toLowerCase()===actor.name.trim().toLowerCase());
 const gm=GAME_MASTERS.find(g=>g.profile.name===game.options.creation?.narrator.name);
 const secret=sealedNote(hero?.id,gm?.id);
 return hero&&gm&&secret?{hero,gm,secret}:undefined;
}
