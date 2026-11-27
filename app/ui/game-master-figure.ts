import {AETHER,type NarratorProfile} from '../../game/creation.ts';
import {GAME_MASTERS,type FaceCentre} from '../../game/presets.ts';
import {HAIR,HAIR_STYLES,O,SKIN,at,chance,dot,face,hairBack,hairFront,hash,limb,mix,n,pick,random,shape,stroke,type HeroLook} from './hero-figure.ts';

/* A full-body drawing for a Game Master the game doesn't ship: your own Game Master and ones made with the AI.
   It uses the three built-in Game Masters' kit (public/art/game-masters): a 400 × 520 viewBox, the dark slate
   outline, feet on the same ground line and the face at the same point, so every scene, card and crop that fits
   the Wanderer fits these. The shape (person, spirit, cat, owl, fox or dragon), what they wear and their colour come
   from the narrator profile; how they tell it picks what they carry; the name settles the rest, so a Game Master
   keeps one look across setup, play, saves and replays. Presentation only. */

type Form=NonNullable<NarratorProfile['avatar']>['form'];
type Accessory=NonNullable<NarratorProfile['avatar']>['accessory'];
export interface GameMasterSpec {name:string;form:Form;accessory:Accessory;color:string;voice?:NarratorProfile['voice']}
/** Where the face sits in the art (the built-in Game Masters' convention). */
export const DRAWN_GM_FACE:FaceCentre={x:.505,y:.27};

type Prop='lantern'|'book'|'hourglass';
/** How they tell it decides what they carry: hope holds up a lantern, a smile tells it from the book, a cost keeps the hourglass. */
const PROP_FOR_VOICE:Partial<Record<NonNullable<NarratorProfile['voice']>,Prop>>={cedar:'lantern',willow:'book',stone:'hourglass'};
type Mood='warm'|'wry'|'grave';
const MOOD:Record<Prop,Mood>={lantern:'warm',book:'wry',hourglass:'grave'};

type Garment='coat'|'robe'|'cloak';type Neck='mantle'|'scarf'|'stole';type Hat='brim'|'cap'|'tall'|'none';
interface Look {form:Form;prop:Prop;mood:Mood;garment:Garment;neck:Neck;variant:number;accent:string;coat:string;mantle:string;inner:string;trim:string;fur:string;belly:string;eye:string;satchel:boolean;hat:Hat;lean:number;human?:HeroLook;crown:boolean;glasses:boolean}

const FUR:Record<Exclude<Form,'human'|'spirit'>,readonly (readonly [string,string])[]>={
 cat:[['#d98a4a','#f3dcc0'],['#3a3438','#8a8288'],['#e9dcc4','#fbf4e6'],['#9a7a5a','#e6d4bc'],['#b8b2a8','#ece8e0']],
 fox:[['#d9772f','#f7efe2'],['#c2582a','#f4e6d4'],['#b9b4ad','#f7f4ec'],['#e0a050','#fbf1de']],
 owl:[['#8a6a4a','#e6d4b4'],['#b9a88a','#f1e8d4'],['#e9e4da','#ffffff'],['#6b5a4a','#d9c4a0']],
 dragon:[['#5f8a5a','#e9d9a8'],['#4f7a8a','#e2e6c8'],['#9a4f46','#efd2a4'],['#b08a3a','#f3e2b0'],['#6b5a8a','#e6d6ee']],
};

