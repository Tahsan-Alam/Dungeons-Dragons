import { memo } from 'react';
import type { GameState, HeroClass } from '../../game/types';

const P = { ink: '#283b36', dark: '#354b3d', bark: '#8c7150', barkLight: '#c2a46e', leaf: '#89aa75', leafLight: '#b9cd8a', leafDark: '#597e58', skin: '#f2cd9a', hair: '#77563f', stone: '#afbca7', stoneLight: '#d7d9bd', water: '#8ebcb9', waterLight: '#c6e0cc', road: '#e2d2a4', grass: '#c5d4a0' };

function tint(hex: string, amount: number) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  return '#' + [1, 3, 5].map(i => Math.max(0, Math.min(255, parseInt(hex.slice(i, i + 2), 16) + amount)).toString(16).padStart(2, '0')).join('');
}

/** Authored on a 40×45 grid. All silhouette edges are actual pixel steps. */
export const PixelHeroArt = memo(function PixelHeroArt({ heroClass = 'knight', color = '#ed9877', enemy = false, large = false }: { heroClass?: HeroClass; color?: string; enemy?: boolean; large?: boolean }) {
  const shade = tint(color, -34), light = tint(color, 22);
  return <svg width="80" height="90" viewBox="0 0 40 45" shapeRendering="crispEdges" aria-hidden="true" className={large ? 'hero-art pixel-art large' : 'hero-art pixel-art'}>
    <path d="M9 40h22v2H9Zm-3-1h28v2H6Z" fill={P.ink} opacity=".14"/>
    <path d="M13 32h6v7h-2v2h-6v-3h2Zm9 0h6v6h2v3h-7v-2h-1Z" fill={P.ink}/>
    <path d="M14 34h3v4h-3Zm11 0h2v4h-2Z" fill="#71826a"/>
    <path d="M13 21h14v2h3v4h2v7H8v-7h2v-4h3Z" fill={P.ink}/>
    <path d="M14 23h12v2h3v9H11v-9h3Z" fill={color}/>
    <path d="M13 25h3v7h-3Zm11 3h5v6h-5Z" fill={shade}/>
    <path d="M17 24h6v2h-6Z" fill={light}/>
    <path d="M13 33h14v3H13Z" fill={P.ink}/><path d="M19 33h3v2h-3Z" fill="#e9c781"/>
    {enemy ? <>
      <path d="M6 10h5v2h3V9h12v3h3v-2h5v5h-3v3h-3v4h-3v3H15v-3h-3v-4H9v-3H6Z" fill={P.ink}/>
      <path d="M8 12h3v2h4v-3h10v3h4v-2h3v2h-3v3h-3v5H15v-5h-4v-3H8Z" fill="#a2bb76"/>
      <path d="M14 14h5v2h-5Zm8 0h5v2h-5Z" fill="#5c764d"/>
      <path d="M16 16h2v3h-2Zm7 0h2v3h-2ZM18 22h6v2h-6Z" fill={P.ink}/><path d="M19 21h2v2h-2Z" fill="#f3e7ba"/>
    </> : <>
      <path d="M14 9h12v2h2v10h-2v3H14v-3h-2V11h2Z" fill={P.ink}/>
      <path d="M14 12h12v9h-3v2h-6v-2h-3Z" fill={P.skin}/>
      <path d="M14 10h11v2h2v4h-3v-4h-3v2h-5v-1h-2v4h-2v-5h2Z" fill={P.hair}/>
      <path d="M16 16h2v2h-2Zm7 0h2v2h-2ZM19 21h4v1h-4Z" fill={P.ink}/>
      <path d="M14 19h2v2h-2Zm11 0h1v2h-1Z" fill="#dfa579"/>
    </>}
    {heroClass === 'knight' ? <>
      <path d="M4 25h8v2h2v8h-2v3H8v-2H5v-3H3v-6h1Z" fill={P.ink}/>
      <path d="M5 27h7v7h-2v2H8v-2H6v-3H5Z" fill="#dce0c6"/><path d="M8 28h2v5H8Z" fill={color}/>
      <path d="M35 12h2v15h-2v5h-2v-5h-2v-2h4Z" fill={P.ink}/><path d="M35 15h1v10h-1Z" fill="#f2efd2"/>
      <path d="M30 28h8v2h-8Zm3 2h2v5h-2Z" fill="#a88b56"/>
      {!enemy ? <><path d="M13 9h2V7h10v2h2v4H13Z" fill={P.ink}/><path d="M15 9h9v2h-9Z" fill="#a9b9ad"/><path d="M19 6h4v3h-4Z" fill={shade}/></> : null}
    </> : heroClass === 'ranger' ? <>
      <path d="M9 11h3V8h4V5h5V3h3v3h3v3h3v4H9Z" fill={P.ink}/><path d="M13 10h4V7h5V5h1v3h3v3H13Z" fill={color}/>
      <path d="M24 3h3V1h2v5h-2v3h-2Z" fill="#edc878"/>
      <path d="M33 17h3v3h2v4h1v7h-2v4h-3v3h-2v-3h2v-3h2v-9h-1v-3h-2Z" fill={P.ink}/><path d="M34 19h1v3h1v10h-1v3h-1Z" fill="#bb955d"/>
      <path d="M32 20h1v15h-1Zm-2 7h10v1H30Zm7-2h2v5h-2Z" fill="#806944"/>
    </> : heroClass === 'mage' ? <>
      <path d="M8 13v-3h5V7h3V3h2V1h4v3h3v3h3v3h4v3Z" fill={P.ink}/>
      <path d="M12 11h16V9h-3V7h-3V4h-3v3h-2v3h-5Z" fill={shade}/><path d="M19 5h2v3h-2Z" fill="#eed788"/>
      <path d="M32 18h5v2h2v5h-2v2h-1v12h-2V27h-2v-2h-2v-5h2Z" fill={P.ink}/><path d="M33 20h3v5h-3Z" fill="#ebcb79"/><path d="M33 20h2v2h-2Z" fill="#fff1ba"/><path d="M34 28h1v10h-1Z" fill={P.barkLight}/>
      <path d="M4 20h2v2H4Zm2-5h2v2H6ZM1 25h2v2H1Z" fill="#e3b25f"/>
    </> : <>
      <path d="M12 11V7h3V4h3V2h4v2h3v3h3v5h-3V9H15v3Z" fill={P.ink}/><path d="M15 8V6h4V4h2v2h3v3H15Z" fill={color}/><path d="M19 7h2v4h-2Z" fill="#fff1bf"/>
      <path d="M19 25h3v3h3v2h-3v3h-3v-3h-3v-2h3Z" fill="#fff0b8"/>
      <path d="M33 17h3v4h4v3h-4v16h-3V24h-4v-3h4Z" fill={P.ink}/><path d="M34 19h1v4h4v1h-4v14h-1V24h-4v-1h4Z" fill="#e7c475"/>
    </>}
  </svg>;
});

