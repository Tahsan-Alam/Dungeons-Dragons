'use client';
import {useEffect,useId} from 'react';
import './tooltip-layer.css';

type SavedTitle={present:boolean;value:string};
const clean=(value:string|null|undefined)=>value?.replace(/\s+/g,' ').trim()||'';

/** One delegated tooltip for app buttons, including controls inside native dialogs. */
export default function TooltipLayer(){
 const id=useId();
 useEffect(()=>{
  const tooltip=document.createElement('div');
  tooltip.id=`button-tooltip-${id}`;tooltip.className='app-button-tooltip';tooltip.setAttribute('role','tooltip');tooltip.hidden=true;
  let supportsPopover=typeof tooltip.showPopover==='function';
  if(supportsPopover)tooltip.setAttribute('popover','manual');
  const label=document.createElement('span'),shortcut=document.createElement('span');shortcut.className='app-button-tooltip-shortcut';tooltip.appendChild(label);tooltip.appendChild(shortcut);
  document.body.appendChild(tooltip);
  const titles=new Map<HTMLButtonElement,SavedTitle>();
  let hovered:HTMLButtonElement|null=null,focused:HTMLButtonElement|null=null,active:HTMLButtonElement|null=null,candidate:HTMLButtonElement|null=null,dismissed:HTMLButtonElement|null=null;
  let timer:ReturnType<typeof setTimeout>|null=null,keyboard=true,observing:MutationObserver|null=null;

  function buttonAt(target:EventTarget|null){
   const element=target instanceof Element?target:null,button=element?.closest('button');
   return button instanceof HTMLButtonElement&&button.closest('.app-root,dialog.modal,.toast')?button:null;
  }
  function nativeTitle(button:HTMLButtonElement){
   const current=button.getAttribute('title');
   return current!==null&&current!==''?current:titles.get(button)?.value||'';
  }
  function suppressTitle(button:HTMLButtonElement){
   const current=button.getAttribute('title');
   if(!titles.has(button))titles.set(button,{present:current!==null,value:current||''});
   else if(current!==null&&current!=='')titles.set(button,{present:true,value:current});
   // An empty title also suppresses titles inherited from surrounding elements.
   if(current!=='')button.setAttribute('title','');
  }
  function restoreTitle(button:HTMLButtonElement){
   const saved=titles.get(button);if(!saved)return;
   if(button.getAttribute('title')===''){if(saved.present)button.setAttribute('title',saved.value);else button.removeAttribute('title')}
   titles.delete(button);
  }
  function restoreUnusedTitles(){for(const button of titles.keys())if(!button.isConnected||(button!==hovered&&(button!==focused||!keyboard)))restoreTitle(button)}
  function content(button:HTMLButtonElement){
   const explicit=clean(button.getAttribute('data-tooltip'))||clean(nativeTitle(button))||clean(button.getAttribute('aria-label'));
   const clone=button.cloneNode(true) as HTMLButtonElement;
   clone.querySelectorAll('svg,kbd,[aria-hidden="true"],.sr-only').forEach(node=>node.remove());
   const text=explicit||clean(clone.textContent);
   const keys=[...new Set([...button.querySelectorAll('kbd')].map(node=>clean(node.textContent)).filter(Boolean))];
   return {text:text.length>420?`${text.slice(0,417).trimEnd()}…`:text,keys:keys.join(' / ')};
  }
  function detachDescription(){
   if(!active)return;
   const other=(active.getAttribute('aria-describedby')||'').split(/\s+/).filter(value=>value&&value!==tooltip.id);
   if(other.length)active.setAttribute('aria-describedby',other.join(' '));else active.removeAttribute('aria-describedby');
  }
  function hide(){
   if(timer){clearTimeout(timer);timer=null}candidate=null;
   observing?.disconnect();observing=null;detachDescription();active=null;
   if(supportsPopover&&tooltip.matches(':popover-open'))tooltip.hidePopover();
   tooltip.hidden=true;restoreUnusedTitles();
  }
  function position(button:HTMLButtonElement){
   const bounds=button.getBoundingClientRect(),dock=button.closest('.action-dock')?.getBoundingClientRect(),viewport=window.visualViewport;
   const viewportLeft=viewport?.offsetLeft||0,viewportTop=viewport?.offsetTop||0;
   const viewportRight=viewportLeft+(viewport?.width||window.innerWidth),viewportBottom=viewportTop+(viewport?.height||window.innerHeight);
   const dialog=!supportsPopover?tooltip.closest('dialog[open]') as HTMLDialogElement|null:null;
   const dialogBounds=dialog?.getBoundingClientRect();
   // Dialog animations create a containing block for fixed descendants. The fallback
   // uses its scrollable content coordinates and stays inside its visible client area.
   const scaleX=dialog&&dialogBounds&&dialog.offsetWidth?dialogBounds.width/dialog.offsetWidth:1;
   const scaleY=dialog&&dialogBounds&&dialog.offsetHeight?dialogBounds.height/dialog.offsetHeight:1;
   const dialogLeft=dialog&&dialogBounds?dialogBounds.left+dialog.clientLeft*scaleX:viewportLeft;
   const dialogTop=dialog&&dialogBounds?dialogBounds.top+dialog.clientTop*scaleY:viewportTop;
   const left=Math.max(viewportLeft,dialogLeft),top=Math.max(viewportTop,dialogTop);
   const right=Math.min(viewportRight,dialog?dialogLeft+dialog.clientWidth*scaleX:viewportRight);
   const bottom=Math.min(viewportBottom,dialog?dialogTop+dialog.clientHeight*scaleY:viewportBottom);
   const gap=8,margin=8;
   tooltip.style.position=dialog?'absolute':'fixed';
   tooltip.style.maxWidth=`${Math.max(1,Math.min(320,(right-left-margin*2)/scaleX))}px`;
   tooltip.style.maxHeight=`${Math.max(1,(bottom-top-margin*2)/scaleY)}px`;
   const size=tooltip.getBoundingClientRect(),anchorTop=dock?.top??bounds.top,anchorBottom=dock?.bottom??bounds.bottom;
   const aboveSpace=anchorTop-top-margin-gap,belowSpace=bottom-margin-anchorBottom-gap;
   const above=aboveSpace>=size.height||(belowSpace<size.height&&aboveSpace>=belowSpace);
   const x=Math.max(left+margin,Math.min(right-size.width-margin,bounds.left+bounds.width/2-size.width/2));
   const y=Math.max(top+margin,Math.min(bottom-size.height-margin,above?anchorTop-size.height-gap:anchorBottom+gap));
   tooltip.style.left=`${Math.round(dialog?(x-dialogLeft)/scaleX+dialog.scrollLeft:x)}px`;
   tooltip.style.top=`${Math.round(dialog?(y-dialogTop)/scaleY+dialog.scrollTop:y)}px`;
   tooltip.dataset.side=above?'above':'below';
  }
  function updateContent(button:HTMLButtonElement){
   const next=content(button);if(!next.text)return false;
   suppressTitle(button);label.textContent=next.text;
   shortcut.textContent=next.keys?`Shortcut: ${next.keys}`:'';shortcut.hidden=!next.keys;
   return true;
  }
  function show(button:HTMLButtonElement){
   timer=null;
   if(candidate!==button||dismissed===button||!button.isConnected||button.closest('[inert]')||!button.getClientRects().length){hide();return}
   if(!updateContent(button)){hide();return}
   active=button;
   const host=button.closest('dialog[open]')||document.body;
   if(tooltip.parentElement!==host)host.appendChild(tooltip);
   tooltip.style.visibility='hidden';tooltip.hidden=false;
   if(supportsPopover){try{tooltip.showPopover()}catch{supportsPopover=false;tooltip.removeAttribute('popover')}}
   position(button);tooltip.style.visibility='';
   const descriptions=new Set((button.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean));descriptions.add(tooltip.id);button.setAttribute('aria-describedby',[...descriptions].join(' '));
   observing=new MutationObserver(()=>{if(active!==button)return;if(updateContent(button))position(button);else hide()});
   observing.observe(button,{attributes:true,attributeFilter:['title','data-tooltip','aria-label','disabled','aria-disabled'],childList:true,characterData:true,subtree:true});
  }
  function request(button:HTMLButtonElement|null,delay=350){
   if(!button||button===dismissed){hide();return}
   if(button===active||button===candidate)return;
   hide();candidate=button;suppressTitle(button);timer=setTimeout(()=>show(button),delay);
  }
  function pointerOver(event:PointerEvent){
   if(event.pointerType!=='mouse'&&event.pointerType!=='pen')return;
   const next=buttonAt(event.target);if(next===hovered)return;
   hovered=next;if(dismissed!==focused)dismissed=null;request(next);restoreUnusedTitles();
  }
  function pointerOut(event:PointerEvent){
   if(event.pointerType!=='mouse'&&event.pointerType!=='pen')return;
   const next=buttonAt(event.relatedTarget);if(next===hovered)return;
   hovered=next;if(!hovered&&dismissed!==focused)dismissed=null;
   request(hovered||(keyboard?focused:null));restoreUnusedTitles();
  }
  function focusIn(event:FocusEvent){
   focused=buttonAt(event.target);if(dismissed!==focused)dismissed=null;
   if(keyboard)request(focused,180);restoreUnusedTitles();
  }
  function focusOut(event:FocusEvent){
   focused=buttonAt(event.relatedTarget);if(dismissed!==focused&&dismissed!==hovered)dismissed=null;
   request(hovered||(keyboard?focused:null));restoreUnusedTitles();
  }
  function pointerDown(){keyboard=false;dismissed=hovered||active;hide()}
  function keyDown(event:KeyboardEvent){
   keyboard=true;
   if(event.key==='Escape'){
    const visible=!tooltip.hidden;dismissed=active||candidate||hovered||focused;hide();
    if(visible){event.preventDefault();event.stopImmediatePropagation()}
   }else if(event.key==='Enter'||event.key===' '){dismissed=active||candidate;hide()}
  }
  function blur(){hovered=null;focused=null;dismissed=null;hide()}
  const removal=new MutationObserver(()=>{if((active&&!active.isConnected)||(candidate&&!candidate.isConnected))hide()});
  removal.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('pointerover',pointerOver,true);document.addEventListener('pointerout',pointerOut,true);document.addEventListener('pointerdown',pointerDown,true);
  document.addEventListener('focusin',focusIn,true);document.addEventListener('focusout',focusOut,true);document.addEventListener('keydown',keyDown,true);
  document.addEventListener('scroll',hide,true);window.addEventListener('resize',hide);window.addEventListener('blur',blur);
  window.visualViewport?.addEventListener('resize',hide);window.visualViewport?.addEventListener('scroll',hide);
  return()=>{
   removal.disconnect();hovered=null;focused=null;hide();for(const button of titles.keys())restoreTitle(button);tooltip.remove();
   document.removeEventListener('pointerover',pointerOver,true);document.removeEventListener('pointerout',pointerOut,true);document.removeEventListener('pointerdown',pointerDown,true);
   document.removeEventListener('focusin',focusIn,true);document.removeEventListener('focusout',focusOut,true);document.removeEventListener('keydown',keyDown,true);
   document.removeEventListener('scroll',hide,true);window.removeEventListener('resize',hide);window.removeEventListener('blur',blur);
   window.visualViewport?.removeEventListener('resize',hide);window.visualViewport?.removeEventListener('scroll',hide);
  };
 },[id]);
 return null;
}
