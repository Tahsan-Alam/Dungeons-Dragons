'use client';
import {useEffect,useRef,useState,type KeyboardEvent} from 'react';
import {Icon,Panorama} from './Art';
import './landing.css';

type Props={onNew:(mode:'solo'|'online')=>void;onQuick:()=>void;onJoin:()=>void;onGames:()=>void;onHelp:()=>void;onSettings:()=>void;onResume?:()=>void;resumeTitle?:string;disabled:boolean};
type View='main'|'quest'|'friends';
/** `detail` stays visible under the label; `tip` appears in the shared tooltip layer. */
type Item={id:string;label:string;icon:string;run:()=>void;detail?:string;tip?:string;locked?:boolean;opens?:boolean;back?:boolean};
const PARTY=[{heroClass:'knight' as const,color:'#ef997c'},{heroClass:'ranger' as const,color:'#8ac4ae'},{heroClass:'mage' as const,color:'#b19bd3'},{heroClass:'cleric' as const,color:'#a3bbf0'}];
const HEADINGS:Record<View,string>={main:'Main menu',quest:'New quest',friends:'Play with friends'};

/** Camp is the game's title menu. Every entry calls an existing action; nothing here writes a save. */
export default function Landing({onNew,onQuick,onJoin,onGames,onHelp,onSettings,onResume,resumeTitle,disabled}:Props){
 const[{view,moved},setMenu]=useState<{view:View;moved:boolean}>({view:'main',moved:false});
 const list=useRef<HTMLUListElement>(null);
 function open(next:View){setMenu({view:next,moved:true})}
 const back:Item={id:'back',label:'Back',icon:'back',run:()=>open('main'),tip:'Return to the main menu.',back:true};
 const menus:Record<View,Item[]>={
  main:[
   ...(onResume&&resumeTitle?[{id:'continue',label:'Continue quest',detail:resumeTitle,tip:'Pick up your most recent adventure where you left it.',icon:'book',run:onResume,locked:disabled}]:[]),
   {id:'quest',label:'New quest',tip:'Start a solo adventure with scripted companions.',icon:'dice',run:()=>open('quest'),opens:true},
   {id:'friends',label:'Play with friends',tip:'Host a party or join one with a code. Up to ten heroes.',icon:'people',run:()=>open('friends'),opens:true},
   {id:'adventures',label:'Adventures',tip:'Saved quests and replays.',icon:'flag',run:onGames},
   {id:'guide',label:'Adventurer’s guide',tip:'Rules, controls and quest objectives.',icon:'book',run:onHelp},
   {id:'settings',label:'Table settings',tip:'Appearance, sound, key bindings and play preferences.',icon:'gear',run:onSettings},
  ],
  quest:[
   {id:'quick',label:'Quick start',detail:'A ready-made story and hero. Review them, then begin.',icon:'spark',run:onQuick,locked:disabled},
   {id:'create',label:'Create your own',detail:'Shape the story, narrator and hero with your guide.',icon:'dice',run:()=>onNew('solo'),locked:disabled},
   back,
  ],
  friends:[
   {id:'host',label:'Gather party',detail:'Create an adventure, then invite friends to your camp.',icon:'people',run:()=>onNew('online'),locked:disabled},
   {id:'join',label:'Join party',detail:'Enter a six-letter party code.',icon:'link',run:onJoin,locked:disabled},
   back,
  ],
 };
 const items=menus[view],lead=items[0].id;
 // Moving between menus is the player's action, so focus follows it; the first visit leaves focus alone.
 useEffect(()=>{if(moved)list.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()},[view,moved]);
 function keys(event:KeyboardEvent<HTMLUListElement>){
  if(event.key==='Escape'&&view!=='main'){event.preventDefault();open('main');return}
  const buttons=[...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];if(!buttons.length)return;
  let index=buttons.indexOf(document.activeElement as HTMLButtonElement);
  if(event.key==='ArrowDown')index=(index+1)%buttons.length;else if(event.key==='ArrowUp')index=(index-1+buttons.length)%buttons.length;else if(event.key==='Home')index=0;else if(event.key==='End')index=buttons.length-1;else return;
  event.preventDefault();buttons[index]?.focus();
 }
 return <main className="title-screen">
  <div className="title-art" aria-hidden="true"><Panorama biome="woodland" characters={PARTY}/></div>
  <section className="title-panel" aria-labelledby="title-heading">
   <div className="title-heading"><h1 id="title-heading">Painted<span> Realms</span></h1><p>{view==='main'?'A tabletop adventure in your browser. 1–10 players, turn-based.':HEADINGS[view]}</p></div>
   <nav aria-label={HEADINGS[view]}><ul className="title-menu" ref={list} onKeyDown={keys}>{items.map(item=><li key={item.id}><button type="button" className={`button ${item.id===lead?'primary':'paper'} title-item ${item.back?'title-back':''}`} disabled={item.locked} data-tooltip={item.tip} aria-describedby={item.detail?`title-detail-${item.id}`:undefined} onClick={item.run}><Icon name={item.icon} size={19}/><span className="title-item-label">{item.label}{item.detail?<small id={`title-detail-${item.id}`} aria-hidden="true">{item.detail}</small>:null}</span>{item.opens?<Icon name="arrow" size={17}/>:null}</button></li>)}</ul></nav>
  </section>
 </main>;
}