export const PixelTree = memo(function PixelTree({ x, y, size = 1, tone = 0 }: { x: number; y: number; size?: number; tone?: number }) {
  const leaves = ['#8eac76', '#b1c78a', '#709a70'][((tone % 3) + 3) % 3];
  return <g transform={`translate(${x} ${y}) scale(${size})`} shapeRendering="crispEdges">
    <path d="M-22 20h44v8h-44Zm6-4h32v16h-32Z" fill={P.ink} opacity=".12"/>
    <path d="M-6-12H6v38H-6Z" fill={P.ink}/><path d="M-4-10h8v34h-8Z" fill={P.bark}/><path d="M-4-5h3v25h-3Z" fill={P.barkLight}/>
    <path d="M-4-56h8v8h6v8h6v8h-4v4h8v8h6v8h-6v4h10V4H18v8H-18V4h-12v-16h10v-4h-6v-8h6v-8h8v-4h-4v-8h6v-8h6Z" fill={P.ink}/>
    <path d="M-2-52h4v8h6v8h6v4H6v6h12v8h6v4H12v6h14V2H14v6h-28V2h-12V-8h14v-6h-12v-4h6v-8h12v-6h-8v-4h6v-8h6Z" fill={leaves}/>
    <path d="M0-46h4v10H0ZM-8-32h6v4h-6ZM-16-18h10v4h-10ZM-20-4h12V0h-12Z" fill={P.leafLight}/>
    <path d="M4-36h4v10H4Zm4 10h10v8H8ZM-2-12h14v6H-2Zm6 12h10v8H4Z" fill={P.leafDark} opacity=".62"/>
    <path d="M-4-8H0v4h-4Zm12-8h4v4H8ZM-10 2h4v4h-4Z" fill={P.leafDark}/>
  </g>;
});

