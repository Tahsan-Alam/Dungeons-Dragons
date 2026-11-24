/* What the table sounds like, worked out from the game state alone: the music and ambience for where the party
   stands, and the cues for what just happened between two states. Pure functions, so replays, solo and multiplayer
   all sound the same, and nothing here touches rules or saves. */
import type {Actor,Biome,GameEvent,GameState,HeroClass,KeeperKind} from '../../../game/types';
import type {Bed,CueName,MusicName} from './catalog';

export type Region='lanternwood'|'reach'|'saltreach';
export const REGION_OF:Record<Biome,Region>={woodland:'lanternwood',ruins:'reach',coast:'saltreach'};
export interface SoundCue {cue:CueName;/** Seconds after the change arrives. */at:number;gain?:number;rate?:number;variation?:number}

const standing=(a:Actor)=>!a.defeated&&a.hp>0;
const keeperAlive=(game:GameState)=>game.actors.some(a=>a.enemy&&a.keeper&&standing(a));
const heroDown=(game:GameState)=>game.actors.some(a=>!a.enemy&&a.hp<=0&&!a.defeated);

/** The region by day or after dusk; a living Keeper brings its own theme; a fallen hero brings peril. */
export function musicForPlay(game:GameState,night:boolean):MusicName{
 if(game.status==='victory')return 'victory';
 if(game.status==='defeat')return 'defeat';
 if(keeperAlive(game))return 'keeper';
 if(heroDown(game))return 'peril';
 return `${REGION_OF[game.options.biome]}-${night?'dusk':'day'}` as MusicName;
}

/** The beds under the music. Vaults are indoors; gulls cry over Saltreach only by day. */
export function ambienceForPlay(game:GameState,night:boolean):{beds:Bed[];gulls:boolean}{
 const region=REGION_OF[game.options.biome];
 if(/vault|archive|chamber/i.test(game.sceneName))return {beds:[{name:'cave',gain:.9},...(region==='saltreach'?[{name:'waves' as const,gain:.25}]:[])],gulls:false};
 if(region==='lanternwood')return {beds:night?[{name:'crickets',gain:.75},{name:'wind',gain:.35}]:[{name:'birds',gain:.8},{name:'wind',gain:.3}],gulls:false};
 if(region==='reach')return {beds:night?[{name:'wind-high',gain:.45},{name:'wind',gain:.55},{name:'crickets',gain:.3}]:[{name:'wind',gain:.8},{name:'birds',gain:.25}],gulls:false};
 return {beds:[{name:'waves',gain:night?.7:.85}],gulls:!night};
}

type Voice='v-imp'|'v-goblin'|'v-wisp'|'v-stone'|'v-beast'|'v-ooze'|'v-crab'|'v-eel'|'v-moth'|'v-wolf'|'v-dragon'|'v-monster';
const KEEPER_VOICE:Record<KeeperKind,Voice>={wolf:'v-wolf','grey-wolf':'v-wolf',thornhound:'v-beast',dragon:'v-dragon',drake:'v-dragon',warden:'v-wisp','tide-warden':'v-wisp',hollow:'v-beast',giant:'v-stone',eye:'v-wisp'};
/** Each creature family has one voice: variation 1 when it strikes, 2 when hurt, 3 when it falls. */
export function voiceOf(actor:{name:string;keeper?:KeeperKind}):Voice{
 if(actor.keeper)return KEEPER_VOICE[actor.keeper];
 const n=actor.name.toLowerCase();
 if(/\bimp\b/.test(n))return 'v-imp';
 if(/goblin|bandit/.test(n))return 'v-goblin';
 if(/wisp|shade|ghost|eye/.test(n))return 'v-wisp';
 if(/golem|sentinel|guard|clay|giant/.test(n))return 'v-stone';
 if(/thorn|root|bramble|hound|wolf/.test(n))return 'v-beast';
 if(/ooze|slime/.test(n))return 'v-ooze';
 if(/crab|shell/.test(n))return 'v-crab';
 if(/eel|tide|mist/.test(n))return 'v-eel';
 if(/moth|bug|beetle/.test(n))return 'v-moth';
 if(/dragon|drake/.test(n))return 'v-dragon';
 return 'v-monster';
}

