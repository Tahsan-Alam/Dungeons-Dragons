'use client';
import {useMemo,useRef,useState} from 'react';
import Board,{type BoardControls} from './Board';
import {HeroArt,Icon} from './Art';
import {createPreviewFrames} from '../../game/preview';
import './landing.css';

type Props={onNew:(mode:'solo'|'online')=>void;onJoin:()=>void;onResume?:()=>void;resumeTitle?:string;disabled:boolean};
const steps=['The board','Move','Attack'];
const explanations=[
  'Explore the map with your party. Drag to pan, or zoom in for a closer look.',
  'Move into position. Each character has a movement allowance and one action per turn.',
  'Take your action, then pass the turn. Companions and enemies take their turns automatically.',
];

export default function Landing({onNew,onJoin,onResume,resumeTitle,disabled}:Props){
  const frames=useMemo(createPreviewFrames,[]),[step,setStep]=useState(0),[selected,setSelected]=useState('');
  const board=useRef<BoardControls>(null),game=frames[step],actor=game.actors[0],inspected=game.actors.find(a=>a.id===selected);
  function selectStep(next:number){setStep(next);setSelected('')}
  return <main className="landing-main">
    <section className="landing-hero" aria-labelledby="landing-title">
      <div className="landing-copy">
        <h1 id="landing-title">A tabletop adventure<br/><span> in your browser.</span></h1>
        <p>Choose a hero, explore the map, and take on a three-chapter adventure. Play solo with companions or bring your friends.</p>
        <div className="landing-actions"><button className="button primary" disabled={disabled} onClick={()=>onNew('solo')}>Solo quest<Icon name="arrow" size={19}/></button><button className="button paper" disabled={disabled} onClick={()=>onNew('online')}><Icon name="people" size={19}/>Gather party</button></div>
        <button className="landing-join text-button" disabled={disabled} onClick={onJoin}>Join party<Icon name="arrow" size={16}/></button>
        <div className="landing-facts"><span>1–10 players</span><span>Turn-based</span><span>No download</span></div>
        {onResume&&resumeTitle?<button className="landing-resume" disabled={disabled} onClick={onResume}><span><small>Continue quest</small><strong>{resumeTitle}</strong></span><Icon name="arrow" size={19}/></button>:null}
      </div>
      <section className="landing-preview" aria-label="Game preview">
        <div className="preview-heading"><h2>Game preview</h2><span>The Lanternwood</span></div>
        <div className="preview-board"><Board game={game} actor={actor} tool="move" myTurn={false} selectedId={selected||actor.id} focusId={actor.id} onTile={()=>{}} onActor={a=>setSelected(a.id)} controlsRef={board}/></div>
        <div className="preview-bottom">
          <div className="preview-tabs" role="tablist" aria-label="Preview steps">{steps.map((label,index)=><button key={label} role="tab" aria-selected={step===index} tabIndex={step===index?0:-1} onKeyDown={e=>{const next=e.key==='ArrowRight'?(index+1)%3:e.key==='ArrowLeft'?(index+2)%3:e.key==='Home'?0:e.key==='End'?2:null;if(next!==null){e.preventDefault();selectStep(next);(e.currentTarget.parentElement?.children[next] as HTMLButtonElement)?.focus()}}} aria-controls="preview-description" id={`preview-step-${index}`} onClick={()=>selectStep(index)}><span>{index+1}</span>{label}</button>)}</div>
          <div className="preview-explanation" role="tabpanel" id="preview-description" aria-labelledby={`preview-step-${step}`}><p aria-live="polite">{inspected?`${inspected.name} · ${inspected.hp}/${inspected.maxHp} HP · Armor ${inspected.ac}`:step===2?game.events.at(-1)?.text:explanations[step]}</p><button className="icon-button" aria-label={step===2?'Restart preview':'Next preview step'} title={step===2?'Restart preview':'Next preview step'} onClick={()=>{selectStep((step+1)%3);if(step===2)board.current?.fit()}}><Icon name={step===2?'back':'arrow'} size={20}/></button></div>
        </div>
      </section>
    </section>
    <section className="landing-overview" aria-label="About the game"><div className="landing-party" aria-hidden="true"><HeroArt heroClass="knight" color="#ef997c"/><HeroArt heroClass="ranger" color="#8ac4ae"/><HeroArt heroClass="mage" color="#b19bd3"/><HeroArt heroClass="cleric" color="#a3bbf0"/></div><div><h2>Choose your class</h2><p>Choose a knight, ranger, mage, or cleric. Start with streamlined rules, or try the Classic rules subset.</p></div><div className="landing-save-note"><Icon name="book" size={22}/><p>Find saved quests and replays in <strong>Adventures.</strong></p></div></section>
  </main>;
}