export const PixelTerrain = memo(function PixelTerrain({ game, grid }: { game: GameState; grid: boolean }) {
  const ruins = game.options.biome === 'ruins';
  return <g shapeRendering="crispEdges" className="pixel-terrain">
    <defs><pattern id="pixel-water" width="32" height="24" patternUnits="userSpaceOnUse"><path d="M2 8h10v2H2Zm12 2h6v2h-6ZM22 18h8v2h-8Z" fill={P.waterLight}/></pattern><pattern id="pixel-grid" width="50" height="50" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="#587d57" opacity=".3"/></pattern></defs>
    <rect width={game.width * 50} height={game.height * 50} fill={ruins ? '#cbd0b5' : P.grass}/>
    {game.tiles.map(t => <g key={`${t.x}-${t.y}`} transform={`translate(${t.x * 50} ${t.y * 50})`}>
      {t.kind === 'path' ? <><rect width="50" height="50" fill={P.road}/><path d={(t.x + t.y) % 2 ? 'M6 8h4v2H6Zm24 24h6v2h-6ZM16 40h2v2h-2Z' : 'M16 14h6v2h-6Zm22 20h2v2h-2ZM8 34h4v2H8Z'} fill="#c9b788" opacity=".55"/></> : t.kind === 'water' ? <><rect width="50" height="50" fill={P.water}/><rect width="50" height="50" fill="url(#pixel-water)"/><path d="M0 0h50v3H0Z" fill="#a8c8ad"/></> : t.kind === 'wall' ? <><path d="M8 6h30v4h6v28h-6v6H8v-6H4V12h4Z" fill="#8fa083"/><path d="M10 8h24v4h8v22h-8v6H10v-6H6V14h4Z" fill="#acb99a"/><path d="M12 10h16v4H12Zm18 20h10v4H30Z" fill="#c1c9a7"/></> : (t.x * 7 + t.y * 3) % 5 === 0 ? <path d="M18 30h2v4h2v-8h2v10h2v-6h2v8H18Z" fill="#91aa76"/> : null}
      {t.decoration === 'flower' ? <><path d="M15 22h2v12h-2Zm17 10h2v9h-2Z" fill="#789969"/><path d="M13 20h6v6h-6Zm17 10h6v6h-6Z" fill="#e9b665"/><path d="M15 22h2v2h-2Zm17 10h2v2h-2Z" fill="#fff0a8"/></> : t.decoration === 'mushroom' ? <><path d="M22 29h6v10h-6Z" fill={P.bark}/><path d="M20 20h10v4h4v6H16v-6h4Z" fill="#ae7655"/><path d="M20 22h3v3h-3Zm8 3h3v3h-3Z" fill="#edcda5"/><path d="M24 30h2v7h-2Z" fill="#efdeb0"/></> : t.decoration === 'rock' ? <><path d="M17 20h16v4h5v12h-6v4H16v-4h-4V26h5Z" fill="#8c9b85"/><path d="M18 22h12v4h5v8H18v-4h-3v-4h3Z" fill={P.stone}/><path d="M19 24h7v3h-7Z" fill={P.stoneLight}/></> : t.decoration === 'ruin' ? <><path d="M12 8h8v4h6V6h10v34H12Z" fill="#899781"/><path d="M15 11h3v4h11v-6h4v28H15Z" fill="#d0d0b0"/><path d="M15 20h18v2H15Zm7-5h2v6h-2Zm-7 14h18v2H15Zm12-7h2v8h-2Z" fill="#a3ad94"/></> : null}
    </g>)}
    {grid ? <rect width={game.width * 50} height={game.height * 50} fill="url(#pixel-grid)"/> : null}
    {game.tiles.filter(t => t.decoration === 'tree').map(t => <PixelTree key={`tree-${t.x}-${t.y}`} x={t.x * 50 + 25} y={t.y * 50 + 32} size={.75 + (t.x % 3) * .08} tone={t.x + t.y}/>)}
  </g>;
});

