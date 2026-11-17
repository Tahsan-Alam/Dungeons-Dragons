'use client';
import {useId} from 'react';
import type {Actor,Cell,GameState} from '../../game/types';

/* A Keeper's announced attack, painted on the ground in board units (50 per tile), inside the ground overlay so
   the 2.5D scene projects it like the terrain. Presentation only: the tiles come from the stored plan. */
const T=50,mid=(c:Cell)=>`${c.x*T+T/2},${c.y*T+T/2}`;

export function KeeperMarks({game}:{game:GameState}){
 const hatch=useId().replace(/:/g,'');
 const keepers=game.actors.filter((a):a is Actor&{plan:NonNullable<Actor['plan']>}=>!!a.keeper&&!!a.plan&&!a.defeated&&a.hp>0);
 if(!keepers.length)return null;
 return <g className="keeper-marks" aria-hidden="true">
  <defs><pattern id={hatch} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3.5" height="9" fill="#e0603f" fillOpacity=".5"/></pattern></defs>
  {keepers.map(k=>{const plan=k.plan,target=game.actors.find(a=>a.id===plan.targetId);return <g key={k.id} className={`keeper-plan ${plan.move}`}>
   {plan.tiles.map((t,i)=><g key={i} transform={`translate(${t.x*T} ${t.y*T})`}>
    <rect x="2" y="2" width="46" height="46" rx="6" fill="#e0603f" fillOpacity=".14"/>
    <rect x="2" y="2" width="46" height="46" rx="6" fill={`url(#${hatch})`}/>
    <rect className="keeper-edge" x="2" y="2" width="46" height="46" rx="6" fill="none" stroke="#f3946a" strokeWidth="2" strokeDasharray="7 5"/>
   </g>)}
   {plan.move==='hunt'&&plan.landing?<>
    <polyline points={[k,...(plan.route??[])].map(mid).join(' ')} fill="none" stroke="#2a1410" strokeOpacity=".55" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline className="keeper-route" points={[k,...(plan.route??[])].map(mid).join(' ')} fill="none" stroke="#ffd2b8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="10 7"/>
    <circle cx={plan.landing.x*T+T/2} cy={plan.landing.y*T+T/2} r="12" fill="#2a1410" fillOpacity=".45" stroke="#ffd2b8" strokeWidth="3.5"/>
    {target?<circle className="keeper-quarry" cx={target.x*T+T/2} cy={target.y*T+T/2} r="20" fill="none" stroke="#f3946a" strokeWidth="3"/>:null}
   </>:null}
   {plan.move==='tide'?(plan.arcs??[]).map((arc,i)=>{const c=arc[0];return c?<g key={i} transform={`translate(${c.x*T+T/2} ${c.y*T+T/2})`}>
    <circle r="12" fill="#1a1210" fillOpacity=".85" stroke="#f3946a" strokeWidth="2"/>
    <text y="5" textAnchor="middle" fontFamily="Cinzel, 'EB Garamond', Georgia, serif" fontWeight="700" fontSize="15" fill="#ffd2b8">{i+1}</text>
   </g>:null}):null}
   {plan.move==='tide'&&plan.route?.length?<polyline points={[k,...plan.route].map(mid).join(' ')} fill="none" stroke="#ffd2b8" strokeWidth="4" strokeDasharray="10 7" strokeLinecap="round"/>:null}
  </g>})}
 </g>;
}
