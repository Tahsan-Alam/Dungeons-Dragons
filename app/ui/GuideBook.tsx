'use client';
import {useState,type ReactNode} from 'react';
import Modal from './Modal';
import {ShortcutReference} from './ControlsSettings';
import './menu-kit.css';
import './guide-book.css';

/* The Adventurer's guide as a field guide: an open book over the dimmed table, with cloth ribbons for its chapters.
   Phones show one page at a time. */
type Ribbon='playing'|'keys'|'rules'|'credits';
const RIBBONS:[Ribbon,string][]=[['playing','Playing'],['keys','Keys'],['rules','Rules'],['credits','Credits']];
/** Rules and credits share a spread; the Credits ribbon opens its right-hand page. */
const SPREAD:Record<Ribbon,number>={playing:0,keys:1,rules:2,credits:2};

const Ink=({children,size=32}:{children:ReactNode;size?:number})=><svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">{children}</svg>;
const STEP_ICONS={
 move:<Ink><path d="M8.5 26.5c-2 0-3-1.6-2.6-3.4l.8-3.6c.5-2.3 1.6-4 3.4-4s2.6 1.8 2.3 4l-.6 4.2c-.3 1.8-1.4 2.8-3.3 2.8z"/><path d="M7.4 22.6h4.6"/><path d="M21.5 18.5c-2 0-3-1.6-2.6-3.4l.8-3.6c.5-2.3 1.6-4 3.4-4s2.6 1.8 2.3 4l-.6 4.2c-.3 1.8-1.4 2.8-3.3 2.8z"/><path d="M20.4 14.6H25"/></Ink>,
 act:<Ink><path d="M25 5l-2 6L11 23l-2-2L21 9z"/><path d="M8 18l6 6M7 25l3-3"/><circle cx="6" cy="26" r="1.6"/></Ink>,
 end:<Ink><path d="M10 5h12M10 27h12"/><path d="M11 5c0 6 5 7 5 11s-5 5-5 11M21 5c0 6-5 7-5 11s5 5 5 11"/><path d="M13 24c1.5-1.5 4.5-1.5 6 0"/></Ink>,
};
const STATIONS:[ReactNode,string][]=[
 [<Ink key="f" size={28}><path d="M22 4l-2 5L9 20l-2-2L18 7z"/><path d="M6 16l6 6M5 23l3-3"/></Ink>,'Defeat the foes'],
 [<Ink key="c" size={28}><rect x="4" y="11" width="20" height="12" rx="1"/><path d="M4 15h20M6 11c0-4 3-6 8-6s8 2 8 6M14 14v4"/></Ink>,'Open the chest'],
 [<Ink key="s" size={28}><path d="M14 3l6 9-6 13-6-13z"/><path d="M8 12h12"/></Ink>,'Take the shard'],
 [<Ink key="g" size={28}><path d="M6 25V12a8 8 0 0 1 16 0v13M3 25h22M10 25v-9a4 4 0 0 1 8 0v9"/></Ink>,'Reach the gateway'],
];
const BOARD_ICONS={
 look:<Ink size={34}><path d="M12 18V8a2 2 0 0 1 4 0v8M16 15V6a2 2 0 0 1 4 0v10M20 15V8a2 2 0 0 1 4 0v11c0 6-3 10-8 10s-7-3-9-7l-2-4a2 2 0 0 1 3.4-2L12 20"/></Ink>,
 way:<Ink size={34}><circle cx="8" cy="26" r="2"/><circle cx="14" cy="20" r="1.5"/><circle cx="19" cy="15" r="1.5"/><circle cx="24" cy="10" r="1.5"/><path d="M26 4l4 4-4 4"/></Ink>,
 map:<Ink size={34}><path d="M4 8l8-3 10 3 8-3v21l-8 3-10-3-8 3z"/><path d="M12 5v21M22 8v21"/></Ink>,
 foe:<Ink size={34}><circle cx="17" cy="14" r="7"/><path d="M13 13h.01M21 13h.01M14 18c2 1.4 4 1.4 6 0M8 30c1-5 5-8 9-8s8 3 9 8"/></Ink>,
 journal:<Ink size={34}><path d="M6 6h16a4 4 0 0 1 4 4v18H10a4 4 0 0 1-4-4z"/><path d="M10 12h10M10 17h10M10 22h6"/></Ink>,
 leave:<Ink size={34}><path d="M14 8H7v20h7M12 18h16M23 13l5 5-5 5"/></Ink>,
};

