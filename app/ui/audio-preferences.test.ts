import assert from 'node:assert/strict';
import test from 'node:test';
import {DEFAULT_AUDIO_PREFERENCES,normalizeAudioPreferences} from './audio-preferences.ts';
test('restored audio levels clamp to safe browser ranges and never restore playback',()=>{
 assert.deepEqual(normalizeAudioPreferences({voiceVolume:5,musicVolume:-1,speechRate:20,voice:true,music:true}),{...DEFAULT_AUDIO_PREFERENCES,voiceVolume:1,musicVolume:0,speechRate:1.5});
 assert.deepEqual(normalizeAudioPreferences({voiceVolume:NaN,musicVolume:Infinity,speechRate:'fast'}),DEFAULT_AUDIO_PREFERENCES);
 assert.deepEqual(normalizeAudioPreferences({...DEFAULT_AUDIO_PREFERENCES,voiceVolume:0,musicVolume:1,speechRate:.5}),{...DEFAULT_AUDIO_PREFERENCES,voiceVolume:0,musicVolume:1,speechRate:.5});
 assert.equal('voice'in normalizeAudioPreferences({voice:true}),false);assert.equal('music'in normalizeAudioPreferences({music:true}),false);
});
test('valid persisted audio preferences survive serialization without sharing mutable defaults',()=>{
 const original={...DEFAULT_AUDIO_PREFERENCES,voiceVolume:.35,musicVolume:.8,speechRate:1.25,interfaceVolume:.6,hoverSounds:false};assert.deepEqual(normalizeAudioPreferences(JSON.parse(JSON.stringify(original))),original);
 const first=normalizeAudioPreferences(null),second=normalizeAudioPreferences(undefined);first.voiceVolume=0;assert.deepEqual(second,DEFAULT_AUDIO_PREFERENCES);
});

test('old saved levels migrate with quiet interface defaults and invalid levels are bounded',()=>{
 const old=normalizeAudioPreferences({voiceVolume:.3,musicVolume:.2,speechRate:1});
 assert.equal(old.interfaceVolume,.45);assert.equal(old.hoverSounds,true);
 assert.equal(normalizeAudioPreferences({interfaceVolume:-2}).interfaceVolume,0);
 assert.equal(normalizeAudioPreferences({interfaceVolume:5}).interfaceVolume,1);
 assert.equal(normalizeAudioPreferences({interfaceVolume:NaN,hoverSounds:'false'}).interfaceVolume,.45);
 assert.equal(normalizeAudioPreferences({hoverSounds:false}).hoverSounds,false);
 assert.equal('interfaceSounds' in normalizeAudioPreferences({interfaceSounds:true}),false);
});
