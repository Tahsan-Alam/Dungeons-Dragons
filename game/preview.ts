import {applyAction, createGame} from './engine';
import type {GameState, Tile} from './types';

/** A small, isolated example. It never enters the player's save library. */
export function createPreviewFrames(): GameState[] {
  const game = createGame([
    {id:'preview', name:'Rowan', heroClass:'ranger', color:'#8ac4ae', bot:false},
    {id:'companion', name:'Iris', heroClass:'mage', color:'#b19bd3', bot:true},
  ], {rules:'simple', seed:'homepage-preview', narrator:'warm', biome:'woodland', companions:1});
  game.width=10; game.height=8;
  const trees=new Set(['0,1','1,2','8,1','9,2','0,6','1,7','8,7','9,6']);
  game.tiles=Array.from({length:80},(_,i):Tile=>{
    const x=i%10,y=Math.floor(i/10);
    const kind=x>=7&&y>=4&&y<=5?'water':(y===4&&x<7)||(x===5&&y>1&&y<6)?'path':'grass';
    return {x,y,kind,...(trees.has(`${x},${y}`)?{decoration:'tree' as const}:x===7&&y===1?{decoration:'ruin' as const}:x===2&&y===2?{decoration:'flower' as const}:{})};
  });
  const [ranger,mage]=game.actors.filter(a=>!a.enemy),enemy=game.actors.find(a=>a.enemy)!;
  Object.assign(ranger,{x:2,y:5,movement:7});
  Object.assign(mage,{x:2,y:6});
  Object.assign(enemy,{x:6,y:3,hp:16,maxHp:16,name:'Moss goblin'});
  game.actors=[ranger,mage,enemy];
  game.turnOrder=game.actors.map(a=>a.id);game.activeActorId=ranger.id;
  game.chest={x:5,y:2,opened:false};game.exit={x:8,y:2};
  game.events=[];game.eventSequence=0;
  const moved=applyAction(game,'preview',{type:'move',x:4,y:4});
  const attacked=applyAction(moved,'preview',{type:'attack',targetId:enemy.id});
  return [game,moved,attacked];
}
