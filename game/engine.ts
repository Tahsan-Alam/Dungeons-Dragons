import type { Actor, GameAction, GameEvent, GameOptions, GameState, HeroClass, PlayerSpec, Tile } from './types';

// This module deliberately has no network, clock, browser, or model dependencies.
// A saved state contains its random generator, so the same action is reproducible.
const WIDTH = 20;
const HEIGHT = 14;
const MAX_EVENTS = 180;
const CLASS = {
  knight: { hp: 28, ac: 16, bonus: 5, die: 8, range: 1, speed: 6 },
  ranger: { hp: 23, ac: 14, bonus: 5, die: 6, range: 5, speed: 7 },
  mage: { hp: 20, ac: 12, bonus: 5, die: 8, range: 4, speed: 6 },
  cleric: { hp: 25, ac: 15, bonus: 4, die: 6, range: 1, speed: 6 },
} as const;
const SCENES = {
  woodland: ['The Lanternwood', 'Bramble Crossing', 'The Moonwell'],
  ruins: ['The Fallen Courtyard', 'The Sunken Archive', 'The Star Chamber'],
  coast: ['Saltwind Landing', 'The Tideglass Steps', 'The Beacon Isle'],
};
const ENEMIES = {
  woodland: ['Bramble imp', 'Moss goblin', 'Thornling', 'Root guardian'],
  ruins: ['Ink wisp', 'Clay sentinel', 'Vault imp', 'Paper golem'],
  coast: ['Shell bandit', 'Tide imp', 'Crab knight', 'Salt wisp'],
};
const manhattan = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const key = (x: number, y: number) => `${x},${y}`;
const neighbors = (x: number, y: number) => [{ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 }];

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) { h ^= value.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0 || 1;
}

function random(game: GameState): number {
  let x = game.rng;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  game.rng = x >>> 0 || 1;
  return game.rng / 4294967296;
}

function die(game: GameState, sides: number) { return Math.floor(random(game) * sides) + 1; }

function event(game: GameState, kind: GameEvent['kind'], text: string, actorId?: string, roll?: number, attack?: GameEvent['attack']) {
  game.events.push({ id: ++game.eventSequence, kind, text, ...(actorId ? { actorId } : {}), ...(roll !== undefined ? { roll } : {}), ...(attack ? {attack} : {}) });
  if (game.events.length > MAX_EVENTS) game.events.splice(0, game.events.length - MAX_EVENTS);
}

function walkable(game: GameState, x: number, y: number) {
  const tile = game.tiles[y * game.width + x];
  return x >= 0 && y >= 0 && x < game.width && y < game.height && !!tile && tile.kind !== 'wall' && tile.kind !== 'water';
}

function occupied(game: GameState, x: number, y: number, ignoreId?: string) {
  return game.actors.some(a => a.id !== ignoreId && !a.defeated && a.x === x && a.y === y);
}

function search(game: GameState, actor: Actor, limit = actor.movement) {
  const distances = new Map<string, number>([[key(actor.x, actor.y), 0]]);
  const positions = [{ x: actor.x, y: actor.y }];
  for (let i = 0; i < positions.length; i++) {
    const p = positions[i];
    const distance = distances.get(key(p.x, p.y))!;
    if (distance >= limit) continue;
    for (const n of neighbors(p.x, p.y)) {
      const k = key(n.x, n.y);
      if (distances.has(k) || !walkable(game, n.x, n.y) || occupied(game, n.x, n.y, actor.id)) continue;
      distances.set(k, distance + 1);
      positions.push(n);
    }
  }
  return { positions, distances };
}

/** Cardinal movement: every square is five feet. Living/downed actors block movement. */
export function getReachable(game: GameState, actor: Actor): { x: number; y: number }[] {
  if (game.status !== 'playing' || actor.hp <= 0 || actor.defeated) return [];
  return search(game, actor).positions.filter(p => p.x !== actor.x || p.y !== actor.y);
}