export function gameMasterLook(spec:GameMasterSpec):Look{
 const r=random(hash(`${spec.name.trim().toLowerCase()}|${spec.form}|gm`));
 const prop=PROP_FOR_VOICE[spec.voice!]??pick(r,['lantern','book','hourglass'] as const),mood=MOOD[prop];
 const a=spec.color,[fur,belly]=spec.form==='human'||spec.form==='spirit'?['','']:pick(r,FUR[spec.form]);
 const look:Look={form:spec.form,prop,mood,garment:spec.form==='spirit'?'robe':mood==='grave'?'cloak':pick(r,['coat','robe'] as const),neck:pick(r,['mantle','scarf','stole'] as const),variant:Math.floor(r()*2),accent:a,coat:mix(a,O,spec.form==='spirit'?.5:.3),mantle:mix(a,O,.12),inner:pick(r,['#ece4d0','#d9c9a8','#c9cfd6']),
  trim:'#e0b04a',fur,belly,eye:pick(r,['#e0b04a','#8fc06a','#7fb2d9','#d9773a']),satchel:false,hat:spec.accessory==='crown'?'none':pick(r,{warm:['brim','brim','brim','none'],wry:['cap','cap','none'],grave:['tall','tall','none']}[mood] as Hat[]),lean:mood==='wry'?-3:0,crown:spec.accessory==='crown',glasses:spec.accessory==='glasses'};
 if(spec.form==='human'){
  // Storytellers run older than adventurers: grey hair and beards come more often.
  const old=chance(r,.45),style=pick(r,HAIR_STYLES.filter(s=>s!=='spiky')),beardRoll=r();
  look.human={skin:pick(r,SKIN),hair:old?pick(r,['#b9b4ad','#e9e4da']):pick(r,HAIR.slice(0,6)),hairStyle:style,eyes:mood==='grave'?'calm':pick(r,['dot','happy','bright'] as const),
   brows:mood==='grave'?'stern':mood==='wry'?'raised':'soft',mouth:mood==='grave'?'flat':mood==='wry'?'smirk':pick(r,['smile','grin'] as const),
   beard:style==='bob'||style==='braids'?'none':beardRoll<.3?'full':beardRoll<.45?'moustache':'none',freckles:chance(r,.2),glasses:look.glasses,build:1,tilt:pick(r,[-4,0,3]),headgear:'none',variant:0,cape:false,accent:a};
 }
 return look;
}

// --- what they carry -------------------------------------------------------------------------------------------
// Props are drawn about their own origin and scaled up to Game Master size (the Survivor's goblet, the Wanderer's lantern).
const big=(x:number,y:number,rot:number,s:number,body:string)=>`<g transform="translate(${n(x)} ${n(y)}) rotate(${rot}) scale(${s})">${body}</g>`;
/** A hand lantern hanging from its ring at the origin. */
const LANTERN=dot(0,38,34,'#f6c453',0,' opacity=".32"')+stroke('M0 0v12',O,3.4)+dot(0,-2,5,'none',3)
 +shape('M-13 12h26l-3-7h-20z','#6b4428',3.4)+`<rect x="-14" y="12" width="28" height="36" rx="6" fill="#f6c453" stroke="${O}" stroke-width="3.6"/>`
 +stroke('M-7 13v34M7 13v34',O,1.8,' opacity=".4"')+shape('M-12 48h24l-3 6h-18z','#6b4428',3)
 +`<path d="M-4 36c0-7 4-7 4-13 4 5 5 8 5 13a4.5 4.5 0 0 1-9 0z" fill="#fff3c4" stroke="#d98a1c" stroke-width="2"/>`;
const OPEN_BOOK=(cover:string)=>shape('M-40 -22c14-6 28-6 40 2 12-8 26-8 40-2v40c-14-6-28-6-40 2-12-8-26-8-40-2z',cover)
 +shape('M-35 -18c12-4 24-4 35 3 11-7 23-7 35-3v32c-12-4-24-4-35 3-11-7-23-7-35-3z','#f6eedb',2.6)
 +stroke('M0 -15v32',O,2.4)+stroke('M-28 -8q10-3 22 0M-28 0q10-3 22 0M-28 8q10-3 18 0M6 -8q10-3 22 0M6 0q10-3 22 0M6 8q8-3 16 0',O,1.6,' opacity=".5"')
 +shape('M14 18l4 20 5-6 6 5-4-19z',mix(cover,'#e0b04a',.5),2.4);
const CLOSED_BOOK=(cover:string)=>shape('M-26 -34h52v68h-52z',cover)+shape('M-26 -34h8v68h-8z',mix(cover,O,.3),3)+shape('M-14 -26h32v18h-32z','#f1e5cf',2.4)
 +stroke('M-10 -20h24M-10 -14h18',O,1.6,' opacity=".5"')+shape('M26 -30h4v60h-4z','#f6eedb',2);
const QUILL=shape('M0 0c-6-24-4-52 10-74 8 26 2 52-10 74z','#f1e5cf',3)+stroke('M0 0q4-36 10-74',O,1.6,' opacity=".6"')+stroke('M0 0l-3 12',O,3.4);
const HOURGLASS=shape('M-20 -38h40v9h-40zM-20 29h40v9h-40z','#6b4428',3.4)
 +shape('M-14 -29c0 18 11 20 11 29s-11 11-11 29h28c0-18-11-20-11-29s11-11 11-29z','#dde8ee',3.4)
 +`<path d="M-9 -22h18c-2 9-7 13-9 15-2-2-7-7-9-15zM-10 27c2-9 6-12 10-13 4 1 8 4 10 13z" fill="#e0b04a"/>`+stroke('M0 -7v20','#e0b04a',1.8)
 +stroke('M-17 -29v58M17 -29v58',O,3.4);
