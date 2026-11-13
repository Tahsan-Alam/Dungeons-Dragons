'use client';
import {useLayoutEffect,useRef,type ReactNode} from 'react';
import {Brand} from './Menu';
import {Icon} from './Art';
import './navigation.css';
export interface AppHeaderProps {active:'home'|'games'|null;onHome:()=>void;onGames:()=>void;onHelp:()=>void;onSettings:()=>void;inert?:boolean;children?:ReactNode;}
export default function AppHeader({active,onHome,onGames,onHelp,onSettings,inert=false,children}:AppHeaderProps){
 const ref=useRef<HTMLElement>(null);
 useLayoutEffect(()=>{const header=ref.current;if(!header)return;const update=()=>document.documentElement.style.setProperty('--app-header-height',`${header.getBoundingClientRect().height}px`);update();const observer=new ResizeObserver(update);observer.observe(header);return()=>observer.disconnect()},[]);
 return <header className="app-header" ref={ref} data-app-header inert={inert}>
  <div className="app-header-brand"><Brand onClick={onHome}/></div>
  <nav className="app-main-nav" aria-label="Main navigation"><button className={active==='home'?'active':''} aria-current={active==='home'?'page':undefined} data-tooltip="Return to camp and start a new quest." onClick={onHome}>Camp</button><button className={active==='games'?'active':''} aria-current={active==='games'?'page':undefined} data-tooltip="Continue saved adventures or watch a replay." onClick={onGames}>Adventures</button></nav>
  <div className="app-header-status">{children}</div>
  <div className="app-header-utilities"><button className="header-tool" title="Read the rules, controls and quest objectives." aria-label="Adventurer’s guide" onClick={onHelp}><Icon name="book" size={18}/><span>Adventurer’s guide</span></button><button className="header-tool" title="Change appearance, sound, key bindings and play preferences." aria-label="Table settings" onClick={onSettings}><Icon name="gear" size={18}/><span>Table settings</span></button></div>
 </header>;
}
/** Native dialogs already isolate the page; compact side panels need the same treatment. */
export function useHeaderInert(active:boolean){
 useLayoutEffect(()=>{if(!active)return;const header=document.querySelector<HTMLElement>('[data-app-header]');if(!header)return;const previous=header.inert;header.inert=true;return()=>{header.inert=previous}},[active]);
}