/** Walls block ranged attacks; water and low decoration do not. */
export function hasLineOfSight(game: GameState, a: { x: number; y: number }, b: { x: number; y: number }) {
  let x = a.x, y = a.y;
  const dx = Math.abs(b.x - x), dy = Math.abs(b.y - y), sx = x < b.x ? 1 : -1, sy = y < b.y ? 1 : -1;
  let error = dx - dy;
  while (x !== b.x || y !== b.y) {
    const twice = 2 * error;
    if (twice > -dy) { error -= dy; x += sx; }
    if (twice < dx) { error += dx; y += sy; }
    if (game.tiles[y * game.width + x]?.kind === 'wall') return false;
  }
  return true;
}

export function getValidTargets(game: GameState, actor: Actor, ability = false): Actor[] {
  if (game.status !== 'playing' || actor.hp <= 0 || actor.actionUsed || actor.defeated || (ability && actor.abilityUses < 1)) return [];
  const healing = ability && actor.heroClass === 'cleric' && !actor.enemy;
  const range = healing ? 4 : CLASS[actor.heroClass].range + (ability && actor.heroClass === 'ranger' ? 2 : 0);
  return game.actors.filter(target => !target.defeated && (healing ? target.enemy === actor.enemy && target.hp < target.maxHp : target.enemy !== actor.enemy && target.hp > 0)
    && manhattan(actor, target) <= range && hasLineOfSight(game, actor, target));
}

function makeMap(game: GameState) {
  const { biome } = game.options;
  game.tiles = [];
  const bend = game.scene === 1 ? -1 : game.scene === 2 ? 1 : 0;
  for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
    const border = x === 0 || y === 0 || x === WIDTH - 1 || y === HEIGHT - 1;
    const centerY = 7 + (x > 6 && x < 14 ? bend : 0);
    const road = Math.abs(y - centerY) <= 1;
    const clearing = (x <= 5 && y >= 3 && y <= 11) || (x >= 13 && y >= 3 && y <= 11) || (x >= 8 && x <= 11 && y >= 4 && y <= 10);
    const tile: Tile = { x, y, kind: border ? 'wall' : road ? 'path' : 'grass' };
    if (border) tile.decoration = biome === 'woodland' ? 'tree' : biome === 'ruins' ? 'ruin' : 'rock';
    else if (!road && !clearing && random(game) < 0.4) {
      tile.kind = biome === 'coast' && random(game) < 0.7 ? 'water' : 'wall';
      if (tile.kind === 'wall') tile.decoration = biome === 'woodland' ? 'tree' : biome === 'ruins' ? 'ruin' : 'rock';
    } else if (!road && random(game) < 0.13) tile.decoration = biome === 'woodland' ? (random(game) < 0.5 ? 'flower' : 'mushroom') : 'rock';
    game.tiles.push(tile);
  }
  game.exit = { x: 18, y: 7 };
  game.chest = { x: 10, y: 7 + bend, opened: false };
  // Remove isolated decorative pockets, preserving a single connected playing area.
  const visited = new Set<string>();
  const queue = [{ x: 2, y: 7 }];
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i], k = key(p.x, p.y);
    if (visited.has(k) || !walkable(game, p.x, p.y)) continue;
    visited.add(k);
    queue.push(...neighbors(p.x, p.y));
  }
  for (const tile of game.tiles) if (tile.kind !== 'wall' && tile.kind !== 'water' && !visited.has(key(tile.x, tile.y))) {
    tile.kind = 'wall'; tile.decoration = biome === 'woodland' ? 'tree' : 'rock';
  }
}