/** A caged candle on a tall staff, the pale flame of a tale that costs something. */
const candleStaff=(x:number,top:number,bottom:number)=>stroke(`M${x} ${top}V${bottom}`,O,15)+stroke(`M${x} ${top}V${bottom}`,'#5a4a3e',8)
 +dot(x,top-28,34,'#cfe3ff',0,' opacity=".25"')+shape(`M${x-18} ${top}h36l-5-9h-26z`,'#3a3438',3.4)
 +stroke(`M${x-14} ${top-5}v-42M${x+14} ${top-5}v-42M${x} ${top-5}v-44`,O,3.4)+shape(`M${x-18} ${top-46}h36l-7-12h-22z`,'#3a3438',3.4)
 +`<rect x="${x-6}" y="${top-26}" width="12" height="19" fill="#f1e5cf" stroke="${O}" stroke-width="2.6"/><path d="M${x} ${top-40}c-6 5-6 9 0 13 6-4 6-8 0-13z" fill="#cfe3ff" stroke="#7f9fc4" stroke-width="1.8"/>`;
const CANDLE=dot(0,-40,30,'#cfe3ff',0,' opacity=".28"')+shape('M-26 6h52l-6 10h-40z','#7d858c',3.4)+shape('M-10 6v-38h20v38z','#f1e5cf',3)
 +`<path d="M0 -52c-7 6-7 11 0 16 7-5 7-10 0-16z" fill="#cfe3ff" stroke="#7f9fc4" stroke-width="2"/>`+stroke('M-4 -26v10',O,1.6,' opacity=".4"');
const walkingStick=(x:number,top:number)=>stroke(`M${x} ${top}V486`,O,15)+stroke(`M${x} ${top}V486`,'#8a5a34',8)+stroke(`M${x} ${top+6}q0-24 -16-28`,O,15)+stroke(`M${x} ${top+6}q0-24 -16-28`,'#8a5a34',8);
const sparkles=(x:number,y:number)=>[[0,0,7],[-20,-18,5],[16,-26,4]].map(([dx,dy,s])=>`<path d="M${x+dx} ${y+dy-s}l${s*.3} ${s*.7} ${s*.7} ${s*.3}-${s*.7} ${s*.3}-${s*.3} ${s*.7}-${s*.3}-${s*.7}-${s*.7}-${s*.3} ${s*.7}-${s*.3}z" fill="#f6e3a0" stroke="${O}" stroke-width="1.6"/>`).join('');

/** Arms run from the shoulder to the hand; `behind` sits behind the body, `items` between body and arms, `front` over the hands. */
interface Pose {left:number[][];right:number[][];behind:string;items:string;front:string}
function pose(look:Look):Pose{
 const cover=mix(look.accent,O,.5);
 switch(look.prop){
  case 'lantern':return look.variant===0
   ?{left:[[160,226],[128,192],[116,140]],right:[[244,226],[266,280],[276,330]],behind:walkingStick(276,248),items:'',front:big(116,132,0,1.35,LANTERN)}
   :{left:[[160,226],[146,290],[136,340]],right:[[244,226],[278,232],[296,196]],behind:'',items:'',front:big(136,332,0,1.35,LANTERN)+sparkles(300,168)};
  case 'book':return look.variant===0
   ?{left:[[160,226],[146,284],[178,312]],right:[[244,226],[276,262],[266,200]],behind:'',items:big(200,298,-6,1.3,OPEN_BOOK(cover)),front:big(262,196,18,1.2,QUILL)}
   :{left:[[160,226],[144,280],[164,318]],right:[[244,226],[276,262],[262,206]],behind:'',items:big(158,302,-10,1.25,CLOSED_BOOK(cover)),front:big(266,150,18,1.45,D20)+stroke('M258 196q-6-22 2-36M276 194q8-18 2-32',O,2,' opacity=".45"')};
  case 'hourglass':return look.variant===0
   ?{left:[[160,226],[146,286],[176,322]],right:[[244,226],[268,272],[278,318]],behind:candleStaff(278,112,486),items:big(178,288,0,1.3,HOURGLASS),front:''}
   :{left:[[160,226],[156,284],[186,304]],right:[[244,226],[248,284],[218,304]],behind:'',items:'',front:big(202,300,0,1.3,CANDLE)};
 }
}