/** Same 30×30 local placement as the painted chest. */
export function PixelChest({ opened }: { opened: boolean }) { return <g shapeRendering="crispEdges"><path d="M0 10h3V4h5V1h15v3h5v6h3v21H0Z" fill={P.ink}/><path d={opened ? 'M3 3h23v5H3Zm0 13h25v15H3Z' : 'M3 11h3V6h18v5h4v17H3Z'} fill={opened ? '#a89868' : '#c7a05e'}/><path d="M3 13h25v3H3ZM7 5h3v23H7Zm15 0h3v28h-3Z" fill="#e3c27a"/><path d="M12 12h7v9h-7Z" fill={P.ink}/><path d="M14 14h3v4h-3Z" fill="#f7dda1"/>{opened ? <path d="M12 2h7v5h-7Zm2-5h3v4h-3Z" fill="#f4df98"/> : null}</g>; }
export function PixelGateway({ active }: { active: boolean }) { return <g shapeRendering="crispEdges"><path d="M-18-10h5v-5h26v5h5v20h-5v5h-26v-5h-5Z" fill={active ? '#f1d484' : '#b3bd8a'}/><path d="M-14-8h4v-4h20v4h4V8h-4v4h-20V8h-4Z" fill={active ? '#d4bd72' : '#a1ae7d'}/><path d="M-10-2H4v-4h4v4h4v4H8v4H4V2h-14Z" fill={P.leafDark}/>{active ? <path d="M-20-18h4v4h-4Zm34-5h3v3h-3ZM20 12h4v4h-4Z" fill="#efd18a"/> : null}</g>; }

