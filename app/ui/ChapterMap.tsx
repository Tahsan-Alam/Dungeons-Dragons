'use client';
import {useLayoutEffect,useRef,useState} from 'react';
import RouteMap from './RouteMap';
import {describeRoute,lower,routeHeadline,type RouteView} from './route-map';
import {Portrait,RealmButton} from './RealmKit';
import {useTheme} from './Theme';
import {GAME_MASTERS,GAME_MASTER_ART_RATIO,SETTING} from '../../game/presets';
import type {GameState} from '../../game/types';
import './chapter-map.css';

const ROMAN=['I','II','III','IV','V'];

/** Between chapters: the road relights on the map, and the next chapter opens beside it. Built-in tales only. */
export default function ChapterMap({game,view,caption,onClose}:{game:GameState;view:RouteView;caption:string;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),go=useRef<HTMLDivElement>(null),close=useRef(onClose);
 useLayoutEffect(()=>{close.current=onClose});
 const{reducedMotion}=useTheme();
 const[settled,setSettled]=useState(reducedMotion||!view.fresh.length);
 useLayoutEffect(()=>{
  const el=dialog.current;el?.showModal();go.current?.querySelector('button')?.focus();
  const cancel=(e:Event)=>{e.preventDefault();close.current()};el?.addEventListener('cancel',cancel);
  return()=>{el?.removeEventListener('cancel',cancel);el?.close()};
 },[]);
 const story=game.options.creation!.story,places=story.locations;
 const gm=GAME_MASTERS.find(g=>g.profile.name===game.options.creation?.narrator.name);
 const chapter=game.scene+1,final=chapter>=view.total;
 return <dialog ref={dialog} className="chapter-map realm" aria-labelledby="chapter-map-title" aria-describedby="chapter-map-route">
  <div className="cm-layout">
   <header className="cm-head">
    <span className="realm-eyebrow">{SETTING} · {story.world} · {story.title}</span>
    <h1 id="chapter-map-title">{routeHeadline(view,places)}</h1>
   </header>
   <div className={`cm-map${settled?' is-settled':''}`} onClick={()=>setSettled(true)}>
    <RouteMap view={view} places={places} animate={!reducedMotion&&!settled} motion={!reducedMotion} onSettled={()=>setSettled(true)}/>
    <p id="chapter-map-route" className="sr-only">{describeRoute(view,places)}</p>
   </div>
   <div className="cm-foot">
    <div className="cm-key" aria-hidden="true">
     <span><i className="cm-swatch lit"/>Relit</span><span><i className="cm-swatch dark"/>Still dark</span><span><i className="cm-swatch here"/>Your party</span><span><i className="cm-swatch shard"/>Shard recovered</span>
    </div>
    <p className="cm-shards">{Array.from({length:view.total},(_,i)=><i key={i} className={i<game.relics?'on':''} aria-hidden="true"/>)}<span>{game.relics} of {view.total} lantern shards</span></p>
   </div>
   <section className="cm-chapter realm-panel" aria-label="Next chapter">
    <span className="realm-eyebrow">Chapter {ROMAN[game.scene]??chapter} of {ROMAN[view.total-1]??view.total}{final&&view.total>1?' · the final chapter':''}</span>
    <h2>{game.sceneName}</h2>
    {gm?<div className="cm-gm"><Portrait art={gm.art} face={gm.face} ratio={GAME_MASTER_ART_RATIO} width={56} height={56} scale={2.4} eye={0.4}/><div><strong>{gm.title}</strong><span>{gm.realName}</span></div></div>
     :<div className="cm-gm"><div><strong>{game.options.creation?.narrator.name}</strong></div></div>}
    <p className="cm-opening">“{caption}”</p>
    <p className="cm-objective">{game.objective}</p>
   </section>
   <div className="cm-actions" ref={go}>
    <RealmButton variant="primary" style={{width:'100%'}} onClick={()=>close.current()}>Enter {lower(game.sceneName)}</RealmButton>
    <span className="cm-skip" aria-hidden={settled} style={{visibility:settled?'hidden':undefined}}>Select the map to finish the animation</span>
   </div>
  </div>
 </dialog>;
}
