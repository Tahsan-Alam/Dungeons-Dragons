import {test} from 'node:test';
import assert from 'node:assert/strict';
import {adoptLegacyAIUnlock,AI_PREFERENCE_KEY,readAIPreference,setAIPreference} from './ai-preferences.ts';

test('legacy server unlock repairs the old false default once and respects later offline choices',()=>{
 const oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),oldStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 const entries=new Map([[AI_PREFERENCE_KEY,'false']]),events=new EventTarget();
 Object.defineProperty(globalThis,'window',{configurable:true,value:events});
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>entries.get(k)??null,setItem:(k:string,v:string)=>entries.set(k,v)}});
 try{
  adoptLegacyAIUnlock(false);assert.equal(readAIPreference(),false);
  adoptLegacyAIUnlock(true);assert.equal(readAIPreference(),true);
  setAIPreference(false);adoptLegacyAIUnlock(true);assert.equal(readAIPreference(),false);
  setAIPreference(true);assert.equal(readAIPreference(),true);
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('Storage blocked');}});
  setAIPreference(false);adoptLegacyAIUnlock(true);assert.equal(readAIPreference(),false);
 }finally{
  if(oldWindow)Object.defineProperty(globalThis,'window',oldWindow);else Reflect.deleteProperty(globalThis,'window');
  if(oldStorage)Object.defineProperty(globalThis,'localStorage',oldStorage);else Reflect.deleteProperty(globalThis,'localStorage');
 }
});