export function PixelPanorama({ biome = 'woodland' }: { biome?: string }) {
  const coastal = biome === 'coast', ruins = biome === 'ruins';
  return <svg viewBox="0 0 800 480" className="panorama pixel-art" shapeRendering="crispEdges" role="img" aria-label="A pixel-art woodland with winding paths, a ruined tower and an adventuring party">
    <rect width="800" height="480" fill="#e2e8ce"/>
    <path d="M552 56h56v8h12v12h8v48h-8v12h-12v8h-56v-8h-12v-12h-8V76h8V64h12Z" fill="#edce7e"/>
    <path d="M0 224h24v-24h24v-32h24v-40h24v16h24v24h32v-16h24v-32h24V96h24V72h24V56h24v24h24v32h24v24h24v32h24v24h24v-16h24v-32h24v-32h24V96h24v32h24v32h24v24h24v32h24v-24h32v-32h24v-32h24V96h24V80h24v32h24v24h24v32h32v24h24v32h32v256H0Z" fill="#b6c8b0"/>
    <path d="M0 280h40v-24h40v-16h48v-16h64v16h48v16h48v24h56v16h64v-16h64v-24h48v-16h64v-16h72v16h64v16h80v224H0Z" fill="#98b794"/>
    <path d="M0 368h40v-24h64v-16h72v-16h96v-24h104v8h64v16h80v16h88v-16h112v16h80v152H0Z" fill={coastal ? '#a5ccbf' : '#c4d4a1'}/>
    {coastal ? <><path d="M0 408h104v-8h96v8h64v16h64v56H0Zm584 16h64v-8h96v8h56v56H584Z" fill="#80b4b3"/><path d="M24 438h64v4H24Zm96-14h40v4h-40Zm496 26h80v4h-80Zm96-18h48v4h-48Z" fill="#cce0c8"/></> : null}
    <path d="M352 480v-32h-16v-32h24v-24h40v-16h48v-16h16v-24h-16v-24h-24v-24h48v16h16v24h16v40h-16v24h-48v16h-40v16h-16v24h16v32Z" fill={P.road}/>
    <path d="M352 438h24v4h-24Zm48-42h16v4h-16Zm44-36h12v4h-12Z" fill="#c6b584"/>
    <g><path d="M496 280V152h-8v-32h20v16h12v-16h20v16h12v-16h20v32h-8v128Z" fill={P.ink}/><path d="M500 276V148h-8v-24h12v16h20v-16h12v16h20v-16h12v24h-8v128Z" fill="#c9c7a8"/><path d="M504 156h52v8h-52Zm32 16h20v4h-20Zm-32 36h20v4h-20Zm28 16h24v4h-24Zm-28 16h16v4h-16Z" fill="#a2ad94"/><path d="M520 276v-32h4v-8h16v8h4v32Z" fill="#5a6b56"/><path d="M524 192v-20h4v-4h8v4h4v20Z" fill="#7f9577"/><path d="M552 156h8v120h-8Z" fill="#aeb79b"/></g>
    {ruins ? <><path d="M196 322V216h16v20h20v-12h16v98Z" fill="#89987f"/><path d="M200 318v-96h8v18h28v-12h8v90Z" fill="#c3c6a8"/><path d="M204 262h36v4h-36Zm16-22h4v24h-4Zm-16 48h36v4h-36Z" fill="#9da88d"/></> : null}
    {[{ x: 74, y: 329, size: 2.2 }, { x: 134, y: 303, size: 1.6 }, { x: 666, y: 320, size: 1.8 }, { x: 732, y: 368, size: 2.5 }, { x: 43, y: 450, size: 2.8 }, { x: 170, y: 410, size: 2 }, { x: 604, y: 397, size: 2.4 }].map((t, i) => <PixelTree key={i} {...t} tone={i}/>)}
    <g transform="translate(304 328) scale(.9)"><PixelHeroArt heroClass="knight"/></g><g transform="translate(374 346) scale(.85)"><PixelHeroArt heroClass="mage" color="#b4a6cf"/></g>
    <path d="M228 338h4v8h4v-4h4v12h-12Zm336 86h4v12h4v-8h4v16h-12ZM202 448h4v8h4v-12h4v20h-12Z" fill="#829e6e"/>
    <path d="M304 108h8v4h8v-4h8v4h-8v4h-8v-4h-8Zm40 20h8v4h8v-4h8v4h-8v4h-8v-4h-8Z" fill="#7f987e"/>
    <path d="M92 382h8v8h-8Zm508-58h8v8h-8ZM244 402h8v8h-8Z" fill="#e0ae62"/>
    <path d="M94 384h4v4h-4Zm508-58h4v4h-4ZM246 404h4v4h-4Z" fill="#f6d987"/>
  </svg>;
}

