'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {panelSizes,resizePanel} from './controls';
import {useControls} from './useControls';
export function usePanels(){
 const{preferences,update}=useControls();const container=useRef<HTMLDivElement>(null);const[width,setWidth]=useState(1280),[dragging,setDragging]=useState(false),[draft,setDraft]=useState<{left:number;right:number}|null>(null);const sizes=panelSizes(width,preferences.panels);const actual=draft||sizes;const drag=useRef<{side:'left'|'right';startX:number;left:number;right:number}|null>(null);const final=useRef(actual);final.current=actual;
 useEffect(()=>{const node=container.current;if(!node)return;const observer=new ResizeObserver(entries=>{setWidth(entries[0].contentRect.width);setDraft(null);drag.current=null;setDragging(false)});observer.observe(node);return()=>observer.disconnect()},[]);
 const save=(next:{left:number;right:number})=>update({panels:{left:next.left/width,right:next.right/width}});
 function reset(side:'left'|'right'){const defaults=panelSizes(width);save({...sizes,[side]:defaults[side]});setDraft(null)}
 function separator(side:'left'|'right'){return <div className={`panel-resizer ${dragging&&drag.current?.side===side?'resizing':''}`} role="separator" aria-orientation="vertical" aria-label={`Resize ${side==='left'?'party':'journal'} panel`} aria-valuemin={side==='left'?160:200} aria-valuemax={side==='left'?350:420} aria-valuenow={Math.round(actual[side])} tabIndex={0} title="Drag to resize. Double-click to reset. Arrow keys adjust; Home resets."
 onDoubleClick={()=>reset(side)} onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);drag.current={side,startX:e.clientX,left:sizes.left,right:sizes.right};setDragging(true)}}
 onPointerMove={e=>{if(!drag.current||drag.current.side!==side)return;const delta=(e.clientX-drag.current.startX)*(side==='left'?1:-1);const next=resizePanel(width,drag.current,side,drag.current[side]+delta);final.current=next;setDraft(next)}}
 onPointerUp={e=>{if(!drag.current)return;save(final.current);drag.current=null;setDragging(false);setDraft(null);e.currentTarget.releasePointerCapture(e.pointerId)}} onPointerCancel={()=>{drag.current=null;setDragging(false);setDraft(null)}}
 onKeyDown={e=>{if(e.key==='Home'||e.key==='Enter'){e.preventDefault();reset(side)}else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();e.stopPropagation();const change=(e.key==='ArrowRight'?1:-1)*(side==='left'?1:-1)*(e.shiftKey?40:12);save(resizePanel(width,sizes,side,sizes[side]+change))}}}><span/></div>}
 return{container,separator,compact:width<=1000,dragging,style:{'--party-width':`${actual.left}px`,'--story-width':`${actual.right}px`} as CSSProperties};
}
