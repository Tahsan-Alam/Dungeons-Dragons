import type {GameState} from '../../game/types';

export interface RecapHero {id:string;name:string;hp:number;maxHp:number;fallen:boolean}
export interface Recap {
 rounds:number;chapters:number;heroes:RecapHero[];fallen:string[];
 damageDealt:number;damageTaken:number;criticals:number;
 /** The event log keeps only its newest entries, so long adventures have totals for the final stretch only. */
 partial:boolean;
}

/** An end-of-adventure summary taken from the final state and its retained events. It reads the game; it never changes it. */
export function adventureRecap(game:GameState):Recap {
 const heroes=game.actors.filter(actor=>!actor.enemy),heroIds=new Set(heroes.map(hero=>hero.id));
 let damageDealt=0,damageTaken=0,criticals=0;
 for(const event of game.events){
  const attack=event.attack;if(!attack?.hit)continue;
  const byHero=!!event.actorId&&heroIds.has(event.actorId),onHero=heroIds.has(attack.targetId);
  if(byHero&&!onHero){damageDealt+=attack.damage;if(attack.critical)criticals++}
  else if(onHero&&!byHero)damageTaken+=attack.damage;
 }
 return {
  rounds:game.round,chapters:game.scene+1,
  heroes:heroes.map(hero=>({id:hero.id,name:hero.name,hp:Math.max(0,hero.hp),maxHp:hero.maxHp,fallen:hero.defeated||hero.hp<=0})),
  fallen:heroes.filter(hero=>hero.defeated||hero.hp<=0).map(hero=>hero.name),
  damageDealt,damageTaken,criticals,
  partial:game.events.length>0&&game.events[0].id>1,
 };
}

/** One sentence naming who fell, for the results dialog. */
export function fallenLine(names:string[]):string {
 if(!names.length)return 'Everyone is still standing.';
 if(names.length===1)return `${names[0]} fell.`;
 return `${names.slice(0,-1).join(', ')} and ${names.at(-1)} fell.`;
}
