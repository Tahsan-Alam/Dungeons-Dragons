'use client';
import {memo} from 'react';
import type {Actor,Biome} from '../../game/types';
import {HeroArt} from './Art';
import {ENEMY_ART} from './enemy-art-data';
import {enemyArtKey,heroArtFor,heroPlacement,enemyPlacement,heroPortraitBox,enemyPortraitBox,type Placement} from './actor-art';

/** The figure's artwork and where it sits relative to the tile point, or null when only the generic token exists. */
export function actorFigure(actor:Actor,biome:Biome):{src:string;place:Placement;enemy:boolean}|null{
 if(actor.enemy){const key=enemyArtKey(actor,biome);return key?{src:ENEMY_ART[key].src,place:enemyPlacement(key),enemy:true}:null}
 const hero=heroArtFor(actor);return hero?{src:hero.art,place:heroPlacement(hero),enemy:false}:null;
}

/** An upright figure standing on its tile in the scene view. The image ignores the pointer; a body-sized area takes clicks. */
export const ActorSprite=memo(function ActorSprite({actor,biome}:{actor:Actor;biome:Biome}){
 const figure=actorFigure(actor,biome);
 if(!figure)return <svg x="-25" y="-45" width="50" height="58" viewBox="0 0 80 90"><HeroArt heroClass={actor.heroClass} color={actor.color} enemy={actor.enemy}/></svg>;
 const {src,place,enemy}=figure,hitTop=Math.max(place.top,-110);
 // Creature art faces right; enemies enter from the far side of the board, so they turn to face the party.
 return <g className="actor-sprite">
  <image href={src} x={place.x} y={place.y} width={place.width} height={place.height} preserveAspectRatio="none" pointerEvents="none" transform={enemy?'scale(-1 1)':undefined}/>
  <rect className="actor-hit" x={-21} y={hitTop} width={42} height={-hitTop+8} fill="transparent"/>
 </g>;
});
export function spriteTop(actor:Actor,biome:Biome){return actorFigure(actor,biome)?.place.top??-45}

/** A head-and-shoulders crop from the same artwork, for turn order, lists and detail panels. */
export const ActorPortrait=memo(function ActorPortrait({actor,biome}:{actor:Actor;biome:Biome}){
 const key=actor.enemy?enemyArtKey(actor,biome):undefined,hero=actor.enemy?undefined:heroArtFor(actor);
 const box=key?enemyPortraitBox(key):hero?heroPortraitBox(hero):null,src=key?ENEMY_ART[key].src:hero?.art;
 if(!box||!src)return <HeroArt heroClass={actor.heroClass} color={actor.color} enemy={actor.enemy}/>;
 return <svg className="hero-art actor-portrait" viewBox={`${box.x} ${box.y} ${box.size} ${box.size}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <image href={src} x={box.art.x} y={box.art.y} width={box.art.width} height={box.art.height} preserveAspectRatio="none"/>
 </svg>;
});
