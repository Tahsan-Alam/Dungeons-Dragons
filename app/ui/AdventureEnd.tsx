'use client';
import {useLayoutEffect,useRef} from 'react';
import type {GameState} from '../../game/types';
import {storyGoal} from '../../game/campaign';
import {GAME_MASTER_ART_RATIO,SCENE_FOR_BIOME,SETTING} from '../../game/presets';
import {builtInTale} from '../../game/lore';
import RouteMap from './RouteMap';
import {routeHeadline,routeView} from './route-map';
import {adventureRecap,fallenLine} from './recap';
import {Portrait} from './RealmKit';
import {gameMasterDrawing} from './game-master-figure';
import {useTheme} from './Theme';
import './chapter-map.css';
import './adventure-end.css';

/** The end of an adventure. Victory in a built-in tale relights the whole road to the Waylantern on the map;
    defeat and custom tales show the Game Master in the tale's place. The recap reads the final game state. */
export default function AdventureEnd({game,caption,onReplay,onAdventures,onNewQuest}:{game:GameState;caption:string;onReplay?:()=>void;onAdventures:()=>void;onNewQuest:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),leave=useRef(onAdventures);
 useLayoutEffect(()=>{leave.current=onAdventures});
 useLayoutEffect(()=>{
  const el=dialog.current;el?.showModal();(el?.querySelector('[data-autofocus]') as HTMLElement|null)?.focus();
  const cancel=(e:Event)=>{e.preventDefault();leave.current()};el?.addEventListener('cancel',cancel);
  return()=>{el?.removeEventListener('cancel',cancel);el?.close()};
 },[]);
 const{reducedMotion}=useTheme();
 const recap=adventureRecap(game),won=game.status==='victory',story=game.options.creation?.story;
 const view=won?routeView(game):null,figure=gameMasterDrawing(game.options.creation?.narrator);
 const headline=view&&story?routeHeadline(view,story.locations):won?'The lantern is restored':'The lantern dims';
 const eyebrow=`${won?'Victory':'Defeat'}${story?` · ${story.title}`:''}${story&&builtInTale(story)?` · ${SETTING}`:''}`;
 return <dialog ref={dialog} className={`adventure-end realm ${won?'won':'lost'}`} aria-labelledby="end-title">
  <div className="ae-layout">
   <div className="ae-visual">
    {view&&story?<RouteMap view={view} places={story.locations} animate={!reducedMotion} motion={!reducedMotion}/>
     :<><img className="ae-scene" src={SCENE_FOR_BIOME[game.options.biome].scene} alt="" aria-hidden="true"/><div className="ae-wash" aria-hidden="true"/>
      <div className="ae-figure" aria-hidden="true"><img src={figure.art} alt=""/></div></>}
   </div>
   <section className="ae-panel" aria-label="Adventure recap">
    <span className="realm-eyebrow">{eyebrow}</span>
    <h1 id="end-title">{headline}</h1>
    <div className="ae-line"><Portrait art={figure.art} face={figure.face} ratio={GAME_MASTER_ART_RATIO} width={48} height={48} scale={2.4} eye={0.4}/><p>“{caption}”</p></div>
    <dl className="ae-stats">
     <div><dt>Shards</dt><dd>{game.relics} / {storyGoal(game)}</dd></div><div><dt>Chapters</dt><dd>{recap.chapters}</dd></div><div><dt>Rounds</dt><dd>{recap.rounds}</dd></div>
     <div><dt>Damage dealt</dt><dd>{recap.damageDealt}</dd></div><div><dt>Damage taken</dt><dd>{recap.damageTaken}</dd></div><div><dt>Critical hits</dt><dd>{recap.criticals}</dd></div>
    </dl>
    <ul className="ae-party" aria-label="Party">{recap.heroes.map(hero=><li key={hero.id} className={hero.fallen?'fallen':''}><strong>{hero.name}</strong><span>{hero.fallen?'Fallen':`${hero.hp} / ${hero.maxHp}`}</span></li>)}</ul>
    <p className="ae-note">{fallenLine(recap.fallen)}{recap.partial?' Damage and critical hits cover the last part of this adventure.':''}</p>
    <div className="ae-actions">
     {onReplay?<button type="button" className="ae-secondary" onClick={onReplay}>Watch replay</button>:null}
     <button type="button" className="ae-secondary" onClick={onAdventures}>Adventures</button>
     <button type="button" className="ae-primary" data-autofocus onClick={onNewQuest}>New quest<span aria-hidden="true">›</span></button>
    </div>
   </section>
  </div>
 </dialog>;
}
