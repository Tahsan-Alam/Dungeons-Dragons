'use client';
import {HERO_CLASSES,HERO_COLORS,CLASS_INFO} from '../../game/types';
import {HERO_ART_RATIO,type HeroPreset} from '../../game/presets';
import type {HeroProfile} from '../../game/creation';
import {OWN_HERO_NAME_IDEAS,ownHeroClassName,ownHeroRole,type OwnHeroInput} from '../../game/own-hero';
import {CUSTOM_FACE,customHeroArt} from './hero-figure';
import type {PaintedFigure} from './painted-portrait';
import {Portrait} from './RealmKit';
import PaintPanel from './PaintPanel';

/** Where a hero figure stands on the hero stage (a percentage box; the board has its own placement in actor-art). */
export function stagePlacement(h:Pick<HeroPreset,'id'>){const w=380*HERO_ART_RATIO/600*100,top=(485-0.955*380)/560*100;return {width:w+'%',top:top+'%',left:(50-(h.id==='mira'?0.58:0.5)*w)+'%'};}

/** Your own hero, shaped like a roster hero so every setup screen, the board and the sheet can show them. */
export function ownHeroPreset(own:OwnHeroInput,profile:HeroProfile|null,painted?:PaintedFigure):HeroPreset{
 const name=profile?.name??(own.name.trim()||'Your own hero'),className=ownHeroClassName(own.heroClass);
 return {id:'own',name,short:name,className,subclass:'Your own hero',role:ownHeroRole(own.heroClass),epithet:'A hero of your own making.',
  intro:profile?.background??'',story:profile?.background??'',art:painted?.art??customHeroArt({name,heroClass:own.heroClass,color:own.color}),face:painted?.face??CUSTOM_FACE,
  profile:profile??{name,background:'',personality:['Brave'],heroClass:own.heroClass,color:own.color}};
}

/** The workbench for your own hero: their figure large on the hero stage, every choice in fixed rows beside it. */
export default function OwnHeroBench({hero,own,setOwn}:{hero:HeroPreset;own:OwnHeroInput;setOwn:(own:OwnHeroInput)=>void}){
 // A new class or colour makes an earlier painting out of date.
 const set=(patch:Partial<OwnHeroInput>)=>setOwn({...own,...patch,...('heroClass' in patch||'color' in patch?{portrait:undefined}:{})});
 const named=!!own.name.trim(),drawing=customHeroArt({name:hero.name,heroClass:own.heroClass,color:own.color});
 return <div className="qs-bench" style={{['--own-colour' as string]:own.color}}>
  <section className="qs-bench-stage hero" aria-label={`${hero.name}, ${hero.className}`}>
   <img className="qs-bench-scene" src="/art/scenes/hero-stage.svg" alt=""/>
   <span className="qs-stage-figure" style={stagePlacement({id:'own'})} aria-hidden="true"><span className="qs-stage-shadow"/><img src={hero.art} alt=""/></span>
  </section>
  <div className="qs-bench-form">
   <label className="qs-own-name"><span className="realm-eyebrow">Their name</span>
    <input name="own-hero-name" value={own.name} maxLength={24} placeholder="Tamsin" autoComplete="off" spellCheck={false} onChange={e=>set({name:e.target.value})}/></label>
   {!named?<p className="qs-own-ideas"><span>Or borrow one:</span>{OWN_HERO_NAME_IDEAS.slice(0,4).map(n=><button key={n} type="button" className="qs-own-chip" onClick={()=>set({name:n})}>{n}</button>)}</p>:null}
   <fieldset className="qs-own-set"><legend className="realm-eyebrow">Their class</legend>
    <div className="qs-own-forms qs-own-classes" role="radiogroup" aria-label="Their class">{HERO_CLASSES.map(c=><button key={c} type="button" role="radio" aria-checked={own.heroClass===c} aria-label={ownHeroClassName(c)} data-tooltip={CLASS_INFO[c].description} className="realm-choice qs-own-form-pick" onClick={()=>set({heroClass:c})}>
     <Portrait art={customHeroArt({name:hero.name,heroClass:c,color:own.color})} face={CUSTOM_FACE} ratio={HERO_ART_RATIO} width={46} height={46} scale={1.9}/><span>{ownHeroClassName(c)}</span></button>)}</div>
    <p className="qs-own-class-note">{CLASS_INFO[own.heroClass].description} · {CLASS_INFO[own.heroClass].ability}</p>
   </fieldset>
   <fieldset className="qs-own-set"><legend className="realm-eyebrow">Their colour</legend>
    <div className="qs-own-swatches" role="radiogroup" aria-label="Their colour">{HERO_COLORS.map(c=><button key={c} type="button" role="radio" aria-checked={own.color===c} aria-label={`Colour ${c}`} data-tooltip="Their colour" className="qs-own-swatch" style={{background:c}} onClick={()=>set({color:c})}/>)}</div>
   </fieldset>
   <label className="qs-own-who"><span className="realm-eyebrow">Who are they?</span>
    <textarea name="own-hero-who" value={own.who} maxLength={240} rows={2} placeholder="A lamplighter’s apprentice who followed the last light out of town." onChange={e=>set({who:e.target.value})}/></label>
   <PaintPanel key={`${own.heroClass}|${own.color}`} kind="hero" fields={{heroClass:own.heroClass,color:own.color}} name={named?hero.name:''} portrait={own.portrait} drawing={drawing}
    setPortrait={portrait=>setOwn({...own,portrait})} placeholder="A few words: freckles and a fox-fur collar"/>
   <p className="qs-own-note">Your hero plays as a {ownHeroClassName(own.heroClass).toLowerCase()}: the class sets every rule. Sealed notes belong to the sixteen heroes, so yours keeps none.</p>
  </div>
 </div>;
}