function setupScene(game: GameState) {
  makeMap(game);
  game.sceneName = SCENES[game.options.biome][game.scene];
  game.objective = 'Defeat the guardians, collect the lantern shard, then reach the gateway.';
  const heroes = game.actors.filter(a => !a.enemy);
  const spawn = [{ x: 3, y: 7 }, { x: 2, y: 6 }, { x: 2, y: 8 }, { x: 3, y: 5 }, { x: 3, y: 9 }, { x: 2, y: 4 }, { x: 2, y: 10 }, { x: 4, y: 6 }, { x: 4, y: 8 }, { x: 4, y: 4 }];
  heroes.forEach((a, i) => {
    a.x = spawn[i].x; a.y = spawn[i].y;
    a.hp = Math.min(a.maxHp, Math.max(Math.ceil(a.maxHp / 2), a.hp + Math.ceil(a.maxHp * 0.35)));
    a.defeated = false; a.deathFailures = 0; a.deathSuccesses = 0; a.guarding = false;
    a.potions = Math.max(2, a.potions); a.abilityUses = 2;
  });
  game.actors = heroes;
  const count = Math.min(8, Math.max(2, Math.ceil(heroes.length * 0.75) + (game.scene === 2 ? 1 : 0)));
  const enemySpawn = [{ x: 14, y: 7 }, { x: 15, y: 5 }, { x: 15, y: 9 }, { x: 17, y: 6 }, { x: 17, y: 8 }, { x: 14, y: 4 }, { x: 14, y: 10 }, { x: 16, y: 11 }];
  for (let i = 0; i < count; i++) {
    const boss = game.scene === 2 && i === count - 1;
    const hp = (game.options.rules === 'simple' ? 9 : 12) + game.scene * 3 + (boss ? 8 : 0);
    const heroClass: HeroClass = i % 3 === 1 ? 'ranger' : 'knight';
    game.actors.push({ id: `enemy-${game.scene}-${i}`, name: boss ? 'The Hollow Keeper' : `${ENEMIES[game.options.biome][i % 4]} ${i + 1}`,
      heroClass, color: boss ? '#ab769d' : '#9ead7e', enemy: true, bot: true, ...enemySpawn[i], hp, maxHp: hp,
      ac: game.options.rules === 'simple' ? 10 : 12, speed: 4, movement: 4, actionUsed: false, guarding: false, potions: 0,
      abilityUses: 0, initiative: 0, deathSuccesses: 0, deathFailures: 0, defeated: false });
  }
  for (const a of game.actors) a.initiative = die(game, 20) + (a.heroClass === 'ranger' ? 3 : 1);
  // The streamlined mode lets the party act first, avoiding a confusing opening barrage.
  game.turnOrder = [...game.actors].sort((a, b) => game.options.rules === 'simple' && a.enemy !== b.enemy ? Number(a.enemy) - Number(b.enemy) : b.initiative - a.initiative || a.id.localeCompare(b.id)).map(a => a.id);
  game.round = 1;
  game.activeActorId = game.turnOrder[0];
  for (const a of game.actors) { a.actionUsed = false; a.movement = a.speed; }
  const openings = {
    warm: [
      `A crooked little path leads into ${game.sceneName}. Three lost lantern shards could bring light back to these lands. Your first is close.`,
      `Your lantern glows a little brighter. Ahead, ${game.sceneName} rustles with secrets—and a few rather unfriendly guardians.`,
      `At last, ${game.sceneName}. The final shard is waiting. Stand together, and even the longest night can end.`,
    ],
    dramatic: [
      `${game.sceneName}. The lantern has shattered, and the dark is taking root. Three shards. One fellowship. Your story begins here.`,
      `A single shard burns against the darkness. Beyond lies ${game.sceneName}; its guardians will not yield willingly.`,
      `The Hollow Keeper rises in ${game.sceneName}. Claim the final shard, rekindle the lantern, and write the ending yourselves.`,
    ],
    wry: [
      `Welcome to ${game.sceneName}. The local lantern broke, the guardians are grumpy, and somehow this is your problem now. Find three shards.`,
      `${game.sceneName}: lovely scenery, terrible hospitality. On the bright side, the lantern is one-third less broken.`,
      `The last shard is in ${game.sceneName}. The Hollow Keeper has prepared a speech. You needn't let it finish.`,
    ],
  };
  event(game, 'story', openings[game.options.narrator][game.scene]);
  if (game.options.rules === 'classic') event(game, 'system', 'Initiative rolled. Each turn: move up to your speed, take one action, then end your turn.');
}