// --- the body ------------------------------------------------------------------------------------------------
const COAT='M150 208c-12 80-26 170-32 252h168c-6-82-20-172-32-252-20-16-84-16-104 0z';
/** Hopeful Game Masters get round shapes: the hem swings out in a bell. */
const BELL='M150 208c-18 76-40 154-52 236q104 40 208 0c-12-82-34-160-52-236-20-16-84-16-104 0z';
/** Grave ones get a tall cloak to the ground, its hem worn into points. */
const WORN=(()=>{let d='M146 214c-30 80-46 168-50 262';for(let i=0;i<14;i++)d+=`l15.2 ${i%2?10:-10}`;return d+'c-4-94-20-182-50-262z';})();
const ROBE='M150 208c-14 84-30 180-36 262h176c-6-82-22-178-36-262-20-16-84-16-104 0z';
function coat(look:Look):string{
 const s:string[]=[],c=look.coat;
 if(look.form==='spirit'){
  // No feet: the robe thins into wisps above the ground.
  s.push(shape('M150 208c-14 70-26 150-30 214 10 20 24 26 32 18 6 24 20 34 30 22 8 20 24 22 32 4 10 16 26 12 32-10 10 10 24 2 28-16-4-82-18-160-30-232-20-16-84-16-104 0z',c));
  s.push(stroke('M146 380q6 30 2 52M204 396q4 30 0 56M258 384q-2 26-6 46',mix(look.accent,'#ffffff',.3),2.4,' opacity=".55"'));
  for(const [x,y,r] of [[168,300,2.4],[232,272,2],[196,350,2.6],[246,360,2],[156,420,2],[216,430,2.4],[184,256,1.8],[262,316,2]])s.push(dot(x,y,r,'#fff6d8',0,' opacity=".85"'));
  return s.join('');
 }
 if(look.garment==='cloak')s.push(shape(WORN,mix(c,O,.35)));
 if(look.garment==='robe'){
  s.push(shape(look.mood==='warm'?BELL:ROBE,c),shape('M116 448q86 16 172 0l2 22H114z',look.trim,3.4),stroke('M152 300q50 20 100 0',O,2,' opacity=".3"'));
  s.push(shape('M150 286l104 30-4 16-104-30z',mix(look.accent,'#ffffff',.2),3.4));
 }else{
  s.push(shape(look.mood==='warm'?BELL:COAT,c),shape(look.mood==='warm'?'M190 214l-12 252q24 4 48 0l-12-252z':'M190 214l-10 246h44l-10-246z',look.inner,3.4));
  s.push(stroke('M184 220l-12 238M220 220l12 238',look.trim,3,' opacity=".85"'));
  s.push(shape('M142 296h120l2 16h-124z','#5a3a22',3.4)+shape('M194 292h16v24h-16z','#e0b04a',3));
  if(look.garment==='cloak')s.push(dot(160,218,8,'#e0b04a',3),dot(244,218,8,'#e0b04a',3));
 }
 return s.join('');
}
/** The Game Master's dice: a pouch on the belt with a d20 showing (a floating one for a spirit). */
const D20=shape('M0 -16l14 8v16l-14 8-14-8v-16z','#f1e5cf',3)+shape('M0 -9l8 13h-16z','#e0b04a',2.2)+stroke('M0 -16v7M14 -8l-6 12M-14 -8l6 12M0 16l-8-12M0 16l8-12',O,1.6,' opacity=".55"');
function dice(look:Look):string{
 if(look.form==='spirit')return big(144,354,-12,1.1,dot(0,0,24,'#fff6d8',0,' opacity=".35"')+D20);
 return shape('M150 316h34l-4 34q-13 8-26 0z','#6b4428')+stroke('M150 322h34',O,2.4,' opacity=".5"')+big(167,312,-10,.95,D20);
}
function feet(look:Look):string{
 if(look.form==='spirit')return '';
 if(look.form==='owl'){const talon=(x:number)=>stroke(`M${x} 468l-12 18M${x} 468v20M${x} 468l12 18`,O,10)+stroke(`M${x} 468l-12 18M${x} 468v20M${x} 468l12 18`,'#e0a040',5);return talon(178)+talon(226);}
 if(look.form==='cat'||look.form==='fox'||look.form==='dragon'){
  const paw=(x:number)=>shape(`M${x-18} 488c-2-18 6-30 18-30s20 12 18 30z`,look.fur)+stroke(`M${x-6} 488v-8M${x+6} 488v-8`,O,2.4,' opacity=".5"')+(look.form==='dragon'?stroke(`M${x-14} 488l-5 3M${x+14} 488l5 3`,O,3):'');
  return paw(178)+paw(226);
 }
 return shape('M196 456h-28v14h-8q-18 0 -18 12v6H196z','#4a3626')+shape('M208 456h28v14h8q18 0 18 12v6H208z','#4a3626');
}
function neckwear(look:Look):string{
 const light=mix(look.accent,'#ffffff',.25);
 if(look.form==='spirit'||look.neck==='mantle')return shape('M144 216c4 32 26 50 58 50s54-18 58-50c-18-18-98-18-116 0z',look.mantle)+stroke('M146 222c6 26 26 42 56 42s50-16 56-42',look.trim,3,' opacity=".9"');
 if(look.neck==='scarf')return shape('M172 206c8 14 52 14 60 0l6 14c-14 18-58 18-72 0z',light,3.4)+shape('M218 218l14 52-14 4-12-50z',light,3.4)+stroke('M222 262l-2 14M228 260l2 14',O,2.4);
 return shape('M174 208l-10 150 18 4 12-150z',light,3.4)+shape('M230 208l10 150-18 4-12-150z',light,3.4)+stroke('M166 344l16 4M222 348l16-4',look.trim,3);
}
/** Wry Game Masters wear a short cape off one shoulder: an off-balance shape for a sideways smile. */
const sideCape=(look:Look)=>look.mood==='wry'&&look.form!=='spirit'?shape('M148 212c-22 56-30 116-26 170l46-20c-8-50-4-104 16-148z',mix(look.accent,O,.5))+stroke('M150 222c-16 48-22 98-20 144',look.trim,2.6,' opacity=".8"'):'';
const satchel=(look:Look)=>look.satchel&&look.form!=='spirit'&&look.prop!=='book'?stroke('M156 214L250 340',O,10)+stroke('M156 214L250 340','#6b4428',5)+shape('M230 334h40l-2 36h-36z','#8a5a34')+shape('M230 334h40l-6 15h-28z','#6b4428',3)+dot(250,346,3,'#e0b04a',2):'';