/** The cues a chapter will need, fetched as it opens so the first blow is not late. */
export function cuesToPreload(game:GameState):CueName[]{
 const voices=new Set(game.actors.filter(a=>a.enemy).map(voiceOf));
 return ['dice-throw','hit','swing','step-soft','step-stone','turn-yours',...voices];
}

const HERO_ATTACK:Record<HeroClass,{attack:CueName[];ability:CueName[]}>={
 knight:{attack:['swing'],ability:['blade-draw','swing-heavy']},
 ranger:{attack:['arrow'],ability:['quiver','arrow']},
 mage:{attack:['spell-cast'],ability:['spell-cast','spell-fire']},
 cleric:{attack:['swing'],ability:['heal']},
 guardian:{attack:['swing-heavy'],ability:['shield']},
 rogue:{attack:['knife'],ability:['swing','knife']},
 bard:{attack:['swing'],ability:['song']},
 druid:{attack:['roots'],ability:['roots']},
};
const STEP:Record<'grass'|'path'|'water'|'wall',CueName>={grass:'step-soft',path:'step-stone',water:'step-water',wall:'step-stone'};
const KEEPER_WARN:Record<KeeperKind,CueName>={wolf:'keeper-wolf','grey-wolf':'keeper-wolf',thornhound:'keeper-wolf',dragon:'keeper-breath',drake:'keeper-breath',eye:'keeper-glass',warden:'keeper-glass','tide-warden':'keeper-glass',giant:'keeper-stone',hollow:'keeper-stone'};
const KEEPER_RELEASE:Record<KeeperKind,CueName>={wolf:'release-pounce','grey-wolf':'release-pounce',thornhound:'release-pounce',dragon:'release-fire',drake:'release-fire',eye:'release-fire',warden:'release-tide','tide-warden':'release-tide',giant:'release-rock',hollow:'release-rock'};

export interface ChangeOptions {/** The dice card's tumble, in seconds (shorter with reduced motion). */tumble:number;/** True when the newly active actor belongs to this player. */mine:(actor:Actor)=>boolean}

