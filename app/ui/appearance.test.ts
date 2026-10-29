import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {APPEARANCE_BOOTSTRAP,ACCENT_NAMES,ACCENT_PALETTES,ACCENT_STORAGE_KEY,MOTION_STORAGE_KEY,COLOR_MODE_STORAGE_KEY,THEME_STORAGE_KEY,VIEW_MODE_STORAGE_KEY,normalizeViewMode,viewModeStorageChange,normalizeAccent,normalizeMotion,resolveReducedMotion,normalizeArtTheme,normalizeColorMode,resolveColorMode} from './appearance.ts';

test('color mode is independent of art style and follows the system only when selected',()=>{
 for(const style of ['paint','pixel']){
  assert.equal(normalizeArtTheme(style),style);
  for(const dark of [false,true]){
   assert.equal(resolveColorMode('light',dark),'light');assert.equal(resolveColorMode('dark',dark),'dark');assert.equal(resolveColorMode('system',dark),dark?'dark':'light');
  }
 }
 assert.equal(normalizeArtTheme('other'),'paint');assert.equal(normalizeColorMode(null),'system');assert.equal(normalizeColorMode('other'),'system');
});
function bootstrap(values:Record<string,string>,dark:boolean,blocked=false,systemReduced=false){
 const root={dataset:{} as Record<string,string>,style:{} as Record<string,string>};
 vm.runInNewContext(APPEARANCE_BOOTSTRAP,{localStorage:{getItem(key:string){if(blocked)throw new Error('Storage disabled');return values[key]??null}},matchMedia:(query:string)=>({matches:query.includes('reduced-motion')?systemReduced:dark}),document:{documentElement:root}});
 return root;
}
test('pre-paint bootstrap restores both choices without default-theme flash',()=>{
 for(const style of ['paint','pixel'])for(const view of ['2d','2.5d'])for(const mode of ['light','dark','system'])for(const dark of [false,true]){
  const root=bootstrap({[THEME_STORAGE_KEY]:style,[VIEW_MODE_STORAGE_KEY]:view,[COLOR_MODE_STORAGE_KEY]:mode},dark);
  assert.equal(root.dataset.theme,style);assert.equal(root.dataset.viewMode,view);assert.equal(root.dataset.colorPreference,mode);assert.equal(root.dataset.colorMode,resolveColorMode(mode as 'light'|'dark'|'system',dark));assert.equal(root.style.colorScheme,root.dataset.colorMode);
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


test('accent and motion preferences restore independently in every art and color mode',()=>{
 for(const art of ['paint','pixel'])for(const view of ['2d','2.5d'])for(const color of ['light','dark','system'])for(const accent of ACCENT_NAMES)for(const motion of ['system','full','reduced'] as const)for(const systemReduced of [false,true]){
  const root=bootstrap({[THEME_STORAGE_KEY]:art,[VIEW_MODE_STORAGE_KEY]:view,[COLOR_MODE_STORAGE_KEY]:color,[ACCENT_STORAGE_KEY]:accent,[MOTION_STORAGE_KEY]:motion},true,false,systemReduced);
  assert.equal(root.dataset.theme,art);assert.equal(root.dataset.viewMode,view);assert.equal(root.dataset.accent,accent);assert.equal(root.dataset.motionPreference,motion);assert.equal(root.dataset.motion,resolveReducedMotion(motion,systemReduced)?'reduced':'full');
  assert.equal(root.dataset.colorMode,color==='light'?'light':'dark');
 }
 assert.equal(normalizeAccent('unknown'),'blue');assert.equal(normalizeMotion('unknown'),'system');
 assert.equal(bootstrap({[ACCENT_STORAGE_KEY]:'unknown',[MOTION_STORAGE_KEY]:'unknown'},false).dataset.accent,'blue');
});

test('world view defaults safely and preserves preferences saved before it existed',()=>{
 assert.equal(normalizeViewMode('2.5d'),'2.5d');
 for(const value of ['2d',null,undefined,'3d','2.5D',{},true,2.5])assert.equal(normalizeViewMode(value),'2d');
 const saved={[THEME_STORAGE_KEY]:'pixel',[COLOR_MODE_STORAGE_KEY]:'dark',[ACCENT_STORAGE_KEY]:'rose',[MOTION_STORAGE_KEY]:'reduced'};
 const old=bootstrap(saved,false);
 assert.equal(old.dataset.viewMode,'2d');assert.equal(old.dataset.theme,'pixel');assert.equal(old.dataset.accent,'rose');assert.equal(old.dataset.colorMode,'dark');assert.equal(old.dataset.motion,'reduced');
 const invalid=bootstrap({...saved,[VIEW_MODE_STORAGE_KEY]:'broken'},false);assert.deepEqual(invalid,old);
 assert.equal(bootstrap({[VIEW_MODE_STORAGE_KEY]:'2.5d'},false,true).dataset.viewMode,'2d');
});

test('cross-tab view changes normalize independently and removal or clear restores 2D',()=>{
 assert.equal(viewModeStorageChange({key:VIEW_MODE_STORAGE_KEY,newValue:'2.5d'}),'2.5d');
 assert.equal(viewModeStorageChange({key:VIEW_MODE_STORAGE_KEY,newValue:'2d'}),'2d');
 assert.equal(viewModeStorageChange({key:VIEW_MODE_STORAGE_KEY,newValue:null}),'2d');
 assert.equal(viewModeStorageChange({key:VIEW_MODE_STORAGE_KEY,newValue:'invalid'}),'2d');
 assert.equal(viewModeStorageChange({key:null,newValue:null}),'2d');
 for(const key of [THEME_STORAGE_KEY,COLOR_MODE_STORAGE_KEY,ACCENT_STORAGE_KEY,MOTION_STORAGE_KEY,'painted-realms-controls-v1']){
  assert.equal(viewModeStorageChange({key,newValue:'2.5d'}),undefined);
  assert.equal(viewModeStorageChange({key,newValue:null}),undefined);
 }
});

test('every accent passes text contrast in light and dark, including hover and selected states',async()=>{
 const luminance=(hex:string)=>{const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722};
 const contrast=(a:string,b:string)=>{const l=[luminance(a),luminance(b)].sort((x,y)=>y-x);return(l[0]+.05)/(l[1]+.05)};
 const {readFile}=await import('node:fs/promises');const css=await readFile(new URL('../appearance.css',import.meta.url),'utf8');
 for(const accent of ACCENT_NAMES)for(const mode of ['light','dark'] as const){
  const palette=ACCENT_PALETTES[accent][mode];
  for(const background of [palette.accent,palette.hover])assert.ok(contrast(background,palette.ink)>=4.5,`${accent} ${mode} primarybutton contrast`);
  assert.ok(contrast(palette.accent,palette.soft)>=4.5,`${accent} ${mode} selectedlabel contrast`);
  const selector=`html[data-accent='${accent}'][data-color-mode='${mode}']`;
  const block=css.split(selector+'{')[1]?.split('}')[0];assert.ok(block);
  assert.ok(block.includes(`--accent:${palette.accent}`));assert.ok(block.includes(`--accent-hover:${palette.hover}`));assert.ok(block.includes(`--accent-ink:${palette.ink}`));assert.ok(block.includes(`--accent-soft:${palette.soft}`));
 }
});
