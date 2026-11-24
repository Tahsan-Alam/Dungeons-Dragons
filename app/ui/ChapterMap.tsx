'use client';
import {useLayoutEffect,useRef,useState} from 'react';
import RouteMap from './RouteMap';
import {describeRoute,routeHeadline,type RouteView} from './route-map';
import {RealmButton} from './RealmKit';
import {useTheme} from './Theme';
import {SETTING} from '../../game/presets';
import type {GameState} from '../../game/types';
import './chapter-map.css';

const ROMAN=['I','II','III','IV','V'];

/** Between chapters: the road relights on the map, then the Game Master opens the next chapter (ChapterOpening). Built-in tales only.
    With `look`, the same map opened from the table during a chapter (The road): nothing relights and it closes back to play. */
export default function ChapterMap({game,view,onClose,look=false}:{game:GameState;view:RouteView;onClose:()=>void;look?:boolean}){
 const dialog=useRef<HTMLDialogElement>(null),go=useRef<HTMLDivElement>(null),close=useRef(onClose);
 useLayoutEffect(()=>{close.current=onClose});
 const{reducedMotion}=useTheme();
 const[settled,setSettled]=useState(look||reducedMotion||!view.fresh.length);
 useLayoutEffect(()=>{
  const el=dialog.current;el?.showModal();go.current?.querySelector('button')?.focus();
  const cancel=(e:Event)=>{e.preventDefault();close.current()};el?.addEventListener('cancel',cancel);
  return()=>{el?.removeEventListener('cancel',cancel);el?.close()};
 },[]);
 const story=game.options.creation!.story,places=story.locations;
 const chapter=game.scene+1,final=chapter>=view.total;
 return <dialog ref={dialog} className={`chapter-map realm${look?' cm-look':''}`} aria-labelledby="chapter-map-title" aria-describedby="chapter-map-route">
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
   <div className="cm-actions" ref={go}>
    {look?<><span className="cm-next">Now · Chapter {ROMAN[game.scene]??chapter} of {ROMAN[view.total-1]??view.total} · <strong>{game.sceneName}</strong></span><RealmButton style={{width:'100%'}} onClick={()=>close.current()}>Back to the table</RealmButton><span className="cm-skip">Esc closes the map</span></>
    :<><span className="cm-next">Next · Chapter {ROMAN[game.scene]??chapter} of {ROMAN[view.total-1]??view.total}{final&&view.total>1?' · the final chapter':''} · <strong>{game.sceneName}</strong></span><RealmButton variant="primary" style={{width:'100%'}} onClick={()=>close.current()}>Continue</RealmButton>
    <span className="cm-skip" aria-hidden={settled} style={{visibility:settled?'hidden':undefined}}>Select the map to finish the animation</span></>}
   </div>
  </div>
 </dialog>;
}
