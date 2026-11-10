'use client';
import {useTheme} from './Theme';
import {HeroArt} from './Art';
import type {NarratorProfile} from '../../game/creation';
import './narrator.css';

/** Pip's identity and palette stay the same in both art styles. */
export default function NarratorAvatar({talking=false,size=64,profile}:{talking?:boolean;size?:number;profile?:NarratorProfile}){
 const {theme}=useTheme();
 if(profile)return <span className={`pip-avatar creator-avatar${talking?' is-talking':''}`} style={{width:size,height:size}} aria-hidden="true"><HeroArt heroClass={profile.model} color={profile.color} animated/></span>;
 return <span className={`pip-avatar${talking?' is-talking':''}`} style={{width:size,height:size}} aria-hidden="true">
  {theme==='pixel'?<svg viewBox="0 0 64 64" fill="none" shapeRendering="crispEdges">
   <path fill="#dbe9e7" d="M8 8h48v48H8z"/><path fill="#345d67" d="M17 42h30v14H17z"/><path fill="#8ab6a3" d="M14 41h36v8H14z"/>
   <path fill="#293e45" d="M17 20h30v24H17z"/><path fill="#f5cf94" d="M21 22h22v20H21z"/>
   <path fill="#507da0" d="M12 19h40v8H12zM20 11h28v8H20zM28 7h16v4H28z"/><path fill="#e7b85b" d="M37 14h6v6h-6z"/>
   <g className="pip-eyes" fill="#293e45"><path d="M25 29h3v4h-3zM37 29h3v4h-3z"/></g>
   <path className="pip-mouth-closed" fill="#9f6048" d="M29 37h7v2h-7z"/><path className="pip-mouth-open" fill="#754b3e" d="M30 35h5v6h-5z"/>
   <path fill="#edb979" d="M22 34h4v2h-4zM39 34h4v2h-4z"/>
   <path fill="#f4cc70" d="M44 45h12v12H44z"/><path fill="#fff1b7" d="M48 48h4v6h-4z"/><path stroke="#345d67" strokeWidth="2" d="M47 45v-5h6v5"/>
  </svg>:<svg viewBox="0 0 64 64" fill="none">
   <path fill="#dbe9e7" d="M8 12C17 3 52 4 57 20c4 14-1 35-14 38C19 64 1 39 8 12Z"/>
   <path fill="#345d67" stroke="#293e45" strokeWidth="1.5" d="M17 54c-1-13 5-16 15-16s15 3 16 16c-7 4-23 5-31 0Z"/>
   <path fill="#f5cf94" stroke="#293e45" strokeWidth="1.5" d="M19 26c0-11 26-12 26 0v9c-1 15-26 15-26 0Z"/>
   <path fill="#507da0" stroke="#293e45" strokeWidth="1.5" strokeLinejoin="round" d="m13 25 8-11 19-7 5 14c9 0 11 5 3 7-10 3-28 2-35-3Z"/>
   <path fill="#e7b85b" d="m38 14 2 2 3-1-1 3 2 2-3 1-2 3-1-4-3-1 3-2Z"/>
   <g className="pip-eyes" fill="#293e45"><ellipse cx="26" cy="32" rx="1.6" ry="2"/><ellipse cx="38" cy="32" rx="1.6" ry="2"/></g>
   <path className="pip-mouth-closed" stroke="#9f6048" strokeWidth="1.7" strokeLinecap="round" d="M29 39q3 3 6 0"/>
   <ellipse className="pip-mouth-open" cx="32" cy="39" rx="2.5" ry="3.5" fill="#754b3e"/>
   <path fill="#8ab6a3" stroke="#293e45" strokeWidth="1.2" d="M17 43q13 7 29-1l2 7-15 4-5-4-10 1Z"/>
   <path fill="#f4cc70" stroke="#345d67" strokeWidth="1.5" d="m45 46 11 1-1 11-11-1Z"/><path stroke="#345d67" strokeWidth="1.5" d="M47 46v-3a3 3 0 0 1 6 0v4"/><path fill="#fff1b7" d="m49 49 3 1-1 5-3-1Z"/>
  </svg>}
 </span>;
}
