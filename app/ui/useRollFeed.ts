'use client';
import {useState} from 'react';
import type {GameState} from '../../game/types';
import {collectSharedRolls,dismissSharedRoll,startRollFeed} from './roll-feed';

export function useRollFeed(gameId:string|null,game:GameState|null,playerId:string,includeOpeningRolls=false){
 const[feed,setFeed]=useState(()=>startRollFeed(gameId,game,includeOpeningRolls));
 const next=collectSharedRolls(feed,gameId,game,playerId,includeOpeningRolls);
 // Derive before commit so a final enemy roll precedes the defeat dialog.
 if(next!==feed)setFeed(next);
 return {queue:next.queue,dismiss:(eventId:number)=>setFeed(current=>dismissSharedRoll(current,eventId))};
}