// --- the head ----------------------------------------------------------------------------------------------------
interface Head {back:string;front:string;eyes:[number,number][];top:number;skin:string}
function eyesFor(x:number,y:number,mood:Mood,iris:string,slit=false):string{
 const pupil=(cx:number)=>slit?`<ellipse cx="${cx}" cy="${y+1}" rx="2.6" ry="7" fill="${O}"/>`:dot(cx,y+1,5,O,0)+dot(cx+1.6,y-.6,1.6,'#fff',0);
 const lid=(cx:number)=>mood==='grave'?shape(`M${cx-11} ${y-1}q11-9 22 0v-8h-22z`,'none',0)+stroke(`M${cx-11} ${y-1}q11-5 22 0`,O,3.4):'';
 return [x-22,x+22].map(cx=>`<ellipse cx="${cx}" cy="${y}" rx="10" ry="9" fill="${iris}" stroke="${O}" stroke-width="3.4"/>`+pupil(cx)+lid(cx)).join('');
}
const mouthFor=(x:number,y:number,mood:Mood)=>mood==='warm'?stroke(`M${x-9} ${y}q9 8 18 0`,O,3.2):mood==='wry'?stroke(`M${x-9} ${y+1}q10 5 18-5`,O,3.2):stroke(`M${x-8} ${y+2}h16`,O,3.2);
const browsFor=(x:number,y:number,mood:Mood,color=O)=>stroke(mood==='grave'?`M${x-32} ${y-4}l16 5M${x+32} ${y-4}l-16 5`:mood==='wry'?`M${x-32} ${y}q8-6 16-3M${x+16} ${y-6}q8-4 16 1`:`M${x-32} ${y+2}q8-5 16-2M${x+16} ${y}q8-3 16 2`,color,3.4);

