import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {APPEARANCE_BOOTSTRAP,COLOR_MODE_STORAGE_KEY,THEME_STORAGE_KEY,normalizeArtTheme,normalizeColorMode,resolveColorMode} from './appearance.ts';

test('color mode is independent of art style and follows the system only when selected',()=>{
 for(const style of ['paint','pixel']){
  assert.equal(normalizeArtTheme(style),style);
  for(const dark of [false,true]){
   assert.equal(resolveColorMode('light',dark),'light');assert.equal(resolveColorMode('dark',dark),'dark');assert.equal(resolveColorMode('system',dark),dark?'dark':'light');
  }
 }
 assert.equal(normalizeArtTheme('other'),'paint');assert.equal(normalizeColorMode(null),'system');assert.equal(normalizeColorMode('other'),'system');
});
function bootstrap(values:Record<string,string>,dark:boolean,blocked=false){
 const root={dataset:{} as Record<string,string>,style:{} as Record<string,string>};
 vm.runInNewContext(APPEARANCE_BOOTSTRAP,{localStorage:{getItem(key:string){if(blocked)throw new Error('Storage disabled');return values[key]??null}},matchMedia:()=>({matches:dark}),document:{documentElement:root}});
 return root;
}
test('pre-paint bootstrap restores both choices without default-theme flash',()=>{
 for(const style of ['paint','pixel'])for(const mode of ['light','dark','system'])for(const dark of [false,true]){
  const root=bootstrap({[THEME_STORAGE_KEY]:style,[COLOR_MODE_STORAGE_KEY]:mode},dark);
  assert.equal(root.dataset.theme,style);assert.equal(root.dataset.colorPreference,mode);assert.equal(root.dataset.colorMode,resolveColorMode(mode as 'light'|'dark'|'system',dark));assert.equal(root.style.colorScheme,root.dataset.colorMode);
 }
});
test('pre-paint bootstrap handles blocked storage and invalid preferences',()=>{
 assert.equal(bootstrap({},true,true).dataset.colorMode,'dark');assert.equal(bootstrap({},false,true).dataset.colorMode,'light');
 const invalid=bootstrap({[THEME_STORAGE_KEY]:'broken',[COLOR_MODE_STORAGE_KEY]:'sepia'},true);assert.equal(invalid.dataset.theme,'paint');assert.equal(invalid.dataset.colorPreference,'system');assert.equal(invalid.dataset.colorMode,'dark');
});

test('both color modes retain readable text, muted labels and primary buttons',async()=>{
 const {readFile}=await import('node:fs/promises');const css=await readFile(new URL('../appearance.css',import.meta.url),'utf8');
 const luminance=(hex:string)=>{const full=hex.length===4?'#'+[...hex.slice(1)].map(c=>c+c).join(''):hex;const channels=[1,3,5].map(i=>parseInt(full.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722};
 const contrast=(a:string,b:string)=>{const l=[luminance(a),luminance(b)].sort((x,y)=>y-x);return(l[0]+.05)/(l[1]+.05)};
 for(const mode of ['light','dark']){
  const block=css.match(new RegExp(`html\\[data-color-mode='${mode}'\\]\\{([^}]+)`))?.[1];assert.ok(block);
  const token=(name:string)=>{const value=block.match(new RegExp(`--${name}:(#[a-fA-F0-9]+)`))?.[1];assert.ok(value,`Missing ${mode} ${name}`);return value};
  assert.equal(token('canvas'),mode==='light'?'#fff':'#000');
  for(const surface of ['canvas','surface','surface-raised'])for(const text of ['ink','muted'])assert.ok(contrast(token(surface),token(text))>=4.5,`${mode} ${text} on ${surface} must reach WCAG AA text contrast`);
  assert.ok(contrast(token('accent'),token('accent-ink'))>=4.5,`${mode} primary buttons must reach WCAG AA text contrast`);
 }
 const pixel=await readFile(new URL('../pixel.css',import.meta.url),'utf8');assert.ok(!/(?:^|[;{])\s*(?:color|background(?:-color)?|border-color)\s*:/m.test(pixel),'Art style must not redefine the color palette');
});
