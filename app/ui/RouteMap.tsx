'use client';
import {useLayoutEffect,useRef,useState,type CSSProperties} from 'react';
import {ROADS,CROSSING,FORD,MAP_SIZE,type RoadId} from './route-map-data';
import {ALL_ROADS,ROUTES,fitView,pathOf,waymarksOf,type RouteView} from './route-map';
import {TALES,type TaleId} from '../../game/presets';

const NUMERALS=['I','II','III'];
const AMBER='#e8a840',INK='#0b0f14',PALE='#d6cfc2',CREAM='#F1E5CF',PAPER='#151a1f';
const REGIONS:{tale:TaleId;x:number;y:number;text:string;color:string}[]=[
 {tale:'lantern',x:186,y:610,text:'LANTERNWOOD',color:'#86a278'},
 {tale:'crown',x:920,y:46,text:'THE HOLLOW REACH',color:'#b4b0a8'},
 {tale:'salt',x:1036,y:738,text:'SALTREACH HARBOUR',color:'#86b8c6'},
];
const ROAD_LABEL:Record<TaleId,{x:number;y:number;anchor:'start'|'middle'|'end'}>={lantern:{x:404,y:404,anchor:'middle'},crown:{x:598,y:384,anchor:'end'},salt:{x:928,y:494,anchor:'start'}};

function Waymark({x,y,lit,className}:{x:number;y:number;lit:boolean;className?:string}){
 return <path className={className} d={`M${x} ${y-6} l6 6 l-6 6 l-6 -6Z`} fill={lit?AMBER:PAPER} stroke={lit?'#2a2218':PALE} strokeWidth={1.8}/>;
}
function Road({road,lit,dim=false}:{road:RoadId;lit:boolean;dim?:boolean}){
 const d=pathOf(ROADS[road]);
 return <g opacity={dim?.45:1}>{lit?<><path d={d} stroke={INK} strokeWidth={9}/><path d={d} stroke={AMBER} strokeWidth={5}/></>:<><path d={d} stroke={INK} strokeWidth={6}/><path d={d} stroke={PALE} strokeWidth={2.6}/></>}</g>;
}

/** The approved Lantern Marches map, zoomed to one tale and drawn from its run's real progress. */
export default function RouteMap({view,places,animate,motion=true,onSettled}:{view:RouteView;places:readonly string[];animate:boolean;motion?:boolean;onSettled?:()=>void}){
 const box=useRef<HTMLDivElement>(null),[aspect,setAspect]=useState(16/9);
 useLayoutEffect(()=>{const el=box.current;if(!el)return;const measure=()=>{const r=el.getBoundingClientRect();if(r.width&&r.height)setAspect(r.width/r.height)};measure();const o=new ResizeObserver(measure);o.observe(el);return()=>o.disconnect()},[]);
 const route=ROUTES[view.tale],v=fitView(route.focus,aspect),mine=new Set<RoadId>([...route.legs,...route.home]);
 const others=(Object.keys(ROUTES) as TaleId[]).filter(t=>t!==view.tale);
 const fresh=new Set(animate?view.fresh:[]),lit=new Set(view.lit);
 const label=(x:number,y:number,text:string,size:number,anchor:'start'|'middle'|'end',color=CREAM,className='route-place')=><text x={x} y={y} textAnchor={anchor} fontSize={size} fill={color} className={className}>{text}</text>;
 return <div ref={box} className="route-map" onAnimationEnd={e=>{if((e.target as Element).classList.contains('route-draw-last'))onSettled?.()}}>
  <svg viewBox={`${v.x} ${v.y} ${v.w} ${v.h}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
   <rect x={-600} y={-400} width={MAP_SIZE.width+1200} height={MAP_SIZE.height+800} fill="#10151a"/>
   <image href="/art/world/lantern-marches.svg" x={0} y={0} width={MAP_SIZE.width} height={MAP_SIZE.height}/>
   <g fill="none" strokeLinecap="round">
    {ALL_ROADS.filter(r=>!mine.has(r)).map(r=><Road key={r} road={r} lit={false} dim/>)}
    {[...mine].map(r=><Road key={r} road={r} lit={lit.has(r)&&!fresh.has(r)}/>)}
    {[...fresh].map((r,i,all)=>{const d=pathOf(ROADS[r]);const order={'--route-delay':`${i*0.35}s`} as CSSProperties;
     return <g key={'f'+r} style={order}><path d={d} stroke={INK} strokeWidth={9} pathLength={1} className="route-draw"/><path d={d} stroke={AMBER} strokeWidth={5} pathLength={1} className={`route-draw${i===all.length-1?' route-draw-last':''}`}/></g>;})}
   </g>
   {ALL_ROADS.map(r=>waymarksOf(r).map(([x,y],i)=><g key={r+i} opacity={mine.has(r)?1:.45}><Waymark x={x} y={y} lit={lit.has(r)&&!fresh.has(r)}/>{fresh.has(r)?<Waymark x={x} y={y} lit className="route-way"/>:null}</g>))}
   {others.flatMap(t=>ROUTES[t].stops.map(([x,y],i)=><circle key={t+i} cx={x} cy={y} r={6} fill="#6b7685" stroke={INK} strokeWidth={2}/>))}
   {route.stops.map(([x,y],i)=>{const l=route.labels[i];return <g key={i}>
    <circle cx={x} cy={y} r={11} fill={CREAM} stroke={INK} strokeWidth={2.5}/>
    <text x={x} y={y+4} textAnchor="middle" fontSize={10} fill="#1a1510" className="route-numeral">{NUMERALS[i]}</text>
    {label(x+l.dx,y+l.dy,places[i]??'',13,l.anchor)}
    {i<view.recovered?<path d={`M${x+9} ${y-17} l5 6 l-5 6 l-5 -6Z`} fill={AMBER} stroke="#2a2218" strokeWidth={1.5}/>:null}
   </g>;})}
   {view.here!==null?<circle cx={route.stops[view.here][0]} cy={route.stops[view.here][1]} r={20} fill="none" stroke="#9CC9EA" strokeWidth={2.5} className={motion?"route-here":undefined}/>:null}
   {label(CROSSING[0]-14,CROSSING[1]+30,'Threeway Crossing',15,'end')}
   {label(CROSSING[0]-14,CROSSING[1]+45,'the broken Waylantern',10.5,'end','#c9c3b8','route-note')}
   {label(FORD[0]+14,FORD[1]-2,'Hollow Ford',11.5,'start','#c9c3b8')}
   {label(790,618,'Salt Marsh',12,'middle','#8fb0a0')}
   {label(ROAD_LABEL[view.tale].x,ROAD_LABEL[view.tale].y,route.road.toUpperCase(),11,ROAD_LABEL[view.tale].anchor,AMBER,'route-road')}
   {label(ROAD_LABEL[view.tale].x,ROAD_LABEL[view.tale].y+14,TALES.find(t=>t.id===view.tale)?.title??'',11,ROAD_LABEL[view.tale].anchor,'#c9c3b8')}
   {REGIONS.map(r=><text key={r.tale} x={r.x} y={r.y} textAnchor="middle" fontSize={r.tale==='salt'?17:20} fill={r.color} className="route-region" opacity={r.tale===view.tale?1:.6}>{r.text}</text>)}
  </svg>
 </div>;
}