function head(look:Look):Head{
 const a=look.accent,m=look.mood;
 switch(look.form){
  case 'human':{const h=look.human!;
   return {back:hairBack(h),front:dot(202,146,40,h.skin)+face(h)+hairFront(h),eyes:[[186,150],[218,150]],top:104,skin:h.skin};}
  case 'cat':{const f=look.fur,b=look.belly,stripes=f==='#d98a4a'||f==='#9a7a5a';
   return {back:'',front:shape('M158 132l-6-50 40 28zM246 132l6-50-40 28z',f)+shape('M162 120l-2-26 18 16zM242 120l2-26-18 16z','#e8a3a3',0)
    +`<ellipse cx="202" cy="150" rx="52" ry="44" fill="${f}" stroke="${O}" stroke-width="4"/>`
    +(stripes?stroke('M190 108l4 14M202 106v16M214 108l-4 14M152 150h12M240 150h12',mix(f,O,.45),4):'')
    +`<ellipse cx="202" cy="172" rx="28" ry="18" fill="${b}"/>`+eyesFor(202,146,m,look.eye,true)
    +shape('M196 164h12l-6 7z','#b97a72',3)+stroke('M202 171v5',O,3)+mouthFor(202,180,m)
    +stroke('M150 166l-22 0M150 174l-20 8M254 166l22 0M254 174l20 8',O,2.4)+browsFor(202,134,m,mix(f,O,.6)),
    eyes:[[180,146],[224,146]],top:112,skin:f};}
  case 'fox':{const f=look.fur,b=look.belly;
   return {back:'',front:shape('M160 122l-10-58 44 34zM244 122l10-58-44 34z',f)+shape('M156 88l-6-24 18 12zM248 88l6-24-18 12z',O,0)
    +shape('M152 140c0-34 22-52 50-52s50 18 50 52c0 16-10 28-24 36l-26 20-26-20c-14-8-24-20-24-36z',f)
    +`<path d="M156 150c12 2 26 6 32 18l14 26 14-26c6-12 20-16 32-18-4 16-16 28-30 34l-16 14-16-14c-14-6-26-18-30-34z" fill="${b}"/>`
    +stroke('M156 150c12 2 26 6 32 18l14 26 14-26c6-12 20-16 32-18',O,2.4,' opacity=".35"')
    +eyesFor(202,142,m,look.eye)+`<ellipse cx="202" cy="190" rx="8" ry="6" fill="${O}"/>`+browsFor(202,128,m,mix(f,O,.6)),
    eyes:[[180,142],[224,142]],top:100,skin:f};}
  case 'owl':{const f=look.fur,b=look.belly;
   return {back:'',front:shape('M160 116l-12-34 30 20zM244 116l12-34-30 20z',f)
    +`<ellipse cx="202" cy="148" rx="56" ry="50" fill="${f}" stroke="${O}" stroke-width="4"/>`
    +`<circle cx="180" cy="146" r="23" fill="${b}"/><circle cx="224" cy="146" r="23" fill="${b}"/>`
    +stroke('M164 120q38-20 76 0',mix(f,O,.5),4)
    +[180,224].map(cx=>`<circle cx="${cx}" cy="146" r="13" fill="${look.eye==='#8fc06a'?'#e0b04a':look.eye}" stroke="${O}" stroke-width="3.4"/>`+dot(cx,147,6,O,0)+dot(cx+2,144,2,'#fff',0)
     +(m==='grave'?`<path d="M${cx-14} 142q14-10 28 0v-12h-28z" fill="${f}"/>`+stroke(`M${cx-14} 142q14-8 28 0`,O,3.4):m==='wry'&&cx===224?`<path d="M${cx-14} 144q14-6 28 0v-14h-28z" fill="${f}"/>`+stroke(`M${cx-14} 144q14-5 28 0`,O,3.4):'')).join('')
    +shape('M196 162h12l-6 14z','#e0a040',3)+stroke('M168 182q6 6 12 0M190 188q6 6 12 0M212 188q6 6 12 0M226 182q6 6 12 0',mix(f,O,.45),2.6),
    eyes:[[180,146],[224,146]],top:100,skin:f};}
  case 'dragon':{const f=look.fur,b=look.belly,horn=mix(b,O,.15);
   return {back:stroke('M172 112c-8-24-22-36-40-38M232 112c8-24 22-36 40-38',O,15)+stroke('M172 112c-8-24-22-36-40-38M232 112c8-24 22-36 40-38',horn,8),
    front:shape('M184 98l8-18 10 16 10-16 8 18z',mix(f,O,.25),3.4)
    +`<ellipse cx="202" cy="142" rx="50" ry="42" fill="${f}" stroke="${O}" stroke-width="4"/>`
    +`<ellipse cx="202" cy="174" rx="32" ry="22" fill="${f}" stroke="${O}" stroke-width="4"/>`+`<ellipse cx="202" cy="180" rx="22" ry="12" fill="${b}"/>`
    +dot(192,166,2.6,O,0)+dot(212,166,2.6,O,0)+eyesFor(202,138,m,look.eye==='#7fb2d9'?'#e0b04a':look.eye,true)+mouthFor(202,184,m)
    +stroke('M152 150l-12 6M252 150l12 6',O,3)+browsFor(202,124,m,mix(f,O,.6)),
    eyes:[[180,138],[224,138]],top:96,skin:f};}
  case 'spirit':{const glow=mix(a,'#ffffff',.62);
   return {back:dot(202,146,64,mix(a,'#ffffff',.4),0,' opacity=".28"')+dot(202,146,52,mix(a,'#ffffff',.5),0,' opacity=".35"'),
    front:(look.crown?'':`<path d="M202 108c-12-10-10-26 0-38 2 10 10 12 10 22 0 8-4 14-10 16z" fill="#fff2b8" stroke="${O}" stroke-width="3.4"/>`)
    +dot(202,146,40,glow)+(m==='grave'?stroke('M178 150q8-6 16 0M210 150q8-6 16 0',O,3.4):dot(186,148,5,O,0)+dot(218,148,5,O,0))+mouthFor(202,166,m)
    +dot(177,160,7,mix(a,'#e58f7a',.5),0,' opacity=".4"')+dot(227,160,7,mix(a,'#e58f7a',.5),0,' opacity=".4"'),
    eyes:[[186,148],[218,148]],top:104,skin:glow};}
 }
}
function hatAt(look:Look,top:number):string{
 if(look.hat==='none')return '';
 const felt=mix(look.coat,O,.25),band=look.accent,eared=look.form!=='human'&&look.form!=='spirit',k=eared?.78:1;
 const body={
  brim:shape('M-84 8c10-16 40-18 84-14s74 2 84 14c-20 14-148 14-168 0z',felt)+shape('M-38 0c-2-30 12-46 38-46s40 16 38 46c-24 6-52 6-76 0z',felt)+shape('M-38 -8q38 8 76 0l1 9q-39 8-78 0z',band,3.2)+shape('M30 -10c14-22 34-34 52-36-6 16-24 32-48 42z',mix(band,'#ffffff',.35),2.8),
  cap:shape('M-44 8c-6-32 22-52 54-46 24 6 40 24 44 42-32-8-66-8-98 4z',mix(band,O,.2))+shape('M30 -18c18-24 40-36 60-38-8 18-30 36-58 44z','#f1e5cf',3)+stroke('M32 -14c18-18 36-30 54-36',O,1.6,' opacity=".5"'),
  tall:`<ellipse cx="0" cy="4" rx="62" ry="13" fill="${felt}" stroke="${O}" stroke-width="4"/>`+shape('M-34 4c6-44 14-86 30-116 8-14 24-20 38-14-14 6-22 18-24 34-2 34 6 64 24 96z',felt)+shape('M-32 -6q34 8 66 0l1 10q-35 8-68 0z',band,3.2),
 }[look.hat];
 return `<g transform="translate(202 ${top+(eared?8:6)}) rotate(${look.hat==='cap'?-10:look.mood==='wry'?-6:0}) scale(${k})">${body}</g>`;
}
const crownAt=(top:number)=>at(202,top,0,shape('M-30 0l-8-30 18 12 20-24 20 24 18-12-8 30z','#e0b04a',3.6)+shape('M-30 -2h60v12h-60z','#f0d08a',3.4)+dot(0,4,4,'#b05a8a',2.4)+dot(-18,4,2.6,'#5a8ab0',0)+dot(18,4,2.6,'#5a8ab0',0));
const spectacles=(eyes:[number,number][],form:Form)=>{const r=form==='owl'?17:12;
 return eyes.map(([x,y])=>dot(x,y,r,'#dfeef6',3.2,' fill-opacity=".25"')).join('')+stroke(`M${eyes[0][0]+r} ${eyes[0][1]-1}q${(eyes[1][0]-eyes[0][0]-2*r)/2} -6 ${eyes[1][0]-eyes[0][0]-2*r} 0`,O,3);};

