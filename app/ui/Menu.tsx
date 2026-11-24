'use client';
import type {ReactNode} from 'react';
import type {GameOptions,HeroClass,RoomView,Session} from '../../game/types';
import {Icon} from './Art';
import './realm-kit.css';
import './setup-flow.css';
import QuestSetup from './QuestSetup';
import JoinParty from './JoinParty';
import PartyCamp from './PartyCamp';

export function Brand({onClick}:{onClick?:()=>void}) {
 const contents=<><span className="brand-die"><Icon name="dice" size={29}/></span><span>Painted<span className="brand-realms">Realms</span></span></>;
 return onClick?<button className="brand" onClick={onClick} aria-label="Painted Realms camp">{contents}</button>:<div className="brand" aria-label="Painted Realms">{contents}</div>;
}

/** The Adventures screen's frame: full screen, no app header, like Camp. */
export function Menu({children}:{children?:ReactNode}) {
 return <div className="menu-screen realm game-menu journal-page">{children}</div>;
}

type SetupProps={mode:'solo'|'online'|'join';onBack:()=>void;onStart:(name:string,cls:HeroClass,options:GameOptions,code:string,heroId?:string)=>unknown;busy:boolean;initialCode?:string;onNavigationBlockChange?:(blocked:boolean)=>void;onAISettings?:()=>void;quick?:boolean};
export function Setup({quick,...props}:SetupProps){
 return props.mode==='join'?<JoinParty onBack={props.onBack} onStart={props.onStart} busy={props.busy} initialCode={props.initialCode}/>:<QuestSetup mode={props.mode} onBack={props.onBack} onStart={props.onStart} busy={props.busy} quick={quick} onAISettings={props.onAISettings}/>;
}
export function Lobby(props:{room:RoomView;session:Session;busy:boolean;command:(c:unknown)=>unknown;onMenu:()=>void}) {
 return <PartyCamp {...props}/>;
}