export function createGame(players: PlayerSpec[], options: GameOptions): GameState {
  if (!Array.isArray(players) || players.length < 1 || players.length > 10) throw new Error('An adventure needs 1–10 heroes.');
  if (new Set(players.map(p => p.id)).size !== players.length) throw new Error('Each hero needs a unique player ID.');
  if (!['simple', 'classic'].includes(options.rules) || !['woodland', 'ruins', 'coast'].includes(options.biome) || !['warm', 'dramatic', 'wry'].includes(options.narrator)) throw new Error('Choose valid adventure settings.');
  if (typeof options.seed !== 'string' || options.seed.length > 120) throw new Error('Use a seed of 120 characters or fewer.');
  const game: GameState = { schemaVersion: 1, options: { ...options }, rng: hash(`${options.seed}|${options.biome}`), status: 'playing', width: WIDTH, height: HEIGHT,
    tiles: [], actors: [], activeActorId: '', turnOrder: [], round: 1, scene: 0, sceneName: '', objective: '', relics: 0,
    exit: { x: 18, y: 7 }, chest: { x: 10, y: 7, opened: false }, events: [], eventSequence: 0 };
  for (const p of players) {
    if (!Object.hasOwn(CLASS, p.heroClass) || typeof p.name !== 'string' || !p.name.trim()) throw new Error('Each hero needs a name and a supported class.');
    const stats = CLASS[p.heroClass];
    game.actors.push({ id: `hero-${p.id}`, playerId: p.id, name: p.name.trim().slice(0, 24), heroClass: p.heroClass, color: p.color,
      enemy: false, bot: p.bot, x: 0, y: 0, hp: stats.hp, maxHp: stats.hp, ac: stats.ac, speed: stats.speed, movement: stats.speed,
      actionUsed: false, guarding: false, potions: 2, abilityUses: 2, initiative: 0, deathSuccesses: 0, deathFailures: 0, defeated: false });
  }
  setupScene(game);
  return game;
}

function isEncounterClear(game: GameState) { return !game.actors.some(a => a.enemy && a.hp > 0); }
export function encounterCleared(game: GameState) { return isEncounterClear(game); }

export interface QuestAction {
  type: 'interact' | 'advance';
  label: 'Loot chest' | 'Next chapter' | 'Finish adventure';
  available: boolean;
  hint: string;
}

/** Quest interactions cost no action or movement, but require the active hero nearby. */
export function getQuestAction(game: GameState, actor?: Actor | null): QuestAction | null {
  if (!actor || game.status !== 'playing' || !isEncounterClear(game)) return null;
  const advancing = game.chest.opened, final = game.scene === 2;
  const destination = advancing ? game.exit : game.chest;
  const nearby = manhattan(actor, destination) <= 1;
  const available = actor.id === game.activeActorId && actor.hp > 0 && !actor.defeated && nearby;
  const hint = actor.hp <= 0 || actor.defeated ? 'Your hero is down and cannot act.'
    : actor.id !== game.activeActorId ? 'Wait for your turn.'
    : !nearby ? advancing ? `Move beside the gateway to ${final ? 'finish the adventure' : 'continue'}.` : 'Move beside the chest to loot it.'
    : advancing ? final ? 'Enter the gateway to finish the adventure.' : 'Enter the gateway to begin the next chapter.' : 'Loot the chest to collect the lantern shard.';
  return {type: advancing ? 'advance' : 'interact', label: advancing ? final ? 'Finish adventure' : 'Next chapter' : 'Loot chest', available, hint};
}

function evaluate(game: GameState) {
  if (game.status !== 'playing') return;
  if (game.actors.filter(a => !a.enemy).every(a => a.hp <= 0)) {
    game.status = 'defeat';
    event(game, 'story', 'The lantern dims as the party falls. This chapter ends here—but another adventure is only a new seed away.');
  } else if (isEncounterClear(game)) {
    game.objective = game.chest.opened ? 'Bring the lantern shard to the glowing gateway.' : 'The guardians are gone. Open the chest to collect a lantern shard.';
    for (const ally of game.actors.filter(a => !a.enemy && a.hp <= 0)) {
      ally.hp = Math.ceil(ally.maxHp / 2); ally.defeated = false; ally.deathFailures = 0; ally.deathSuccesses = 0;
      event(game, 'system', `The lantern revives ${ally.name} as the encounter ends.`);
    }
  }
}