// --- tails and wings ---------------------------------------------------------------------------------------------
function behindBody(look:Look):string{
 const f=look.fur;
 switch(look.form){
  case 'cat':return stroke('M240 430c44 4 70 26 72-24 2-26-10-42-24-46',O,30)+stroke('M240 430c44 4 70 26 72-24 2-26-10-42-24-46',f,21);
  case 'fox':return shape('M232 400c40-10 82 0 96 40 6 20-4 40-26 44-34 6-62-14-76-40z',f)+shape('M300 482c14-6 26-20 28-42-12 8-26 12-40 10 0 14 4 24 12 32z',look.belly,3.4);
  case 'dragon':{const wing=mix(f,O,.18),web=mix(f,'#ffffff',.25);
   return shape('M168 236c-40-30-82-40-118-34 16 14 22 30 20 46 14-8 30-8 40 2 6-12 22-18 36-12z',wing)+stroke('M166 238L68 210M166 240L96 246M168 244L140 256',web,2.6)
    +shape('M236 236c40-30 82-40 118-34-16 14-22 30-20 46-14-8-30-8-40 2-6-12-22-18-36-12z',wing)+stroke('M238 238L336 210M238 240L308 246M236 244L264 256',web,2.6)
    +stroke('M240 430c40 6 70 30 104 40',O,26)+stroke('M240 430c40 6 70 30 104 40',f,18)+shape('M338 460l22 14-24 6z',mix(f,O,.25),3.4);}
  default:return '';
 }
}