// Each icon is its own authored 10×10 bitmap, emitted as scalable SVG squares.
const ICONS: Record<string, string[]> = {
  pin: ['..######..','...####...','...####...','...####...','..######..','.########.','.########.','....##....','....##....','....##....'],
  dice: ['...####...', '.##....##.', '#..####..#', '#.#.##.#.#', '#..####..#', '#..#..#..#', '#.#....#.#', '#.######.#', '.##....##.', '...####...'],
  arrow: ['..........', '.....##...', '......##..', '.......##.', '##########', '##########', '.......##.', '......##..', '.....##...', '..........'],
  close: ['##......##', '.##....##.', '..##..##..', '...####...', '....##....', '...####...', '..##..##..', '.##....##.', '##......##', '..........'],
  sword: ['.......###', '......####', '.....###..', '....###...', '...###....', '#.###.....', '####......', '.###......', '##.##.....', '#.........'],
  shield: ['...####...', '###....###', '#........#', '#...##...#', '#...##...#', '#...##...#', '.#..##..#.', '..#....#..', '...#..#...', '....##....'],
  heart: ['.###..###.', '##########', '##########', '##########', '##########', '.########.', '..######..', '...####...', '....##....', '..........'],
  move: ['....##....', '...####...', '..######..', '....##....', '##..##..##', '##########', '##..##..##', '....##....', '..######..', '...####...'],
  spark: ['....##....', '....##....', '...####...', '..######..', '##########', '..######..', '...####...', '....##....', '....##....', '..........'],
  potion: ['...####...', '...#..#...', '...#..#...', '..#....#..', '.#......#.', '#........#', '#.######.#', '#.######.#', '.########.', '..######..'],
  book: ['.###..###.', '#...##...#', '#...##...#', '#...##...#', '#...##...#', '#...##...#', '#...##...#', '#...##...#', '.###..###.', '....##....'],
  sound: ['....##..#.', '...###...#', '######.#.#', '######.#.#', '######.#.#', '######.#.#', '######.#.#', '...###...#', '....##..#.', '..........'],
  mute: ['....##....', '...###....', '######.#.#', '######..#.', '######.#.#', '######....', '######....', '...###....', '....##....', '..........'],
  people: ['..###..##.', '.#####.###', '.#####.###', '..###..##.', '..........', '.#####.##.', '##########', '##########', '##...##.##', '##...##.##'],
  plus: ['....##....', '....##....', '....##....', '....##....', '##########', '##########', '....##....', '....##....', '....##....', '....##....'],
  minus: ['..........', '..........', '..........', '..........', '##########', '##########', '..........', '..........', '..........', '..........'],
  fit: ['####..####', '#........#', '#........#', '#........#', '..........', '..........', '#........#', '#........#', '#........#', '####..####'],
  check: ['..........', '........##', '.......##.', '......##..', '.....##...', '##..##....', '.####.....', '..##......', '..........', '..........'],
  flag: ['##........', '########..', '##########', '##########', '##########', '##..######', '##........', '##........', '##........', '##........'],
  gear: ['...####...', '.########.', '##########', '###....###', '###.##.###', '###.##.###', '###....###', '##########', '.########.', '...####...'],
  link: ['......###.', '.....#...#', '....#..#.#', '...#..#..#', '.....#..#.', '.#..#.....', '#..#..#...', '#.#..#....', '#...#.....', '.###......'],
  chest: ['..######..', '.########.', '##########', '#..#..#..#', '##########', '#..####..#', '#...##...#', '#........#', '#........#', '##########'],
  leaf: ['.....#####', '...#######', '..########', '.########.', '.#######..', '######....', '#####.....', '###.......', '##........', '#.........'],
  music: ['...#######', '...#######', '...#.....#', '...#.....#', '...#.....#', '...#.....#', '.###...###', '####..####', '.##....##.', '..........'],
  eye: ['..........', '...####...', '.##....##.', '#..####..#', '#..####..#', '#..####..#', '.##....##.', '...####...', '..........', '..........'],
};
export function PixelIcon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  const bitmap = name === 'back' ? ICONS.arrow.map(row => [...row].reverse().join('')) : ICONS[name] || ICONS.spark;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true" className={className}>{bitmap.flatMap((row, y) => [...row].map((cell, x) => cell === '#' ? <rect key={`${x}-${y}`} x={2 + x * 2} y={2 + y * 2} width="2" height="2"/> : null))}</svg>;
}
