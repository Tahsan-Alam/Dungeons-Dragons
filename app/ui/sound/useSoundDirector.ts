'use client';
import {useEffect,useRef} from 'react';
import type {Actor,GameState} from '../../../game/types';
import {useTheme} from '../Theme';
import {ROLL_TUMBLE_MS} from '../RollCard';
import {sound} from './engine';
import {ambienceForPlay,cuesToPreload,musicForPlay,soundsForChange} from './game-sounds';
import type {MusicName} from './catalog';

interface Direction {screen:'home'|'games'|'solo'|'online'|'join'|'play'|'replay';game:GameState|null;adventureId:string|null;playerId:string;/** The between-chapters map is open. */road:boolean}

/** Chooses the music and the beds for the screen and the place, and turns each change of the game into its sounds. */
export function useSoundDirector({screen,game,adventureId,playerId,road}:Direction){
 const{resolvedColorMode,reducedMotion}=useTheme(),night=resolvedColorMode==='dark';
 const previous=useRef<{id:string|null;game:GameState|null}>({id:null,game:null});

 // Music and ambience follow the screen; in play they follow the place, the hour, the Keeper and the party's health.
 const playing=screen==='play'&&game;
 const music:MusicName|null=screen==='replay'?'replay':playing?(road&&game.status==='playing'?'road':musicForPlay(game,night)):screen==='online'||screen==='join'?'camp':'title';
 const ambience=playing&&game.status==='playing'?ambienceForPlay(game,night):screen==='online'||screen==='join'?{beds:[{name:'fire' as const,gain:.8}],gulls:false}:{beds:[],gulls:false};
 const bedKey=JSON.stringify(ambience);
 useEffect(()=>{sound.setMusic(music)},[music]);
 useEffect(()=>{sound.setAmbience(ambience.beds,ambience.gulls)},[bedKey]); // eslint-disable-line react-hooks/exhaustive-deps -- keyed by content

 // Fetch a chapter's voices as it opens.
 const chapterKey=playing?`${adventureId}-${game.scene}`:null;
 useEffect(()=>{if(playing)sound.preload(cuesToPreload(game))},[chapterKey]); // eslint-disable-line react-hooks/exhaustive-deps -- once per chapter

 // What just happened: compare with the last state of the same adventure only, so opening a save is silent.
 useEffect(()=>{
  const last=previous.current;previous.current={id:adventureId,game:playing?game:null};
  if(!playing||last.id!==adventureId||!last.game)return;
  const mine=(actor:Actor)=>!actor.enemy&&!actor.bot&&actor.playerId===playerId;
  for(const cue of soundsForChange(last.game,game,{tumble:reducedMotion?.15:ROLL_TUMBLE_MS/1000,mine}))
   sound.play(cue.cue,{delay:cue.at,gain:cue.gain,rate:cue.rate,variation:cue.variation});
 },[game,adventureId,playing,playerId,reducedMotion]);
}
