'use client';
import { memo } from 'react';
import type { HeroClass } from '../../game/types';
import { useTheme } from './Theme';
import { PixelHeroArt, PixelIcon, PixelPanorama, PixelTree } from './PixelArt';
export function Icon({name,size=20,...rest}:{name:string;size?:number;className?:string}) {
 const {theme}=useTheme();
 if(theme==='pixel')return <PixelIcon name={name} size={size} {...rest}/>;
 const paths:Record<string,React.ReactNode>={
 pin:<><path d="M8 3h8m-7 0v6l-3 4v2h12v-2l-3-4V3M12 15v7"/></>,
 dice:<><path d="m12 2 9 5v10l-9 5-9-5V7Z"/><path d="m3 7 9 3 9-3M12 2v8m0 0-5 8h10Zm0 12v-4M3 17l4 1m10 0 4-1"/></>,
 arrow:<path d="M4 12h16m-6-6 6 6-6 6"/>, back:<path d="M20 12H4m6-6-6 6 6 6"/>, close:<path d="m6 6 12 12M6 18 18 6"/>,
 sword:<><path d="m5 19 12-12 3-3v5L8 21M4 14l6 6M3 21l3-3"/><path d="m13 6 5 5"/></>, shield:<path d="m12 3 8 3v7c-1 5-8 8-8 8s-7-3-8-8V6Zm0 4v10"/>, heart:<path d="M12 21S1 14 2 7c1-6 8-5 10-1 2-4 9-5 10 1 1 7-10 14-10 14Z"/>,
 move:<><path d="M12 2v20M2 12h20m-13-7 3-3 3 3m-6 14 3 3 3-3M5 9l-3 3 3 3m14-6 3 3-3 3"/></>, spark:<><path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/></>,
 potion:<><path d="M9 3h6m-5 0v6c-9 10-7 13 2 13s11-3 2-13V3M6 16h12"/></>, book:<><path d="M12 5C7 2 3 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-1-1-5-2-10 1Zm0 0v16"/></>,
 sound:<><path d="m11 4-6 5H2v6h3l6 5Zm4 4c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/></>, mute:<><path d="m11 4-6 5H2v6h3l6 5Zm5 5 6 6m0-6-6 6"/></>,
 people:<><circle cx="9" cy="7" r="4"/><path d="M2 21v-4a7 7 0 0 1 14 0v4m1-18a4 4 0 0 1 0 8m2 3c4 1 4 4 4 7"/></>, plus:<path d="M12 4v16M4 12h16"/>, minus:<path d="M4 12h16"/>, fit:<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>,
 check:<path d="m4 12 5 5L21 5"/>, flag:<><path d="M5 22V3c5-4 9 5 15 0v11c-6 5-10-4-15 0"/></>, gear:<><path d="m9 3-1 3-3 1-2 4 2 3v4l4 3 3-1 4 1 3-3v-4l2-3-2-4-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/></>, link:<><path d="m10 7 3-3c6-5 12 1 7 7l-3 3M7 10l-3 3c-5 6 1 12 7 7l3-3m-6-1 8-8"/></>, chest:<><path d="M3 9c0-9 18-9 18 0v12H3Zm0 3h18M9 10v5h6v-5"/></>, leaf:<><path d="M4 20C-1 3 11 2 22 2c0 14-7 21-16 16m-2 2L17 7"/></>, music:<><path d="M9 18V5l12-3v14M9 8l12-3"/><ellipse cx="5" cy="19" rx="4" ry="3"/><ellipse cx="17" cy="17" rx="4" ry="3"/></>, eye:<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z"/><circle cx="12" cy="12" r="3"/></>,
 };
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>{paths[name]||paths.spark}</svg>;
}
export const HeroArt=memo(function HeroArt({heroClass='knight',color='#ed9877',enemy=false,large=false}:{heroClass?:HeroClass;color?:string;enemy?:boolean;large?:boolean}){
 const {theme}=useTheme();
 if(theme==='pixel')return <PixelHeroArt heroClass={heroClass} color={color} enemy={enemy} large={large}/>;
 return <svg width="80" height="90" viewBox="0 0 80 90" aria-hidden="true" className={large?'hero-art large':'hero-art'}><g stroke="#293e35" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
 <ellipse cx="40" cy="81" rx="24" ry="6" fill="#293e35" opacity=".12" stroke="none"/>
 <path d="m28 66-4 14 11 1 5-15m3 0 5 15 11-1-7-15" fill="#485349"/>
 <path d="m27 43-10 24 12 4 24-1 13-5-12-23Z" fill={color}/>
 <path d="m31 55 5 17h13l3-17" fill={color}/>
 {enemy?<><path d="m27 25-15-8 8 21m33-13 15-8-8 21" fill="#9cbd82"/><path d="M25 22q15-15 30 0l2 18q-17 16-34 0Z" fill="#a6c48d"/><path d="m27 27 8 3m10 0 9-4M34 41l6 3 7-4" fill="none"/><circle cx="33" cy="33" r="1.5" fill="#293e35"/><circle cx="47" cy="33" r="1.5" fill="#293e35"/></>:<><path d="M26 20q14-12 28 0l1 21q-14 15-29 0Z" fill="#f2cfaa"/><path d="M25 29v-9q14-18 29 0v10l-6-11-8 6-10-4Z" fill="#6b5140"/><circle cx="33" cy="33" r="1" fill="#293e35"/><circle cx="47" cy="33" r="1" fill="#293e35"/><path d="m37 41 6 1"/></>}
 {heroClass==='knight'?<><path d="m22 55-10-4-8 5 2 16 10 7 10-11Z" fill="#d8dcca"/><path d="m9 60 10 1-4 11Z" fill={color}/><path d="m62 63 9-38 4-3 1 5-10 37Z" fill="#eef0dd"/><path d="m58 62 13 3"/></>:heroClass==='ranger'?<><path d="M21 24 37 5 58 24Z" fill={color}/><path d="M63 36q20 16-1 38l5-19Z" fill="#b89764"/><path d="m63 36 4 19-5 19" fill="none"/><path d="m61 57 17-3"/></>:heroClass==='mage'?<><path d="m17 25 40 1-19-24-8 18Z" fill={color}/><path d="m33 14 3 1"/><path d="m64 77-2-43"/><path d="m62 27 8 10-8 10-8-10Z" fill="#e8d683"/><path d="m13 45-5-5m7-2 1-7"/></>:<><path d="M24 24q1-22 15-19 19 0 17 20l-16-8Z" fill={color}/><path d="m40 53 0 12m-6-6 12 0" stroke="#f8f3db" strokeWidth="3"/><path d="M65 77V39m-8 0h16m-8-8v17" stroke="#b89550" strokeWidth="4"/></>}
 <path d="M30 70h22" strokeWidth="4"/>
 </g></svg>;
});
export const Tree=memo(function Tree({x,y,size=1,tone=0}:{x:number;y:number;size?:number;tone?:number}){const{theme}=useTheme();if(theme==='pixel')return <PixelTree x={x} y={y} size={size} tone={tone}/>;return <g transform={`translate(${x} ${y}) scale(${size})`} stroke="#536d50" strokeWidth="1.8" strokeLinejoin="round"><ellipse cx="0" cy="24" rx="23" ry="7" fill="#6f8c60" opacity=".13" stroke="none"/><path d="m-4 23 1-30h7l1 30" fill="#baab7e"/><path d="M-24 3-12-15-20-13-7-34-13-32 0-55l15 24-9-3L23-12l-10-2L27 4 9 1l3 10-24-2 2-6Z" fill={['#88a77d','#adc391','#70977c'][tone%3]}/><path d="M0-36v38m0-18-8-5M0-7l10-8" stroke="#536d50" opacity=".5"/></g>});
export function Panorama({biome='woodland'}:{biome?:string}){const{theme}=useTheme();if(theme==='pixel')return <PixelPanorama biome={biome}/>;return <svg viewBox="0 0 800 480" className="panorama" role="img" aria-label="A hand-drawn woodland with winding paths, a ruined tower and an adventuring party">
 <rect width="800" height="480" fill="#e6eddb"/><circle cx="580" cy="100" r="43" fill="#f2d88e"/>
 <path d="M0 234 87 117l68 55L265 54l116 140L472 97l108 125L706 87l94 116v277H0Z" fill="#c1d0ba" stroke="#8fa790" strokeWidth="2"/>
 <path d="M0 284q130-131 266-3T543 272q136-111 257-24v232H0Z" fill="#acc3a1"/>
 <path d="M0 371Q160 242 390 300t410 34v146H0Z" fill={biome==='coast'?'#bed9d7':'#cbd7aa'}/>
 <path d="M382 480q-71-83 73-125t-14-80" fill="none" stroke="#eddfb6" strokeWidth="49"/>
 <g stroke="#5e6d58" strokeWidth="2" fill="#d2cdb6"><path d="M499 279V152l-8-3v-25h17v14h14v-14h18v14h14v-14h17v25l-8 4v126Z"/><path d="m521 279 0-34q11-18 23 0v34" fill="#66705d"/><path d="M523 195v-20q10-14 17 0v20Z" fill="#85917b"/><path d="m502 209 18 0m19 11h21m-55 22h14"/></g>
 {[{x:74,y:329,size:2.2},{x:134,y:303,size:1.6},{x:666,y:320,size:1.8},{x:732,y:368,size:2.5},{x:43,y:450,size:2.8},{x:170,y:410,size:2},{x:604,y:397,size:2.4}].map((t,i)=><Tree key={i} {...t} tone={i}/>)}
 <g transform="translate(304 328) scale(.9)"><HeroArt heroClass="knight"/></g><g transform="translate(374 346) scale(.85)"><HeroArt heroClass="mage" color="#b4a6cf"/></g>
 <g stroke="#71836b" strokeWidth="2" fill="none"><path d="m233 347-5-10m5 10 4-8M570 435l-4-11m4 11 5-8M208 456l-5-9m5 9 7-9"/><path d="m305 109 9 4 8-4m28 17 8 4 7-4"/></g>
 <g fill="#e6ba76"><circle cx="97" cy="387" r="4"/><circle cx="603" cy="329" r="4"/><circle cx="248" cy="408" r="4"/></g>
 </svg>}
