import type {HeroClass} from '../../game/types.ts';

/* A full-body drawing for a hero the roster doesn't include: companions, players who type their own name, heroes
   from a custom tale. It is built from the same kit as the sixteen roster paintings (public/art/heroes): a 376 × 488
   viewBox from (12, 20), a dark slate outline, boots on one ground line and the face at the same point, so every
   crop and placement that fits a roster hero fits these. The look follows from the name and class alone, so a
   companion keeps their face across saves, replays and both board views. Presentation only. */

export type HeroSpec={name:string;heroClass:HeroClass;color:string};
export const O='#26342f';
/** Where the face sits in the art, as a fraction of its width and height (the roster heroes' convention). */
export const CUSTOM_FACE={x:.505,y:.28};

// --- small helpers -------------------------------------------------------------------------------------------
export function hash(text:string){let h=2166136261;for(const c of text){h^=c.codePointAt(0)!;h=Math.imul(h,16777619)}return h>>>0}
export function random(seed:number){let a=seed;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
export type Rand=()=>number;
export const pick=<T,>(r:Rand,list:readonly T[])=>list[Math.floor(r()*list.length)];
export const chance=(r:Rand,p:number)=>r()<p;
function rgb(hex:string){const v=/^#([0-9a-f]{6})$/i.exec(hex)?.[1]??'8a8f8c';return [0,2,4].map(i=>parseInt(v.slice(i,i+2),16))}
/** Blend two colours; t=0 keeps the first. */
export function mix(a:string,b:string,t:number){const x=rgb(a),y=rgb(b);return '#'+x.map((v,i)=>Math.round(v+(y[i]-v)*t).toString(16).padStart(2,'0')).join('')}
export const n=(v:number)=>Math.round(v*10)/10;
export const shape=(d:string,fill:string,w=4)=>`<path d="${d}" fill="${fill}" stroke="${O}" stroke-width="${w}"/>`;
export const stroke=(d:string,color:string,w:number,extra='')=>`<path d="${d}" stroke="${color}" stroke-width="${w}" fill="none"${extra}/>`;
export const dot=(x:number,y:number,r:number,fill:string,w=4,extra='')=>`<circle cx="${n(x)}" cy="${n(y)}" r="${r}" fill="${fill}"${w?` stroke="${O}" stroke-width="${w}"`:''}${extra}/>`;
export const limb=(pts:number[][],fill:string)=>{const d='M'+pts.map(p=>p.map(n).join(' ')).join('L');return stroke(d,O,29)+stroke(d,fill,21)};
export const at=(x:number,y:number,rot:number,body:string)=>`<g transform="translate(${n(x)} ${n(y)}) rotate(${rot})">${body}</g>`;

// --- the look --------------------------------------------------------------------------------------------------
export const SKIN=['#f3d2b5','#e8b58e','#d9a37a','#c08a60','#8d5a3b','#5f3d29'] as const;
export const HAIR=['#1f1a1c','#3a2a22','#5a3a22','#8a5a34','#b5552a','#d9b25e','#b9b4ad'] as const;
export const HAIR_STYLES=['short','swept','bob','long','bun','curly','ponytail','braids','spiky','shaved'] as const;
export type HairStyle=typeof HAIR_STYLES[number];
export type Headgear='none'|'hood'|'helm'|'hat'|'cap'|'circlet'|'leaves'|'antlers'|'bandana';
export interface HeroLook {
 skin:string;hair:string;hairStyle:HairStyle;eyes:'dot'|'calm'|'happy'|'bright';brows:'soft'|'raised'|'stern';mouth:'smile'|'flat'|'smirk'|'grin'|'open';
 beard:'none'|'full'|'moustache'|'stubble';freckles:boolean;glasses:boolean;build:number;tilt:number;headgear:Headgear;variant:number;cape:boolean;accent:string;
}
/** Which headgear each class may wear, with 'none' weighted in by repetition. */
const HEADGEAR:Record<HeroClass,Headgear[]>={
 knight:['none','none','helm'],guardian:['helm','none','helm'],rogue:['hood','hood','bandana','none'],ranger:['hood','none','none'],
 mage:['hat','hat','none'],cleric:['circlet','hood','none'],bard:['cap','cap','none'],druid:['leaves','antlers','none'],
};
export function heroLook(spec:HeroSpec):HeroLook{
 const r=random(hash(`${spec.name.trim().toLowerCase()}|${spec.heroClass}`));
 const skin=pick(r,SKIN),hairStyle=pick(r,HAIR_STYLES),old=chance(r,.12),hair=old?pick(r,['#b9b4ad','#e9e4da']):pick(r,HAIR.slice(0,6));
 const headgear=pick(r,HEADGEAR[spec.heroClass]),beardRoll=r();
 return {skin,hair,hairStyle,eyes:pick(r,['dot','calm','happy','bright'] as const),brows:pick(r,['soft','raised','stern'] as const),mouth:pick(r,['smile','flat','smirk','grin','open'] as const),
  beard:hairStyle==='bob'||hairStyle==='braids'?'none':beardRoll<.16?'full':beardRoll<.26?'moustache':beardRoll<.33?'stubble':'none',
  freckles:chance(r,.25),glasses:chance(r,spec.heroClass==='mage'||spec.heroClass==='bard'?.2:.06),build:pick(r,[.94,1,1,1.07]),tilt:pick(r,[-6,-3,0,3,5]),headgear,
  variant:Math.floor(r()*3),cape:chance(r,.5),accent:spec.color};
}

// --- the body ---------------------------------------------------------------------------------------------------
const TUNIC='M152 206c-4 60 0 124 6 180h88c6-56 10-120 6-180-18-14-82-14-100 0z';
const LONG_TUNIC='M152 206c-6 70-6 146 0 214h104c6-68 6-144 0-214-18-14-82-14-104 0z';
const ROBE='M152 206c-8 80-20 178-28 264h156c-8-86-20-184-28-264-18-14-82-14-100 0z';
interface Outfit {garment:string;body:string;sleeve:string;legs:string;boots:string;belt:string;chest:string;cape?:string;back?:string}

function outfit(c:HeroClass,look:HeroLook,r:Rand):Outfit{
 const a=look.accent,deep=mix(a,O,.45),dark=mix(a,O,.62),v=look.variant,leather='#5a3a22',boots=pick(r,['#5a3a22','#3a2a22','#6b4428']);
 const belt=(fill=leather)=>shape('M156 318h92v14h-92z',fill)+shape('M194 315h16v20h-16z','#e0b04a',3);
 const cape=look.cape?shape('M150 202C124 272 116 362 122 454h160c6-92-2-182-28-252z',deep):undefined;
 switch(c){
  case 'knight':{const steel='#aeb7bd',under=pick(r,['#5d6f82','#4a5a6a','#6a5a4a']);
   return {garment:TUNIC,body:under,sleeve:under,legs:'#3d4a58',boots,belt:belt(),cape:look.cape||v===0?shape('M150 202C124 272 116 362 122 454L138 438L150 456L166 440L180 458L196 442L210 460L226 444L240 458L256 442L270 456L282 454C288 362 280 272 254 202Z',deep):undefined,
    chest:shape('M162 214c12-10 68-10 80 0l-4 72c-14 10-58 10-72 0z',steel)+stroke('M178 232q24-8 48 0',O,2.5)+shape('M194 240h16v20h-16z',a,3)};}
  case 'guardian':{const mail='#8a8f8c';
   return {garment:LONG_TUNIC,body:mail,sleeve:'#7a8084',legs:'#3d4a58',boots,belt:belt(),cape,
    chest:stroke('M160 236h84M158 266h88M158 296h88M160 360h84M162 390h80',O,2,' opacity=".25"')+shape('M180 210h44l-2 196-20 14-20-14z',deep)+shape('M202 250l10 16-10 16-10-16z',mix(a,'#ffffff',.35),3)};}
  case 'rogue':{const cloth=pick(r,['#2f3540','#3b3f4a','#3a3330']);
   return {garment:TUNIC,body:cloth,sleeve:cloth,legs:'#2a2e36',boots:'#1f1a1c',belt:belt('#3a2a22'),cape:shape('M150 202C128 272 122 362 128 446h148c6-84 0-174-22-244z',dark),
    chest:shape('M164 210l12-6 76 108-12 8z',leather,3)+dot(220,262,4,'#c9ced2',2)+dot(238,288,4,'#c9ced2',2)+stroke('M168 214l26 30 8-34',deep,6)};}
  case 'ranger':{const green=pick(r,['#4f6b3a','#5d6b3e','#556b4a']),brown=pick(r,['#6b5034','#5a4a32']);
   return {garment:TUNIC,body:green,sleeve:v===1?brown:green,legs:'#4a4a32',boots,belt:belt(),cape:look.cape||look.headgear==='hood'?shape('M150 202c-26 70-34 160-28 252h160c6-92-2-182-28-252z',look.headgear==='hood'?green:deep):undefined,
    back:at(0,0,0,shape('M236 124l30 6-14 140-30-6z','#6b4428')+stroke('M244 124l-3-16M253 126l1-17M261 127l5-15',O,3.2)+shape('M236 110l5-10 7 9-6 5zM248 108l6-10 6 10-7 4zM260 112l9-8 3 11-8 3z',mix(a,'#8a5a34',.4),3)),
    chest:shape('M168 210l-6 8 70 96 8-6z',leather,3)+stroke('M178 212q24 14 48 0',a,5)};}
  case 'mage':{const robe=mix(mix(a,pick(r,['#3d5a9a','#4b3a6b','#2f5f66','#6a2e3a']),.55),O,.15),trim=mix(a,'#f6c453',.35);
   return {garment:ROBE,body:robe,sleeve:robe,legs:'#2f3f6a',boots:'#3a2a22',belt:belt(trim),
    chest:stroke('M130 466h152',trim,5)+stroke('M176 210l26 30 26-30',trim,5)+[[170,370],[236,400],[190,430],[226,344],[160,420]].map(([x,y])=>`<path d="M${x} ${y-7}l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="${trim}" opacity=".85"/>`).join('')};}
  case 'cleric':{const robe=pick(r,['#ece4d0','#e3dccb','#d8d2c4']);
   return {garment:ROBE,body:robe,sleeve:robe,legs:'#5d5a52',boots,belt:belt('#c9a64a'),cape,
    chest:shape('M182 212h40l-4 250h-32z',mix(a,O,.28))+stroke('M186 236h32',O,2,' opacity=".3"')+dot(202,262,13,'#f6c453',3)+stroke('M202 244v-6M202 280v6M184 262h-6M220 262h6',O,3)};}
  case 'bard':{const doublet=mix(a,O,.42),hose=pick(r,['#4b3a6b','#3d4a58','#6a2e3a']);
   return {garment:TUNIC,body:doublet,sleeve:pick(r,[hose,'#f1e5cf']),legs:hose,boots,belt:belt(),cape:look.cape?shape('M150 202C126 272 120 362 126 454h152c6-92-2-182-26-252z',hose):undefined,
    chest:stroke('M160 212l86 106',mix(a,'#ffffff',.4),9)+stroke('M190 210v100M214 210v100',O,2,' opacity=".25"')+dot(202,224,4,'#e0b04a',2)+dot(202,248,4,'#e0b04a',2)+dot(202,272,4,'#e0b04a',2)};}
  case 'druid':{const robe=pick(r,['#5d6b3e','#6b5a3a','#4f6b4a']),leaf=pick(r,['#6f9a4a','#8aa84e','#5f8a5a']);
   return {garment:ROBE,body:robe,sleeve:robe,legs:'#4a4a32',boots:'#6b4428',belt:belt('#6b4428'),
    chest:shape('M150 206c16-16 88-16 104 0l-4 44-12-10-12 14-12-12-12 14-12-12-12 14-12-12-12 12z',leaf)+stroke('M168 226l6 6M190 230l6 6M212 230l6 6M234 226l6 6',O,2,' opacity=".35"')+dot(202,214,6,a,3)};}
 }
}

// --- what the hands hold ----------------------------------------------------------------------------------------
type Hold={arm:number[][];hand:number[];item:string;front?:string;over?:string};
const sword=(x:number,y:number,rot:number)=>at(x,y,rot,shape('M-6 -18V-150l6-14 6 14V-18z','#dfe6ea',3)+stroke('M0 -24V-150','#b9c2c7',1.6)+shape('M-22 -24h44v10h-44z','#8a6a3a',3)+shape('M-5 -14h10v28h-10z','#5a3a22',3)+dot(0,18,6,'#8a6a3a',3));
const dagger=(x:number,y:number,rot:number)=>at(x,y,rot,shape('M-5 -16V-70l5-12 5 12V-16z','#dfe6ea',3)+shape('M-14 -18h28v8h-28z','#5a4a3a',3)+shape('M-4 -10h8v18h-8z','#3a2a22',3));
export const shaft=(x:number,y:number,top:number,bottom:number,wood:string,w=6)=>at(x,y,0,stroke(`M0 ${top}V${bottom}`,O,w+8)+stroke(`M0 ${top}V${bottom}`,wood,w));
const mace=(x:number,y:number)=>shaft(x,y,-60,60,'#6b4428',5)+at(x,y,0,shape('M-14 -96h28l6 18-6 18h-28l-6-18z','#c9ced2')+stroke('M0 -96v36',O,2.5));
const hammer=(x:number,y:number)=>shaft(x,y,-80,70,'#6b4428',5)+at(x,y,0,shape('M-30 -112h52v34h-52z','#9aa4ab')+shape('M22 -104h12v18h-12z','#7a8288',3));
export const book=(x:number,y:number,rot:number,cover:string)=>at(x,y,rot,shape('M-24 -18h48v36h-48z',cover)+shape('M-19 -13h38v26h-38z','#f1e5cf',2.4)+stroke('M0 -13v26M-14 -6h9M-14 0h9M5 -6h9M5 0h9',O,1.6,' opacity=".6"'));
const bird=(x:number,y:number,body:string)=>at(x,y,0,shape('M-14 -6l-16 10 4-14z',body,3)+`<ellipse cx="0" cy="-14" rx="16" ry="11" transform="rotate(-18 0 -14)" fill="${body}" stroke="${O}" stroke-width="3.4"/>`+dot(12,-28,9,body,3.4)+shape('M20 -30l10 3-10 3z','#e0b04a',2.4)+dot(14,-30,1.8,'#f7f4ec',0)+stroke('M-8 -16q8 6 16 0',O,2,' opacity=".5"')+stroke('M-4 -2v6M4 -2v6',O,2.4));
const notes=(x:number,y:number)=>stroke(`M${x} ${y}v-28l18-6v28`,O,3)+`<g fill="${O}"><ellipse cx="${x-5}" cy="${y}" rx="6" ry="4.6"/><ellipse cx="${x+13}" cy="${y-6}" rx="6" ry="4.6"/><ellipse cx="${x+25}" cy="${y-30}" rx="5.4" ry="4.2"/></g>`+stroke(`M${x+30} ${y-30}v-22`,O,3);
const flame=(x:number,y:number)=>`<path d="M${x} ${y+16}c-16-4-20-20-10-34 2 8 6 10 8 4 0-12 6-20 16-26-4 12 6 18 6 30 0 14-8 24-20 26z" fill="#f6a03a" stroke="${O}" stroke-width="3.4"/><path d="M${x+1} ${y+12}c-6-4-6-12 0-18 2 6 8 6 8 12 0 4-4 6-8 6z" fill="#f6e34a"/>`;
const glow=(x:number,y:number)=>dot(x,y,26,'#fff6b0',0,' opacity=".45"')+dot(x,y,12,'#fff2a8',3);
const RAISED={arm:[[242,224],[276,230],[296,182]],hand:[296,182]};
const LOW_R={arm:[[244,224],[258,282],[260,330]],hand:[260,332]};
const STAFF_L={arm:[[158,224],[130,286],[112,316]],hand:[112,316]};
const HIP_L={arm:[[162,222],[140,268],[172,300]],hand:[172,302]};

/** The left and right hands (as drawn) for each class, in one of up to three poses. */
function holds(c:HeroClass,look:HeroLook,r:Rand):[Hold,Hold]{
 const a=look.accent,deep=mix(a,O,.45),v=look.variant;
 switch(c){
  case 'knight':{
   const round:Hold={arm:[[162,222],[150,276],[150,300]],hand:[150,304],item:'',front:`<ellipse cx="146" cy="306" rx="44" ry="58" fill="#8a6a44" stroke="${O}" stroke-width="4"/><ellipse cx="146" cy="306" rx="36" ry="50" fill="none" stroke="#9aa4ab" stroke-width="5"/>`+stroke('M130 260v92M162 260v92','#6b5034',2)+shape('M146 262l10 44-10 44-10-44z',deep,3)+dot(146,306,9,'#9aa4ab',3)};
   const heater:Hold={arm:[[162,222],[150,276],[150,300]],hand:[150,304],item:'',front:shape('M104 252h84v48c0 42-22 66-42 80-20-14-42-38-42-80z',deep)+stroke('M146 262v108M112 300h68',mix(a,'#ffffff',.35),8)+stroke('M110 258h72',O,2,' opacity=".3"')};
   const down:Hold={arm:[[246,222],[262,282],[266,328]],hand:[266,328],item:sword(266,328,180)};
   return v===0?[round,down]:v===1?[heater,{...RAISED,item:sword(296,182,8)}]:[heater,down];}
  case 'guardian':{
   const kite:Hold={arm:[[162,222],[140,276],[132,300]],hand:[132,304],item:'',front:shape('M84 212h92v126c0 64-26 102-46 120-20-18-46-56-46-120z','#58708a')+shape('M96 226h68v110c0 52-18 84-34 98-16-14-34-46-34-98z',mix(a,O,.3),3)+shape('M130 250l14 30-14 30-14-30z',mix(a,'#ffffff',.4),3)};
   const tower:Hold={arm:[[162,222],[140,276],[132,300]],hand:[132,304],item:'',front:shape('M80 230c0-24 16-34 50-34s50 10 50 34v214c-10 10-30 14-50 14s-40-4-50-14z','#5e7488')+stroke('M92 246v190M168 246v190',O,2,' opacity=".25"')+shape('M98 300h64v20h-64z',mix(a,O,.3),3)+dot(130,250,6,'#c9ced2',3)+dot(130,408,6,'#c9ced2',3)};
   const grip={arm:[[246,222],[266,276],[270,318]],hand:[270,320]};
   const spear:Hold={...grip,item:shaft(270,320,-190,150,'#7a5634',5)+at(270,320,0,shape('M0 -232l12 28-12 18-12-18z','#c9ced2',3.4)+stroke('M-8 -186h16',a,5))};
   return v===0?[kite,spear]:v===1?[tower,{...grip,item:hammer(270,320)}]:[kite,{...grip,item:mace(270,320)}];}
  case 'rogue':{
   if(v===1)return [{...HIP_L,item:''},{arm:[[242,224],[284,242],[300,206]],hand:[300,206],item:dagger(300,206,24)}];
   if(v===2)return [{...HIP_L,item:''},{...LOW_R,item:'',over:at(262,350,0,shape('M-10 -8c-14 4-18 24-6 32 14 6 28-4 26-20-2-10-10-14-20-12z','#7a5a34',3)+stroke('M-6 -8l4-10',O,2.4)+dot(2,-20,4,'#e0b04a',2))}];
   return [{arm:[[162,222],[140,276],[128,312]],hand:[128,314],item:dagger(128,314,200)},{arm:[[242,222],[264,276],[276,312]],hand:[276,314],item:dagger(276,314,160)}];}
  case 'ranger':{
   const bow:Hold={arm:[[164,224],[138,276],[106,300]],hand:[106,300],item:at(106,300,0,stroke('M10 -150Q-74 0 10 150',O,15)+stroke('M10 -150Q-74 0 10 150','#7a4a2a',7)+stroke('M10 -150V150','#e9e4da',2.2)+shape('M-33 -26h10v12h-10zM-33 14h10v12h-10z','#3a2a22',2.5))};
   return v===1?[bow,{arm:[[242,224],[286,226],[308,188]],hand:[308,188],item:'',over:bird(312,178,'#8a6a44')}]:[bow,{...LOW_R,item:''}];}
  case 'mage':{
   const kind=pick(r,['crystal','orb','moon'] as const),glowColor=kind==='orb'?mix(a,'#ffffff',.3):'#bfe3ff';
   const top=kind==='crystal'?dot(0,-140,24,glowColor,0,' opacity=".35"')+shape('M0 -164l14 26-14 26-14-26z',glowColor)
    :kind==='orb'?dot(0,-138,26,glowColor,0,' opacity=".35"')+dot(0,-138,14,glowColor)+dot(-4,-142,4,'#ffffff',0)
    :shape('M8 -168a22 22 0 1 0 0 40 16 16 0 1 1 0-40z','#f2e6b0');
   const spell=pick(r,['flame','spark','frost'] as const);
   const cast=spell==='flame'?flame(304,140):spell==='spark'?dot(326,122,36,'#fff6b0',0,' opacity=".35"')+`<path d="M298 164l22-30h-12l26-34h-12l32-38-14 42h12l-24 32h12z" fill="#f6e34a" stroke="${O}" stroke-width="3.4"/>`
    :dot(304,148,26,'#bfe3ff',0,' opacity=".4"')+stroke('M304 126v44M285 137l38 22M285 159l38-22','#e6f4ff',5)+stroke('M304 126v44M285 137l38 22M285 159l38-22',O,1.5,' opacity=".5"');
   const staff:Hold={...STAFF_L,item:shaft(112,316,-116,150,'#7a5634')+at(112,316,0,top)};
   return v===2?[{...HIP_L,item:'',front:book(170,300,-12,mix(a,O,.4))},{...RAISED,item:'',over:cast}]:[staff,{...RAISED,item:'',over:cast}];}
  case 'cleric':{
   const sun=shaft(112,316,-116,150,'#7a5634')+at(112,316,0,dot(0,-138,28,'#fff6b0',0,' opacity=".35"')+stroke('M0 -164v-8M0 -112v8M-26 -138h-8M26 -138h8M-18 -156l-6-6M18 -156l6-6M-18 -120l-6 6M18 -120l6 6',O,4)+dot(0,-138,16,'#f6c453'));
   const bless:Hold={arm:[[242,224],[284,258],[304,236]],hand:[304,236],item:'',over:glow(310,212)};
   return v===0?[{...STAFF_L,item:sun},bless]:v===1?[{arm:[[162,224],[148,280],[186,290]],hand:[186,292],item:'',front:book(196,286,-8,'#7a2e2e')},bless]:[{...STAFF_L,item:mace(112,316)},bless];}
  case 'bard':
   return v===1?[{...HIP_L,item:''},{...RAISED,item:'',over:notes(304,150)}]:[{arm:[[162,224],[134,268],[154,244]],hand:[156,244],item:''},{arm:[[244,224],[256,278],[232,298]],hand:[232,298],item:''}];
  case 'druid':{
   const staff:Hold={...STAFF_L,item:shaft(112,316,-100,150,'#6b4428')+at(112,316,0,stroke('M0 -100c-14-16 4-30-8-46M0 -104c12-12 22-10 26-26',O,12)+stroke('M0 -100c-14-16 4-30-8-46M0 -104c12-12 22-10 26-26','#6b4428',5)+shape('M-8 -146c-14-6-20-18-14-26 12 2 18 14 14 26zM26 -130c4-14 16-20 24-14-2 12-14 18-24 14zM6 -120c10-10 22-10 26-2-8 8-20 8-26 2z','#7aa84e',3))};
   const sprig:Hold={arm:[[242,224],[280,266],[300,244]],hand:[300,244],item:'',over:dot(304,220,22,'#d8f0a0',0,' opacity=".45"')+shape('M304 230c-14-8-16-24-6-32 10 6 14 20 6 32zM304 230c6-14 20-18 28-10-6 10-18 14-28 10z','#8ac05a',3)};
   return v===1?[staff,{...LOW_R,item:'',over:bird(252,212,'#2f3540')}]:[staff,sprig];}
 }
}
const lute=(a:string,slung=false)=>at(slung?236:214,slung?250:290,slung?30:-38,stroke('M0 -40V-150',O,16)+stroke('M0 -40V-150','#8a5a34',8)+shape('M-9 -150h18l4-24h-26z','#6b4428',3)+`<ellipse cx="0" cy="0" rx="36" ry="46" fill="#c98a3e" stroke="${O}" stroke-width="4"/>`+dot(0,-4,10,'#3a2a22',3)+stroke('M-3 -150V30M3 -150V30','#f1e5cf',1.4)+shape('M-14 26h28v8h-28z',mix(a,O,.3),3));

// --- the head ---------------------------------------------------------------------------------------------------
export function hairBack(look:HeroLook):string{
 const h=look.hair;
 switch(look.hairStyle){
  case 'long':return shape('M158 140c-2-60 90-60 88 0l6 100c-14 10-28 8-36-2l-2-64h-28l-2 64c-8 10-22 12-36 2z',h);
  case 'bob':return shape('M154 150c-6-64 100-68 94 0l2 34c-10 8-20 6-24-2h-50c-4 8-14 10-24 2z',h);
  case 'ponytail':return shape('M238 122c30 10 40 58 24 100-6-24-18-42-30-50z',h);
  case 'braids':return '';
  default:return '';
 }
}
export function hairFront(look:HeroLook):string{
 const h=look.hair;
 switch(look.hairStyle){
  case 'short':case 'long':case 'ponytail':return shape('M162 142c-4-48 84-52 80 0-8-16-22-24-40-24s-32 8-40 24z',h);
  case 'swept':return shape('M160 146c-8-56 84-64 84-4-6-12-16-20-28-22-14 12-36 18-56 26z',h);
  case 'bob':return shape('M158 150c-8-60 94-64 86 0-6-14-12-20-18-22-10 8-30 10-48 6-8 4-14 10-20 16z',h);
  case 'bun':return dot(202,100,16,h)+shape('M162 142c-4-48 84-52 80 0-8-16-22-24-40-24s-32 8-40 24z',h);
  case 'braids':{let s='';for(const side of [-1,1])for(let i=0;i<5;i++)s+=`<ellipse cx="${202+side*(38+i*.6)}" cy="${170+i*15}" rx="9" ry="9" fill="${h}" stroke="${O}" stroke-width="3.4"/>`;
   return s+dot(164,246,5,look.accent,2.5)+dot(240,246,5,look.accent,2.5)+shape('M162 142c-4-48 84-52 80 0-8-16-22-24-40-24s-32 8-40 24z',h);}
  case 'curly':{const pts=[-170,-150,-128,-106,-84,-62,-40,-18].map(d=>[202+40*Math.cos(d*Math.PI/180),140+34*Math.sin(d*Math.PI/180)]);
   return pts.map(([x,y])=>dot(x,y,15,h,4)).join('')+pts.map(([x,y])=>dot(x,y,12.6,h,0)).join('')+`<path d="M170 132q32-30 64 0z" fill="${h}"/>`;}
  case 'spiky':return shape('M162 142l-10-24 20 6 4-28 18 20 10-28 12 26 16-22 6 26 20-6-12 30c-10-14-26-22-42-22s-32 8-42 22z',h);
  case 'shaved':return `<path d="M164 136c4-40 72-42 76 0-10-12-24-18-38-18s-28 6-38 18z" fill="${h}" opacity=".45"/>`;
 }
}
export function face(look:HeroLook):string{
 const s:string[]=[];
 s.push(dot(177,162,7,'#e58f7a',0,' opacity=".45"'),dot(227,162,7,'#e58f7a',0,' opacity=".45"'));
 if(look.freckles)s.push(`<g fill="${mix(look.skin,'#5a3a22',.55)}" opacity=".7">`+[[184,160],[190,163],[196,160],[208,160],[214,163],[220,160]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.6"/>`).join('')+'</g>');
 switch(look.eyes){
  case 'dot':s.push(dot(186,150,5,O,0),dot(187.6,148.4,1.6,'#fff',0),dot(218,150,5,O,0),dot(219.6,148.4,1.6,'#fff',0));break;
  case 'bright':s.push(dot(186,150,5.6,O,0),dot(188,147.6,2,'#fff',0),dot(218,150,5.6,O,0),dot(220,147.6,2,'#fff',0),stroke('M180 145l-3-3M224 145l3-3',O,2.4));break;
  case 'calm':s.push(dot(186,151,3.5,O,0),stroke('M178 146h16',O,3.4),dot(218,151,3.5,O,0),stroke('M210 146h16',O,3.4));break;
  case 'happy':s.push(stroke('M180 152q6-7 12 0M212 152q6-7 12 0',O,3.4));break;
 }
 s.push(stroke(look.brows==='raised'?'M179 135q8-6 15-3M210 132q8-4 15 1':look.brows==='stern'?'M179 136l15 4M225 136l-15 4':'M179 138q8-5 15-2M210 136q8-3 15 2',look.hair==='#e9e4da'?'#8a8f8c':O,3.4));
 s.push(stroke('M202 152q5 6-1 9',O,3));
 if(look.beard==='full')s.push(shape('M164 152c0 40 18 58 38 58s38-18 38-58c-6 12-16 18-24 18-6-6-22-6-28 0-8 0-18-6-24-18z',look.hair));
 if(look.beard==='stubble')s.push(`<g fill="${O}" opacity=".3">`+[[182,172],[190,178],[198,180],[206,180],[214,178],[222,172],[186,176],[218,176]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.4"/>`).join('')+'</g>');
 const mouth={smile:stroke('M192 166q10 8 20 0',O,3.4),flat:stroke('M194 169h16',O,3.4),smirk:stroke('M193 168q10 5 19-4',O,3.4),
  grin:shape('M190 165q12 14 24 0z','#f7f4ec',3),open:shape('M195 164q7 12 14 0z','#7a2e2e',3)}[look.beard==='full'?'flat':look.mouth];
 s.push(mouth);
 if(look.beard==='moustache')s.push(shape('M188 164q14-10 28 0-8 6-14 2-6 4-14-2z',look.hair,3));
 if(look.glasses)s.push(dot(186,150,10,'none',3),dot(218,150,10,'none',3),stroke('M196 149q6-4 12 0',O,3));
 return s.join('');
}
function headgear(look:HeroLook,c:HeroClass):{back:string;front:string;hidesHair:boolean}{
 const a=look.accent,deep=mix(a,O,.45);
 switch(look.headgear){
  case 'hood':{const cloth=c==='cleric'?'#ece4d0':c==='ranger'?'#4f6b3a':mix(a,O,.62);
   return {back:shape('M154 176c-10-60 16-96 48-98 32 2 58 38 48 98z',cloth),front:shape('M160 164c-6-46 14-74 42-78 28 4 48 32 42 78-8-26-24-40-42-40s-34 14-42 40z',cloth),hidesHair:true};}
  case 'helm':return {back:'',front:shape('M160 136c0-50 84-50 84 0z','#aeb7bd')+shape('M156 128h92v12h-92z','#8a949a',3.4)+stroke('M202 92v36',O,2.5,' opacity=".35"')+(look.variant!==1?shape('M202 90c4-22 22-34 40-32-12 8-22 20-28 34z',a,3.4):''),hidesHair:true};
  case 'hat':{const hat=mix(a,'#3d3a6b',.55);
   return {back:'',front:`<ellipse cx="202" cy="114" rx="62" ry="12" fill="${hat}" stroke="${O}" stroke-width="4"/>`+shape('M168 114C176 84 192 56 230 32c-4 14-10 22-12 32 6 16 12 32 18 50z',hat)+shape('M171 100q31 6 61 0l2 12q-32 6-64 0z',mix(a,'#f6c453',.4),3.4)+`<path d="M222 70l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#f6e3a0"/>`,hidesHair:false};}
  case 'cap':return {back:'',front:shape('M158 124c-2-30 84-38 92-6 4 10-6 16-18 14-18-4-44-6-62 0-8 2-12-2-12-8z',mix(a,O,.35))+shape('M232 110c14-34 40-52 56-54-6 18-24 42-52 60z',mix(a,'#ffffff',.35),3.4)+stroke('M240 106c14-16 28-28 40-40',O,2,' opacity=".4"'),hidesHair:false};
  case 'circlet':return {back:'',front:stroke('M164 128q38-16 76 0',O,9)+stroke('M164 128q38-16 76 0','#e0b04a',5)+dot(202,121,6,mix(a,'#ffffff',.2),3),hidesHair:false};
  case 'leaves':{const leaves=[-160,-135,-110,-90,-70,-45,-20].map((d,i)=>{const x=202+42*Math.cos(d*Math.PI/180),y=142+36*Math.sin(d*Math.PI/180);return at(x,y,d+90,shape('M0 0c-10-8-10-22 0-30 10 8 10 22 0 30z',i%2?'#7aa84e':'#5f8a3a',3))}).join('');
   return {back:'',front:leaves,hidesHair:false};}
  case 'antlers':{const tine='M176 112c-10-20-6-40-16-56M168 84c-10-2-16-8-20-16M172 70c6-8 6-16 4-24M228 112c10-20 6-40 16-56M236 84c10-2 16-8 20-16M232 70c-6-8-6-16-4-24';
   return {back:stroke(tine,O,11)+stroke(tine,'#c9a878',5),front:'',hidesHair:false};}
  case 'bandana':return {back:'',front:shape('M160 134c0-40 84-40 84 0-12-4-28-6-42-6s-30 2-42 6z',deep)+shape('M242 124c14 2 22 10 26 20-10 0-18-4-24-10z',deep,3.4),hidesHair:true};
  default:return {back:'',front:'',hidesHair:false};
 }
}

// --- assembly ---------------------------------------------------------------------------------------------------
export function customHeroSvg(spec:HeroSpec):string{
 const look=heroLook(spec),c=spec.heroClass,r=random(hash(`${spec.name.trim().toLowerCase()}|${c}|gear`));
 const fit=outfit(c,look,r),[left,right]=holds(c,look,r),gear=headgear(look,c);
 const sx=look.build,body=(s:string)=>`<g transform="translate(202 206) scale(${sx} 1) translate(-202 -206)">${s}</g>`;
 const shoulder=(pts:number[][],side:number)=>pts.map((p,i)=>i===0?[202+side*(Math.abs(p[0]-202))*sx,p[1]]:p);
 const parts:string[]=[];
 parts.push(`<ellipse cx="202" cy="490" rx="130" ry="11" fill="${O}" opacity=".16"/>`);
 if(fit.cape)parts.push(body(fit.cape));
 if(fit.back)parts.push(fit.back);
 if(c==='bard'&&look.variant===1)parts.push(lute(look.accent,true));
 parts.push(`<g transform="translate(202 146) rotate(${look.tilt}) translate(-202 -146)">${gear.back}${gear.hidesHair?'':hairBack(look)}</g>`);
 // Legs and boots stand on the shared ground line (y 488).
 parts.push(shape('M171 349L169 461.4L191 462.6L201 350.8Z',fit.legs),shape('M207 350.8L217 462.6L239 461.4L237 349.2Z',fit.legs));
 parts.push(shape('M192 454h-24v16h-8q-16 0 -16 12v6H192z',fit.boots)+stroke('M190 482h-44',O,2,' opacity=".35"'),shape('M216 454h24v16h8q16 0 16 12v6H216z',fit.boots)+stroke('M218 482h44',O,2,' opacity=".35"'));
 parts.push(body(shape(fit.garment,fit.body)+fit.chest+fit.belt));
 parts.push(stroke('M202 202L202 182',O,28),stroke('M202 202L202 182',look.skin,20));
 if(c==='bard'&&look.variant!==1)parts.push(lute(look.accent));
 parts.push(limb(shoulder(left.arm,-1),fit.sleeve),limb(shoulder(right.arm,1),fit.sleeve));
 if(c==='knight'||c==='guardian')parts.push(`<ellipse cx="${n(202-42*sx)}" cy="222" rx="22" ry="16" fill="#aeb7bd" stroke="${O}" stroke-width="4"/><ellipse cx="${n(202+42*sx)}" cy="222" rx="22" ry="16" fill="#aeb7bd" stroke="${O}" stroke-width="4"/>`);
 parts.push(left.item,right.item);
 parts.push(dot(left.hand[0],left.hand[1],12,look.skin),dot(right.hand[0],right.hand[1],12,look.skin));
 if(c==='bard'&&look.variant!==1)parts.push(stroke('M226 292l12 10',O,2.4));
 if(left.front)parts.push(left.front);
 if(right.over)parts.push(right.over);
 parts.push(`<g transform="translate(202 146) rotate(${look.tilt}) translate(-202 -146)">`+dot(202,146,40,look.skin)+face(look)+(gear.hidesHair?'':hairFront(look))+gear.front+'</g>');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="12 20 376 488" width="376" height="488" fill="none" stroke-linecap="round" stroke-linejoin="round">${parts.join('')}</svg>`;
}
const cache=new Map<string,string>();
/** The drawing as an image URL, ready for <img> and SVG <image>. */
export function customHeroArt(spec:HeroSpec):string{
 const key=`${spec.name.trim().toLowerCase()}|${spec.heroClass}|${spec.color}`;
 let url=cache.get(key);
 if(!url){url=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(customHeroSvg(spec))}`;if(cache.size>200)cache.clear();cache.set(key,url)}
 return url;
}