/** Cues for what happened between two states of the same adventure, in order, spaced like the board shows them. */
export function soundsForChange(prev:GameState|undefined,next:GameState,options:ChangeOptions):SoundCue[]{
 if(!prev||prev===next)return [];
 const out:SoundCue[]=[];let t=0;
 const add=(cue:CueName,at:number,extra:Partial<SoundCue>={})=>out.push({cue,at,...extra});
 const before=new Map(prev.actors.map(a=>[a.id,a])),after=new Map(next.actors.map(a=>[a.id,a]));
 const tile=(x:number,y:number)=>next.tiles.find(c=>c.x===x&&c.y===y);
 const coast=next.options.biome==='coast';
 const fresh:GameEvent[]=next.events.filter(e=>e.id>prev.eventSequence);
 // A new chapter: the gateway carries the party through; nothing else from the old board sounds.
 if(next.scene!==prev.scene){add('gateway',0);return out}
 const moved=new Set<string>();
 for(const event of fresh){
  const actor=event.actorId?after.get(event.actorId):undefined,was=event.actorId?before.get(event.actorId):undefined;
  if(event.kind==='action'&&/ moves \d+ feet\.$/.test(event.text)&&actor&&was&&!moved.has(actor.id)){
   moved.add(actor.id);
   const distance=Math.abs(actor.x-was.x)+Math.abs(actor.y-was.y);if(!distance)continue;
   const duration=Math.min(.85,Math.max(.16,distance*.115)),steps=Math.min(distance,6),kind=tile(actor.x,actor.y)?.kind??'path';
   const cue=coast&&kind==='path'?'step-wood':STEP[kind];
   for(let i=0;i<steps;i++)add(cue,t+i*duration/steps,{gain:actor.enemy?.7:1});
   t+=duration;continue;
  }
  if(event.kind==='roll'&&event.attack&&actor){
   const a=event.attack,target=after.get(a.targetId);
   add('dice-throw',t);
   const strike=t+options.tumble*.85,land=t+options.tumble;
   if(actor.enemy){add(voiceOf(actor),strike-.05,{variation:1,gain:.8});add(a.action==='ability'||actor.keeper?'swing-heavy':'swing',strike)}
   else for(const [i,cue] of HERO_ATTACK[actor.heroClass][a.action].entries())add(cue,strike-.18*(HERO_ATTACK[actor.heroClass][a.action].length-1-i));
   if(a.hit){
    add(a.critical?'hit-heavy':'hit',land);
    if(a.critical)add('ui-confirm',land+.05,{rate:1.25,gain:.7});
    if(target?.enemy&&standing(target))add(voiceOf(target),land+.12,{variation:2,gain:.85});
    if(target&&!target.enemy&&target.guarding)add('clash',land,{gain:.6});
   }else if(target?.guarding)add('clash',land,{gain:.7});
   t=land+.35;continue;
  }
  if(event.kind==='roll'){add('dice-throw',t);t+=options.tumble*.6;continue}
  const text=event.text;
  if(/healing light restores/.test(text)){add('heal',t);t+=.6}
  else if(/raises a shield wall/.test(text)){add('shield',t);t+=.5}
  else if(/song inspires/.test(text)){add('song',t);t+=.6}
  else if(/^Roots burst/.test(text)){add('roots',t);t+=.6}
  else if(/ guards until their next turn/.test(text)){add('guard',t);t+=.4}
  else if(/ drinks a potion/.test(text)){add('uncork',t);add('drink',t+.35);t+=.8}
  else if(/ steps in front of /.test(text)){add('clash',t,{gain:.6});t+=.2}
  else if(/ is down! /.test(text)){add('fall',t+.1);t+=.5}
  else if(/The lantern revives/.test(text)){add('revive',t);t+=.5}
  else if(/ catches .* for \d+ damage/.test(text)){add('hit',t,{gain:.8});t+=.25}
  else if(/lands on empty ground|wash over empty ground|reaches the shrine’s light|is exposed until its next turn/.test(text)){add('relight',t,{variation:1,gain:.7});t+=.3}
  else if(/lifts a lantern shard/.test(text)){add('chest-unlock',t);add('chest-open',t+.35);add('shard',t+.95);add('shard-bell',t+1.15);t+=1.6}
  else if(actor?.keeper&&was&&standing(was)&&!standing(actor)){add('keeper-fall',t);t+=1}
  else if(actor?.enemy&&/ is defeated\./.test(text)){add(voiceOf(actor),t+.1,{variation:3});t+=.4}
 }
 // Keepers: a new plan is the warning; a plan carried out is the release.
 for(const actor of next.actors){
  const was=before.get(actor.id);if(!actor.keeper||!was)continue;
  if(actor.plan&&!was.plan){add(KEEPER_WARN[actor.keeper],t);add(voiceOf(actor),t+.4,{variation:1,gain:.7});t+=.8}
  else if(!actor.plan&&was.plan&&standing(actor)){out.unshift({cue:KEEPER_RELEASE[actor.keeper],at:0})}
 }
 // Whose turn: a chime when it comes back to you; a low note when the creatures begin theirs.
 if(next.status==='playing'&&next.activeActorId!==prev.activeActorId){
  const nowActive=after.get(next.activeActorId),wasActive=before.get(prev.activeActorId);
  if(nowActive&&options.mine(nowActive))add('turn-yours',t+.2);
  else if(nowActive?.enemy&&!wasActive?.enemy)add('turn-foes',t+.1);
 }
 return out.sort((a,b)=>a.at-b.at);
}