function beginTurn(game: GameState, actor: Actor) {
  actor.movement = actor.speed; actor.actionUsed = false; actor.guarding = false;
  if (actor.hp <= 0 && !actor.defeated && game.options.rules === 'classic') {
    const result = die(game, 20);
    if (result === 20) {
      actor.hp = 1; actor.deathSuccesses = 0; actor.deathFailures = 0;
      event(game, 'roll', `${actor.name} rolls a natural 20 on a death save and returns with 1 HP.`, actor.id, result);
    } else {
      if (result >= 10) actor.deathSuccesses++;
      else actor.deathFailures += result === 1 ? 2 : 1;
      if (actor.deathFailures >= 3) actor.defeated = true;
      event(game, 'roll', `${actor.name}'s death save: ${result}. ${actor.deathSuccesses} successes, ${actor.deathFailures} failures.${actor.defeated ? ' Out until the encounter ends.' : actor.deathSuccesses >= 3 ? ' Stable, but still unconscious.' : ''}`, actor.id, result);
    }
  }
}

function nextTurn(game: GameState) {
  evaluate(game);
  if (game.status !== 'playing') return;
  let index = game.turnOrder.indexOf(game.activeActorId);
  // A full pass can include downed heroes, who receive their death saves then skip.
  for (let i = 0; i <= game.turnOrder.length; i++) {
    index = (index + 1) % game.turnOrder.length;
    if (index === 0) game.round++;
    const actor = game.actors.find(a => a.id === game.turnOrder[index]);
    if (!actor || actor.defeated || (actor.enemy && actor.hp <= 0)) continue;
    game.activeActorId = actor.id;
    if (actor.hp <= 0 && (game.options.rules === 'simple' || actor.deathSuccesses >= 3)) continue;
    beginTurn(game, actor);
    if (actor.hp > 0) return;
  }
  evaluate(game);
}

function strike(game: GameState, actor: Actor, target: Actor, ability: boolean) {
  const stats = CLASS[actor.heroClass];
  const first = die(game, 20);
  const advantage = ability && actor.heroClass === 'ranger';
  const disadvantage = target.guarding;
  const second = advantage !== disadvantage ? die(game, 20) : first;
  const roll = advantage && !disadvantage ? Math.max(first, second) : disadvantage && !advantage ? Math.min(first, second) : first;
  const bonus = actor.enemy ? 3 : stats.bonus;
  const hit = game.options.rules === 'simple' ? roll !== 1 : roll === 20 || (roll !== 1 && roll + bonus >= target.ac);
  actor.actionUsed = true;
  if (ability) actor.abilityUses--;
  if (!hit) {
    event(game, 'roll', `${actor.name} rolls ${roll}${game.options.rules === 'classic' ? ` + ${bonus} vs AC ${target.ac}` : ''} and misses ${target.name}.`, actor.id, roll, {targetId:target.id,action:ability?'ability':'attack',hit:false,critical:false,damage:0});
    return;
  }
  const damageDie = actor.enemy ? 4 : stats.die;
  let damage = die(game, damageDie) + (actor.enemy ? 1 : 3);
  if (roll === 20) damage += die(game, damageDie);
  if (ability) damage += actor.heroClass === 'knight' ? 5 : 4;
  if (game.options.rules === 'simple' && target.guarding) damage = Math.max(1, Math.floor(damage / 2));
  target.hp = Math.max(0, target.hp - damage);
  event(game, 'roll', `${actor.name} ${ability ? 'uses a special attack on' : 'hits'} ${target.name} for ${damage} damage${roll === 20 ? ' — critical hit!' : '.'} (d20: ${roll})`, actor.id, roll, {targetId:target.id,action:ability?'ability':'attack',hit:true,critical:roll===20,damage});
  if (target.hp === 0) {
    target.defeated = target.enemy;
    target.deathSuccesses = 0; target.deathFailures = 0;
    event(game, 'action', `${target.name} ${target.enemy ? 'is defeated.' : 'is down! Healing light can get them back up.'}`, target.id);
  }
}

