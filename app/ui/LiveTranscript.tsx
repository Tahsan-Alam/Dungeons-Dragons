'use client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {TranscriptLine} from './live-transcript';

export default function LiveTranscript({lines,active,onClear}:{lines:TranscriptLine[];active:boolean;onClear:()=>void}){
 const viewport=useRef<HTMLDivElement>(null),follow=useRef(true);
 const [following,setFollowing]=useState(true),[announcement,setAnnouncement]=useState<TranscriptLine|null>(null);
 const last=lines.at(-1),finished=lines.findLast(line=>line.complete);
 // Announce complete turns and quiet phrases, never every streamed character.
 useEffect(()=>{if(finished){const timer=setTimeout(()=>setAnnouncement(finished),0);return()=>clearTimeout(timer);}},[finished]);
 useEffect(()=>{
  if(last&&!last.complete){const timer=setTimeout(()=>setAnnouncement(last),1200);return()=>clearTimeout(timer);}
 },[last]);
 useLayoutEffect(()=>{
  if(!lines.length)follow.current=true;
  if(follow.current&&viewport.current)viewport.current.scrollTop=viewport.current.scrollHeight;
 },[lines]);
 useEffect(()=>{
  const el=viewport.current;if(!el)return;
  // Wrapping and the caption height change when switching to a phone layout.
  const resize=new ResizeObserver(()=>{if(follow.current)el.scrollTop=el.scrollHeight;});
  resize.observe(el);return()=>resize.disconnect();
 },[]);
 function latest(){follow.current=true;setFollowing(true);if(viewport.current){viewport.current.scrollTop=viewport.current.scrollHeight;viewport.current.focus({preventScroll:true});}}
 return <section className="creator-captions" aria-label="Narrator captions">
  <div className="creator-captions-heading"><span>Live transcript</span>{active?<span className="creator-captions-live">Live</span>:null}<div>{!following?<button type="button" className="creator-link" onClick={latest}>Latest</button>:null}<button type="button" className="creator-link" onClick={()=>{latest();onClear();}} disabled={!lines.length} aria-label="Clear voice transcript">Clear</button></div></div>
  <div ref={viewport} className="creator-caption-scroll" role="region" aria-label="Recent voice transcript" aria-live="off" tabIndex={0} onScroll={e=>{const el=e.currentTarget;follow.current=el.scrollHeight-el.scrollTop-el.clientHeight<24;setFollowing(follow.current);}}>
   {lines.length?lines.map(line=><p className="creator-caption-line" key={line.id} data-speaker={line.role}><strong>{line.name}</strong>{line.text}</p>):<p className="creator-caption-fallback">Speech will appear here. Captions stay when sound is muted.</p>}
  </div>
  <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement&&lines.some(line=>line.id===announcement.id)?`${announcement.name}: ${announcement.text}`:''}</p>
 </section>;
}