type Props={onClose:()=>void;onCustomize:()=>void;moveKeys:string;panKeys:string};
export default function GuideBook({onClose,onCustomize,moveKeys,panKeys}:Props){
 const[ribbon,setRibbon]=useState<Ribbon>('playing'),[leaf,setLeaf]=useState(0);
 const spread=SPREAD[ribbon];
 const open=(next:Ribbon)=>{setRibbon(next);setLeaf(next==='credits'?1:0)};
 const nextSpread:Ribbon|null=spread===0?'keys':spread===1?'rules':null;
 const Turn=({side}:{side:'left'|'right'})=>side==='left'
  ?<button type="button" className="gb-turn phone-only" onClick={()=>{setLeaf(1);if(ribbon==='rules')setRibbon('credits')}}>{spread===0?'The board':spread===1?'Shortcuts':'Credits'} ›</button>
  :<>{<button type="button" className="gb-turn gb-back phone-only" onClick={()=>{setLeaf(0);if(ribbon==='credits')setRibbon('rules')}}>‹ {spread===0?'Your turn':spread===1?'Moving':'Rules'}</button>}{nextSpread?<button type="button" className="gb-turn" onClick={()=>open(nextSpread)}>{nextSpread==='keys'?'Keys':'Rules'} ›</button>:null}</>;
 const pages:[ReactNode,ReactNode][]=[
  [<>
   <h3>Your turn</h3>
   <p className="gb-lede">Every hero moves, then does one thing. That’s a turn.</p>
   <ol className="gb-steps">
    <li><span className="gb-ink">{STEP_ICONS.move}</span><div><b>1 · Move</b><span>Choose a lit tile{moveKeys?<span className="desk-only"> or use <kbd>{moveKeys}</kbd></span>:null}. Each step spends some of your movement.</span></div></li>
    <li><span className="gb-ink">{STEP_ICONS.act}</span><div><b>2 · One action</b><span>Attack, use your power, guard, or drink a potion.</span></div></li>
    <li><span className="gb-ink">{STEP_ICONS.end}</span><div><b>3 · End turn</b><span>Then everyone else takes theirs. Companions and foes play themselves.</span></div></li>
   </ol>
   <div className="gb-goal"><span className="gb-goal-title">Each chapter</span><ol className="gb-chain">{STATIONS.map(([icon,label])=><li key={label}><i>{icon}</i>{label}</li>)}</ol><p>Take each chapter’s shard; the last gateway ends the tale.</p></div>
  </>,<>
   <h3>The board</h3>
   <p className="gb-lede">Look around before you move. Nothing here costs your turn.</p>
   <ul className="gb-list">
    <li>{BOARD_ICONS.look}<span><strong>Look around:</strong> drag the board{panKeys?<span className="desk-only"> or use <kbd>{panKeys}</kbd></span>:null}, and scroll or pinch to come closer.</span></li>
    <li>{BOARD_ICONS.way}<span><strong>See the way:</strong> point at a lit tile to see the route and what it costs.</span></li>
    <li>{BOARD_ICONS.map}<span><strong>Scene or map:</strong> <em>Map</em> beside the zoom turns the board to the tactical map from above. Same board, same keys.</span></li>
    <li>{BOARD_ICONS.foe}<span><strong>Know your foe:</strong> select one to see its card: its armour, how far it is, and what you need to hit. Select your portrait for your hero sheet.</span></li>
    <li>{BOARD_ICONS.journal}<span><strong>The journal</strong> keeps the tale so far, your questions to the Game Master and the story’s pace.</span></li>
    <li>{BOARD_ICONS.leave}<span><strong>Leave the table</strong> with the arrow at the top right (on a phone: Table settings, then <em>Save &amp; return</em>). Your game is kept.</span></li>
   </ul>
  </>],
  [<>
   <h3>Moving</h3>
   <p className="gb-lede">The keys follow the board’s grid, in the scene and on the map alike.</p>
   <dl className="gb-keys">
    <div><dt>Move your hero</dt><dd>{moveKeys?<kbd>{moveKeys}</kbd>:'No keys set'}</dd></div>
    <div><dt>Look around the board</dt><dd>{panKeys?<kbd>{panKeys}</kbd>:'No keys set'}</dd></div>
    <div><dt>Come closer</dt><dd>Scroll, or pinch</dd></div>
   </dl>
  </>,<>
   <h3>Shortcuts</h3>
   <p className="gb-lede">Every action has a key. Change any of them in Table settings.</p>
   <ShortcutReference/>
   <button type="button" className="gb-link" onClick={onCustomize}>Change the keys ›</button>
  </>],
  [<>
   <h3>The rules</h3>
   <p className="gb-lede">Choose your rules when you begin a quest.</p>
   <div className="gb-rule"><b>Streamlined</b><p>Reliable hits and forgiving recovery.</p></div>
   <div className="gb-rule"><b>Classic</b><p>Adds initiative, armor checks, critical hits and death saves.</p></div>
   <p className="gb-note">Both use custom characters and powers. Classic is a subset of D&amp;D, not the complete ruleset.</p>
  </>,<>
   <h3>Credits</h3>
   <p className="gb-attribution">This work includes material taken from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC and available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.</p>
  </>],
 ];
 const folio=(n:number)=>['i','ii','iii','iv','v','vi'][n];
 return <Modal title="Adventurer’s guide" className="game-menu guide-book" escHint="Close the book" onClose={onClose} wide>
  <div className="gb-book" data-leaf={leaf}>
   <div className="gb-ribbons" role="tablist" aria-label="Chapters of the guide" onKeyDown={event=>{const i=RIBBONS.findIndex(([key])=>key===ribbon);let next=-1;if(event.key==='ArrowRight')next=(i+1)%RIBBONS.length;else if(event.key==='ArrowLeft')next=(i+RIBBONS.length-1)%RIBBONS.length;else return;event.preventDefault();open(RIBBONS[next][0]);event.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]')[next]?.focus()}}>
    {RIBBONS.map(([key,label])=><button key={key} type="button" role="tab" aria-selected={ribbon===key} tabIndex={ribbon===key?0:-1} onClick={()=>open(key)}>{label}</button>)}
   </div>
   <span className="gb-corner c1" aria-hidden="true"/><span className="gb-corner c2" aria-hidden="true"/><span className="gb-corner c3" aria-hidden="true"/><span className="gb-corner c4" aria-hidden="true"/>
   <div className="gb-pages" role="tabpanel" aria-label={RIBBONS.find(([key])=>key===ribbon)?.[1]} key={spread}>
    <section className="gb-page left">{pages[spread][0]}<span className="gb-folio">{folio(spread*2)}</span><Turn side="left"/></section>
    <section className="gb-page right">{pages[spread][1]}<span className="gb-folio">{folio(spread*2+1)}</span><Turn side="right"/></section>
   </div>
  </div>
 </Modal>;
}