function perform(game: GameState, actor: Actor, action: GameAction) {
  if (action.type === 'move') {
    if (!Number.isInteger(action.x) || !Number.isInteger(action.y)) throw new Error('Choose a square on the board.');
    const distance = search(game, actor).distances.get(key(action.x, action.y));
    if (distance === undefined || distance < 1) throw new Error('That square is blocked or beyond your remaining movement.');
    actor.x = action.x; actor.y = action.y; actor.movement -= distance;
    event(game, 'action', `${actor.name} moves ${distance * 5} feet.`, actor.id);
  } else if (action.type === 'attack' || action.type === 'ability') {
    if (actor.actionUsed) throw new Error('Your action is used. You can still move or end your turn.');
    if (action.type === 'ability' && actor.abilityUses < 1) throw new Error('No ability uses left in this encounter.');
    const target = getValidTargets(game, actor, action.type === 'ability').find(a => a.id === action.targetId);
    if (!target) throw new Error('Choose a valid target in range with a clear line of sight.');
    if (action.type === 'ability' && actor.heroClass === 'cleric' && !actor.enemy) {
      const amount = Math.min(target.maxHp - target.hp, die(game, 8) + 7);
      target.hp += amount; target.deathSuccesses = 0; target.deathFailures = 0;
      actor.abilityUses--; actor.actionUsed = true;
      event(game, 'action', `${actor.name}'s healing light restores ${amount} HP to ${target.name}.`, actor.id);
    } else strike(game, actor, target, action.type === 'ability');
  } else if (action.type === 'guard') {
    if (actor.actionUsed) throw new Error('Your action is already used.');
    actor.guarding = true; actor.actionUsed = true;
    event(game, 'action', `${actor.name} guards until their next turn. Attacks against them have disadvantage.`, actor.id);
  } else if (action.type === 'potion') {
    if (actor.actionUsed) throw new Error('Drinking a potion uses your action.');
    if (actor.potions < 1) throw new Error('You have no healing potions left.');
    if (actor.hp === actor.maxHp) throw new Error('You are already at full health.');
    const amount = Math.min(actor.maxHp - actor.hp, die(game, 4) + die(game, 4) + 6);
    actor.hp += amount; actor.potions--; actor.actionUsed = true;
    event(game, 'action', `${actor.name} drinks a potion and recovers ${amount} HP.`, actor.id);
  } else if (action.type === 'interact') {
    if (!isEncounterClear(game)) throw new Error('Defeat the guardians before opening the shard chest.');
    if (game.chest.opened) throw new Error('The shard is collected. Head to the gateway.');
    if (!getQuestAction(game, actor)?.available) throw new Error('Move next to the chest first.');
    game.chest.opened = true; game.relics++;
    for (const a of game.actors.filter(a => !a.enemy)) a.potions = Math.min(3, a.potions + 1);
    event(game, 'story', `${actor.name} lifts a lantern shard from the chest. ${game.relics} of 3 recovered! The gateway flickers awake, and everyone finds a fresh potion.`, actor.id);
    game.objective = 'Bring the lantern shard to the glowing gateway.';
  } else if (action.type === 'advance') {
    if (!isEncounterClear(game) || !game.chest.opened) throw new Error('Collect the lantern shard before leaving.');
    if (!getQuestAction(game, actor)?.available) throw new Error('Move next to the glowing gateway first.');
    if (game.scene === 2) {
      game.status = 'victory';
      game.objective = 'The lantern is whole. Adventure complete!';
      event(game, 'story', 'Three shards become one warm light. The Hollow Keeper fades, the paths bloom again, and your party carries a new story home. Adventure complete!');
    } else {
      game.scene++;
      event(game, 'system', 'The party takes a breather: some health restored, powers refreshed, and at least two potions each.');
      setupScene(game);
    }
  } else if (action.type === 'end') {
    nextTurn(game);
  } else throw new Error('That action is not supported.');
  evaluate(game);
}

