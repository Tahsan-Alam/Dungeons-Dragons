'use client';
import {useId} from 'react';
import type {GameState} from '../../game/types';
import {NIGHT_COLOURS,nightGlints,nightInner,nightLights,nightSpill} from './night-light';

/**
 * The board at night, drawn on the ground under every rule mark: a cool veil holed by each light, deeper toward the
 * edges, a warm or teal pool (bright core, wide spill) under each light, and moonlit glints on water. Hidden by CSS
 * outside dark colour mode, so light mode is unchanged.
 */
export function NightVeil({game}:{game:GameState}){
 const id=useId().replace(/:/g,''),lights=nightLights(game),W=game.width*50,H=game.height*50,pad=300;
 return <g className="night-veil" pointerEvents="none" aria-hidden="true">
  <defs>
   <linearGradient id={`${id}t`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0d1b2e"/><stop offset="1" stopColor="#050a14"/></linearGradient>
   <radialGradient id={`${id}v`} cx=".5" cy=".5" r=".72"><stop offset=".55" stopColor="#03060c" stopOpacity="0"/><stop offset="1" stopColor="#03060c" stopOpacity=".6"/></radialGradient>
   <radialGradient id={`${id}h`}><stop offset="0" stopColor="#000"/><stop offset=".45" stopColor="#000" stopOpacity=".85"/><stop offset="1" stopColor="#000" stopOpacity="0"/></radialGradient>
   <mask id={`${id}m`} maskUnits="userSpaceOnUse" x={-pad} y={-pad} width={W+pad*2} height={H+pad*2}>
    <rect x={-pad} y={-pad} width={W+pad*2} height={H+pad*2} fill="#fff"/>
    {lights.map((l,i)=>l.y1!==undefined
     ?<ellipse key={i} cx={l.x-10} cy={(l.y0!+l.y1)/2} rx={nightSpill(l)} ry={(l.y1-l.y0!)/2+nightSpill(l)*.8} fill={`url(#${id}h)`}/>
     :<circle key={i} cx={l.x} cy={l.y} r={nightSpill(l)} fill={`url(#${id}h)`}/>)}
   </mask>
   {lights.map((l,i)=>{const[core,spill]=NIGHT_COLOURS[l.tone],sea=l.tone==='sea';return <g key={i}>
    <radialGradient id={`${id}c${i}`}><stop offset="0" stopColor={core} stopOpacity={sea?.45:.7}/><stop offset=".5" stopColor={spill} stopOpacity={sea?.18:.3}/><stop offset="1" stopColor={spill} stopOpacity="0"/></radialGradient>
    <radialGradient id={`${id}s${i}`}><stop offset="0" stopColor={spill} stopOpacity={sea?.14:.22}/><stop offset="1" stopColor={spill} stopOpacity="0"/></radialGradient>
   </g>})}
  </defs>
  <rect x={-pad} y={-pad} width={W+pad*2} height={H+pad*2} fill={`url(#${id}t)`} opacity=".62" mask={`url(#${id}m)`}/>
  <rect width={W} height={H} fill={`url(#${id}v)`}/>
  <g className="night-pools">{lights.map((l,i)=>l.y1!==undefined
   ?<g key={i}><ellipse cx={l.x-20} cy={(l.y0!+l.y1)/2} rx={90} ry={(l.y1-l.y0!)/2+60} fill={`url(#${id}s${i})`}/><ellipse cx={l.x-6} cy={(l.y0!+l.y1)/2} rx={40} ry={(l.y1-l.y0!)/2+30} fill={`url(#${id}c${i})`}/></g>
   :<g key={i}><circle cx={l.x} cy={l.y} r={nightSpill(l)} fill={`url(#${id}s${i})`}/><circle cx={l.x} cy={l.y} r={nightInner(l)} fill={`url(#${id}c${i})`}/></g>)}</g>
  <g className="night-glints" fill="none" stroke="#a9c8e4" strokeOpacity=".55" strokeWidth="1.6" strokeLinecap="round">
   {nightGlints(game).map(g=><path key={`${g.x},${g.y}`} transform={`translate(${g.x} ${g.y})`} d={g.d}/>)}
  </g>
 </g>;
}
