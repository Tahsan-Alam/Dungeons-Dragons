/* Every sound the game can make, by name. Files are built by scripts/audio/build_audio.py from CC0 packs
   (public/audio/CREDITS.md); a cue with several variations picks one at random, never the same twice running. */

export type Bus='music'|'ambience'|'effects'|'interface';
export interface Cue {bus:Bus;variations:number;gain:number;/** Random pitch spread, as a playback-rate fraction. */pitch?:number;url?:string}

const fx=(variations:number,gain:number,pitch=.04):Cue=>({bus:'effects',variations,gain,pitch});
const ui=(variations:number,gain:number,pitch=.02):Cue=>({bus:'interface',variations,gain,pitch});

export const CUES={
 // The table and its books
 'ui-click':{bus:'interface',variations:1,gain:1,url:'/audio/click-thock.wav'},
 'ui-hover':{bus:'interface',variations:1,gain:.72,url:'/audio/hover-thock.wav'},
 'ui-page':ui(3,.55),'ui-open':ui(2,.5),'ui-close':ui(1,.45),'ui-book-open':ui(1,.5),'ui-toggle':ui(1,.5),'ui-latch':ui(1,.5),
 'ui-tick':ui(1,.35,.06),'ui-select':ui(2,.5),'ui-confirm':ui(1,.45,0),'ui-deny':ui(1,.5),'ui-notice':ui(1,.4),
 'ui-map-open':ui(1,.55,0),'ui-map-close':ui(1,.5,0),'ui-seal':ui(1,.6,0),'ui-unfold':ui(1,.45,0),'ui-join':ui(1,.45,0),
 'ui-voice-on':ui(1,.35,0),'ui-voice-off':ui(1,.35,0),'ui-coins':ui(1,.45),
 // Dice
 'dice-shake':fx(2,.5),'dice-throw':fx(4,.7,.03),
 // Steps
 'step-soft':fx(4,.32,.08),'step-stone':fx(4,.32,.08),'step-wood':fx(4,.36,.08),'step-water':fx(3,.3,.08),
 // Blows and powers
 'swing':fx(3,.45,.08),'swing-heavy':fx(2,.55,.06),'hit':fx(3,.6,.08),'hit-heavy':fx(2,.75,.05),'clash':fx(3,.45,.06),
 'blade-draw':fx(2,.4),'knife':fx(2,.5,.06),'arrow':fx(1,.55,.08),'quiver':fx(2,.35),'spell-cast':fx(3,.5),'spell-fire':fx(2,.55),
 'heal':fx(3,.5,.02),'song':fx(1,.5,.02),'roots':fx(2,.55),'shield':fx(2,.45),'guard':fx(1,.45),'uncork':fx(1,.5),'drink':fx(1,.5),
 'revive':fx(1,.5,0),'fall':fx(2,.55),
 // Chests, shards, gateways and the road
 'chest-unlock':fx(1,.55,0),'chest-open':fx(1,.55,0),'shard':fx(1,.6,0),'shard-bell':fx(1,.5,0),'gateway':fx(1,.55,0),
 'relight':fx(3,.45,0),'turn-yours':fx(1,.35,0),'turn-foes':fx(1,.3,0),
 // Keepers
 'keeper-wolf':fx(1,.6,0),'keeper-breath':fx(1,.65,0),'keeper-glass':fx(1,.55,0),'keeper-stone':fx(1,.6,0),
 'release-pounce':fx(1,.7,.04),'release-fire':fx(2,.7),'release-tide':fx(2,.7),'release-rock':fx(2,.7),'keeper-fall':fx(1,.6,0),
 // Creature voices: variation 1 notices, 2 is hurt, 3 is defeated
 'v-imp':fx(3,.4,.1),'v-goblin':fx(3,.45,.08),'v-wisp':fx(3,.4,.06),'v-stone':fx(3,.45,.06),'v-beast':fx(3,.45,.06),'v-ooze':fx(3,.45,.08),
 'v-crab':fx(3,.45,.08),'v-eel':fx(3,.45,.08),'v-moth':fx(3,.35,.1),'v-wolf':fx(3,.5,.04),'v-dragon':fx(3,.55,.04),'v-monster':fx(3,.45,.06),
 'gull':{bus:'ambience',variations:3,gain:.35,pitch:.08},
} satisfies Record<string,Cue>;
export type CueName=keyof typeof CUES;

export type MusicName='title'|'camp'|'lanternwood-day'|'lanternwood-dusk'|'reach-day'|'reach-dusk'|'saltreach-day'|'saltreach-dusk'|'peril'|'keeper'|'road'|'victory'|'defeat'|'replay';
/** Played once (no loop); the rest loop seamlessly. */
export const MUSIC_ONCE:ReadonlySet<MusicName>=new Set(['road','victory','defeat']);
export type AmbienceName='birds'|'wind'|'wind-high'|'crickets'|'waves'|'cave'|'fire';
export interface Bed {name:AmbienceName;gain:number}

export function cueUrl(name:CueName,variation:number){
 const cue:Cue=CUES[name];
 return cue.url??`/audio/sfx/${name}${cue.variations>1?`-${variation}`:''}.mp3`;
}
export const musicUrl=(name:MusicName)=>`/audio/music/${name}.mp3`;
export const ambienceUrl=(name:AmbienceName)=>`/audio/ambience/${name}.mp3`;
