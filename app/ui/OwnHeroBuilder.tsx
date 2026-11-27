'use client';
import {HERO_CLASSES,HERO_COLORS,CLASS_INFO} from '../../game/types';
import {HERO_ART_RATIO,type HeroPreset} from '../../game/presets';
import type {HeroProfile} from '../../game/creation';
import {OWN_HERO_DEFAULT,OWN_HERO_NAME_IDEAS,ownHeroClassName,ownHeroRole,type OwnHeroInput} from '../../game/own-hero';
import {CUSTOM_FACE,customHeroArt} from './hero-figure';
import {usePaintedFigure,type PaintedFigure} from './painted-portrait';
import {Portrait} from './RealmKit';
import PaintPanel,{ModeSwitch,useImageAccess} from './PaintPanel';
import {MAX_PAINTINGS,ownPortrait} from '../../game/own-game-master';

/** Where a hero figure stands on the hero stage (a percentage box; the board has its own placement in actor-art). */
export function stagePlacement(h:Pick<HeroPreset,'id'>){const w=380*HERO_ART_RATIO/600*100,top=(485-0.955*380)/560*100;return {width:w+'%',top:top+'%',left:(50-(h.id==='mira'?0.58:0.5)*w)+'%'};}

/** Your own hero, shaped like a roster hero so every setup screen, the board and the sheet can show them. */
export function ownHeroPreset(own:OwnHeroInput,profile:HeroProfile|null,painted?:PaintedFigure):HeroPreset{
 const name=profile?.name??(own.name.trim()||'Your own hero'),className=ownHeroClassName(own.heroClass);
 return {id:'own',name,short:name,className,subclass:'Your own hero',role:ownHeroRole(own.heroClass),epithet:'A hero of your own making.',
  intro:profile?.background??'',story:profile?.background??'',art:painted?.art??customHeroArt({name,heroClass:own.heroClass,color:own.color}),face:painted?.face??CUSTOM_FACE,
  profile:profile??{name,background:'',personality:['Brave'],heroClass:own.heroClass,color:own.color}};
}

/** The workbench for your own hero: their figure large on the hero stage, the choices beside it.
    Draw them (class and colour) or paint them with AI (the class, which sets their gear and rules, and the player's description). */
export default function OwnHeroBench({hero,own,setOwn}:{hero:HeroPreset;own:OwnHeroInput;setOwn:(own:OwnHeroInput)=>void}){
 const set=(patch:Partial<OwnHeroInput>)=>setOwn({...own,...patch});
 const access=useImageAccess(),painting=own.mode==='paint',paintings=own.paintings??[],painted=usePaintedFigure(ownPortrait(own),'hero'),waiting=painting&&!painted;
 return <div className="qs-bench" style={{['--own-colour' as string]:own.color}}>
  <section className="qs-bench-stage hero" aria-label={`${hero.name}, ${hero.className}`}>
   <img className="qs-bench-scene" src="/art/scenes/hero-stage.svg" alt=""/>
   <span className={`qs-stage-figure${waiting?' waiting':''}`} style={stagePlacement({id:'own'})} aria-hidden="true"><span className="qs-stage-shadow"/><img src={hero.art} alt=""/></span>
   {waiting?<p className="qs-bench-waiting">{paintings.length?'Choose a painting to stand here':'Your painting will stand here'}</p>:null}
  </section>
  <div className="qs-bench-form">
   <ModeSwitch mode={painting?'paint':'draw'} setMode={mode=>set({mode})} canPaint={!!access} drawHint="Pick a class and a colour"/>
   <label className="qs-own-name"><span className="realm-eyebrow">Their name</span>
    <input name="own-hero-name" value={own.name} maxLength={24} placeholder="Type a name" autoComplete="off" spellCheck={false} onChange={e=>set({name:e.target.value})}/></label>
   {!own.name.trim()?<p className="qs-own-ideas"><span>Or borrow one:</span>{OWN_HERO_NAME_IDEAS.slice(0,4).map(n=><button key={n} type="button" className="qs-own-chip" onClick={()=>set({name:n})}>{n}</button>)}</p>:null}
   <fieldset className="qs-own-set"><legend className="realm-eyebrow">Their class</legend>
    <div className="qs-own-forms qs-own-classes" role="radiogroup" aria-label="Their class">{HERO_CLASSES.map(c=><button key={c} type="button" role="radio" aria-checked={own.heroClass===c} aria-label={ownHeroClassName(c)} data-tooltip={CLASS_INFO[c].description} className="realm-choice qs-own-form-pick" onClick={()=>set({heroClass:c})}>
     <Portrait art={customHeroArt({name:hero.name,heroClass:c,color:own.color})} face={CUSTOM_FACE} ratio={HERO_ART_RATIO} width={46} height={46} scale={1.9}/><span>{ownHeroClassName(c)}</span></button>)}</div>
    <p className="qs-own-class-note">{CLASS_INFO[own.heroClass].description} · {CLASS_INFO[own.heroClass].ability}</p>
   </fieldset>
   {painting?<PaintPanel kind="hero" extra={{heroClass:own.heroClass}} paintings={paintings} portrait={own.portrait} available={!!access} perDay={access?.imagesPerDay}
     onPainted={id=>set({portrait:id,paintings:[id,...paintings.filter(p=>p!==id)].slice(0,MAX_PAINTINGS)})} onChoose={portrait=>set({portrait})}
     placeholder={`For example: a young ${ownHeroClassName(own.heroClass).toLowerCase()} with freckles, braided red hair and a fox-fur collar`}/>
   :<fieldset className="qs-own-set"><legend className="realm-eyebrow">Their colour</legend>
    <div className="qs-own-swatches" role="radiogroup" aria-label="Their colour">{HERO_COLORS.map(c=><button key={c} type="button" role="radio" aria-checked={own.color===c} aria-label={`Colour ${c}`} data-tooltip="Their colour" className="qs-own-swatch" style={{background:c}} onClick={()=>set({color:c})}/>)}</div>
   </fieldset>}
   <label className="qs-own-who"><span className="realm-eyebrow">Who are they? <em>For the story</em></span>
    <textarea name="own-hero-who" value={own.who} maxLength={240} rows={2} placeholder="Optional. For example: a fisher’s daughter who left home to find her brother." onChange={e=>set({who:e.target.value})}/></label>
   {own.name||own.who||own.portrait||paintings.length?<button type="button" className="qs-own-chip qs-own-reset" onClick={()=>setOwn({...OWN_HERO_DEFAULT,mode:own.mode})}>Start again with a blank hero</button>:null}
   <p className="qs-own-note">Your hero plays as a {ownHeroClassName(own.heroClass).toLowerCase()}: the class sets every rule{painting?' and the gear they are painted with':''}. Sealed notes belong to the sixteen heroes, so yours keeps none.</p>
  </div>
 </div>;
}