// --- assembly ------------------------------------------------------------------------------------------------------
export function customGameMasterSvg(spec:GameMasterSpec):string{
 const look=gameMasterLook(spec),hd=head(look),p=pose(look),hand=look.form==='spirit'?mix(look.accent,'#ffffff',.62):look.form==='human'?hd.skin:look.fur;
 // Sleeves sit a shade darker than the coat so arms read against it, as on the built-in Game Masters.
 const sleeve=look.form==='spirit'?mix(look.coat,'#ffffff',.08):mix(look.coat,O,look.garment==='cloak'?.05:.2);
 const parts:string[]=[];
 const shadow=`<ellipse cx="202" cy="${look.form==='spirit'?494:492}" rx="${look.form==='spirit'?84:124}" ry="${look.form==='spirit'?9:13}" fill="${O}" opacity="${look.form==='spirit'?.12:.18}"/>`;
 parts.push(behindBody(look),p.behind,`<g transform="translate(202 190) scale(1.16) translate(-202 -190)">${hd.back}</g>`);
 parts.push(feet(look),coat(look),sideCape(look),satchel(look),neckwear(look),dice(look));
 if(look.mood==='grave'&&look.form!=='spirit')parts.push(shape('M150 218l-26-78 52 50zM254 218l26-78-52 50z',mix(look.coat,O,.15)));
 parts.push(stroke('M202 206L202 184',O,28)+stroke('M202 206L202 184',hand,20));
 parts.push(p.items);
 parts.push(limb(p.left,sleeve),limb(p.right,sleeve));
 const lh=p.left[p.left.length-1],rh=p.right[p.right.length-1];
 parts.push(dot(lh[0],lh[1],12,hand),dot(rh[0],rh[1],12,hand));
 if(look.form==='owl')parts.push(stroke(`M${lh[0]-6} ${lh[1]+4}l-4 8M${rh[0]+6} ${rh[1]+4}l4 8`,mix(look.fur,O,.45),2.4));
 parts.push(p.front);
 parts.push(`<g transform="translate(202 190) scale(1.16) rotate(${look.human?.tilt??0}) translate(-202 -190)">${hd.front}${look.glasses&&look.form!=='human'?spectacles(hd.eyes,look.form):''}${look.crown?crownAt(hd.top):hatAt(look,hd.top)}</g>`);
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 520" width="400" height="520" fill="none" stroke-linecap="round" stroke-linejoin="round">${shadow}<g transform="rotate(${look.lean} 202 488)">${parts.join('')}</g></svg>`;
}

const cache=new Map<string,string>();
export function customGameMasterArt(spec:GameMasterSpec):string{
 const key=`${spec.name.trim().toLowerCase()}|${spec.form}|${spec.accessory}|${spec.color}|${spec.voice??''}`;
 let url=cache.get(key);
 if(!url){url=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(customGameMasterSvg(spec))}`;if(cache.size>100)cache.clear();cache.set(key,url)}
 return url;
}

/** The full figure that stands for a narrator: a built-in Game Master's painting, or one drawn for them.
    Old saves made before narrators had a shape are drawn as a person; no narrator at all is Aether, the spirit. */
export function gameMasterDrawing(profile?:NarratorProfile|null):{art:string;face:FaceCentre}{
 const p=profile??AETHER,builtIn=GAME_MASTERS.find(g=>g.profile.name===p.name);
 if(builtIn)return {art:builtIn.art,face:builtIn.face};
 return {art:customGameMasterArt({name:p.name,form:p.avatar?.form??'human',accessory:p.avatar?.accessory??'none',color:p.color,voice:p.voice}),face:DRAWN_GM_FACE};
}
