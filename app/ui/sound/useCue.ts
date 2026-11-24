'use client';
import {useEffect,useRef} from 'react';
import {playSound} from './engine';
import type {CueName} from './catalog';

/** A sound as something opens, and another as it closes. */
export function useOpenCue(open:CueName|null,close:CueName|null=null){
 useEffect(()=>{if(open)playSound(open);return()=>{if(close)playSound(close)}},[]); // eslint-disable-line react-hooks/exhaustive-deps -- mount only
}
/** A sound each time a value changes after the first render: a page turned, a tab chosen. */
export function useChangeCue(value:unknown,cue:CueName){
 const first=useRef(true);
 useEffect(()=>{if(first.current){first.current=false;return}playSound(cue)},[value,cue]);
}