/** Apply a human-controlled action to a copy. Invalid requests never mutate the input. */
export function applyAction(game: GameState, actorPlayerId: string, action: GameAction): GameState {
  if (game.status !== 'playing') throw new Error('This adventure is over. Start a new one to play again.');
  const active = game.actors.find(a => a.id === game.activeActorId);
  if (!active || active.playerId !== actorPlayerId || active.bot || active.enemy) throw new Error('It is not your turn.');
  if (active.hp <= 0 || active.defeated) throw new Error('Your hero is down and cannot act.');
  const copy = structuredClone(game);
  perform(copy, copy.actors.find(a => a.id === active.id)!, action);
  return copy;
}

type FrameObserver=(game:GameState)=>void;
function approach(game: GameState, actor: Actor, target: { x: number; y: number }, desiredRange: number, observe?:FrameObserver) {
  const candidates = search(game, actor).positions;
  const best = candidates.sort((a, b) => {
    const score = (p: { x: number; y: number }) => Math.max(0, manhattan(p, target) - desiredRange) * 100 + (hasLineOfSight(game, p, target) ? 0 : 20) + manhattan(actor, p);
    return score(a) - score(b);
  })[0];
  if (best && (best.x !== actor.x || best.y !== actor.y)) {perform(game, actor, { type: 'move', ...best });observe?.(structuredClone(game));}
}

function botTurn(game: GameState, actor: Actor, observe?:FrameObserver) {
  if (!actor.enemy && isEncounterClear(game)) {
    const destination = game.chest.opened ? game.exit : game.chest;
    approach(game, actor, destination, 1, observe);
    if (manhattan(actor, destination) <= 1) perform(game, actor, { type: game.chest.opened ? 'advance' : 'interact' });
    return;
  }
  if (!actor.enemy && actor.heroClass === 'cleric' && actor.abilityUses > 0) {
    const ally = game.actors.filter(a => !a.enemy && !a.defeated && a.hp < a.maxHp * 0.65).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (ally) {
      approach(game, actor, ally, 4, observe);
      if (getValidTargets(game, actor, true).some(a => a.id === ally.id)) { perform(game, actor, { type: 'ability', targetId: ally.id }); return; }
    }
  }
  if (!actor.enemy && actor.hp < actor.maxHp * 0.35 && actor.potions > 0) { perform(game, actor, { type: 'potion' }); return; }
  const enemies = game.actors.filter(a => a.enemy !== actor.enemy && a.hp > 0 && !a.defeated);
  const target = enemies.sort((a, b) => manhattan(actor, a) - manhattan(actor, b) || a.hp - b.hp)[0];
  if (!target) return;
  approach(game, actor, target, CLASS[actor.heroClass].range, observe);
  const available = getValidTargets(game, actor).sort((a, b) => a.hp - b.hp);
  if (available.length) {
    const special = !actor.enemy && actor.heroClass !== 'cleric' && actor.abilityUses > 0 && available[0].hp > 7;
    perform(game, actor, { type: special ? 'ability' : 'attack', targetId: available[0].id });
  } else if (!actor.actionUsed) perform(game, actor, { type: 'guard' });
}

/** Run scripted turns without timers. This remains authoritative on the room server. */
export function runBots(game: GameState, observe?:FrameObserver): GameState {
  const copy = structuredClone(game);
  // In normal play this performs at most 17 turns. The larger bound accommodates
  // recovery when the human is down, without permitting an unbounded request.
  for (let i = 0; i < 240 && copy.status === 'playing'; i++) {
    const actor = copy.actors.find(a => a.id === copy.activeActorId);
    if (!actor) break;
    if (!actor.bot && !actor.enemy && actor.hp > 0 && !actor.defeated) break;
    const sceneBefore = copy.scene;
    if (actor.hp > 0 && !actor.defeated) botTurn(copy, actor, observe);
    evaluate(copy);
    observe?.(structuredClone(copy));
    if (copy.status !== 'playing') break;
    // Advancing has already selected the new scene's first actor.
    if (copy.scene === sceneBefore) {nextTurn(copy);observe?.(structuredClone(copy));}
  }
  return copy;
}
