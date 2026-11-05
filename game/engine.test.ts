import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-ignore Node's built-in TypeScript runner needs the explicit source extension.
import { applyAction, createGame, encounterCleared, getQuestAction, getReachable, getValidTargets, runBots } from './engine.ts';
import type { GameState, GameOptions, PlayerSpec } from './types';

const options: GameOptions = { rules: 'simple', seed: 'engine-verification', narrator: 'warm', biome: 'woodland', companions: 0 };
const player: PlayerSpec = { id: 'p1', name: 'Clover', heroClass: 'knight', color: '#ef997c', bot: false };
const newGame = () => runBots(createGame([player], options));
function active(game: GameState) { return game.actors.find(a => a.id === game.activeActorId)!; }
function clearEnemies(game: GameState) { for (const a of game.actors.filter(a => a.enemy)) { a.hp = 0; a.defeated = true; } }

test('seed gives identical maps, dice state, actors and stories; different seeds vary maps', () => {
  assert.deepEqual(createGame([player], options), createGame([player], options));
  assert.notDeepEqual(createGame([player], options).tiles, createGame([player], { ...options, seed: 'different' }).tiles);
});

test('every walkable square is connected; all spawns and objectives are walkable', () => {
  for (const biome of ['woodland', 'ruins', 'coast'] as const) for (let i = 0; i < 10; i++) {
    const game = createGame([player], { ...options, biome, seed: String(i) });
    const hero = game.actors[0];
    const clear = structuredClone(game);
    clear.actors = [clear.actors[0]];
    clear.actors[0].movement = 1000;
    const reachable = getReachable(clear, clear.actors[0]);
    const walkable = game.tiles.filter(t => t.kind === 'grass' || t.kind === 'path');
    assert.equal(reachable.length + 1, walkable.length);
    for (const position of [...game.actors, game.chest, game.exit]) {
      assert.ok(walkable.some(t => t.x === position.x && t.y === position.y));
    }
    assert.ok(hero.hp > 0);
  }
});

test('invalid movement and out-of-turn actions leave the entire input unchanged', () => {
  const game = newGame(), before = structuredClone(game);
  assert.throws(() => applyAction(game, 'intruder', { type: 'end' }), /not your turn/);
  assert.throws(() => applyAction(game, player.id, { type: 'move', x: 0, y: 0 }), /blocked/);
  assert.throws(() => applyAction(game, player.id, { type: 'move', x: 2.5, y: 7 }), /square/);
  assert.deepEqual(game, before);
});

test('legal movement consumes path distance and never overwrites the input', () => {
  const game = newGame(), hero = active(game), move = getReachable(game, hero)[0];
  const next = applyAction(game, player.id, { type: 'move', ...move });
  assert.equal(active(next).movement, hero.movement - 1);
  assert.notEqual(next, game);
  assert.equal(hero.x, 3);
  assert.equal(hero.y, 7);
});

test('occupied destinations and out-of-range attacks are rejected', () => {
  const game = newGame();
  const enemy = game.actors.find(a => a.enemy)!;
  assert.throws(() => applyAction(game, player.id, { type: 'move', x: enemy.x, y: enemy.y }), /blocked/);
  assert.throws(() => applyAction(game, player.id, { type: 'attack', targetId: enemy.id }), /valid target/);
});

test('one action per turn; guard clears when the next own turn starts', () => {
  const game = newGame();
  const guarded = applyAction(game, player.id, { type: 'guard' });
  assert.ok(active(guarded).guarding);
  assert.throws(() => applyAction(guarded, player.id, { type: 'guard' }), /already used/);
  const next = runBots(applyAction(guarded, player.id, { type: 'end' }));
  assert.equal(active(next).playerId, player.id);
  assert.equal(active(next).guarding, false);
  assert.equal(active(next).actionUsed, false);
  assert.ok(next.round > game.round);
});

test('healing power revives a downed ally and consumes exactly one use/action', () => {
  const cleric = { ...player, heroClass: 'cleric' as const };
  const game = createGame([cleric, { ...player, id: 'p2', name: 'Rowan' }], options);
  const healer = game.actors[0], ally = game.actors[1];
  game.activeActorId = healer.id;
  ally.hp = 0;
  assert.ok(getValidTargets(game, healer, true).some(a => a.id === ally.id));
  const next = applyAction(game, player.id, { type: 'ability', targetId: ally.id });
  assert.ok(next.actors[1].hp > 0);
  assert.equal(next.actors[0].abilityUses, 1);
  assert.ok(next.actors[0].actionUsed);
  assert.equal(ally.hp, 0);
});

test('potion consumes one action and inventory item, and cannot be wasted at full HP', () => {
  const game = newGame();
  assert.throws(() => applyAction(game, player.id, { type: 'potion' }), /full health/);
  active(game).hp = 2;
  const next = applyAction(game, player.id, { type: 'potion' });
  assert.equal(active(next).potions, 1);
  assert.ok(active(next).hp > 2);
  assert.ok(active(next).actionUsed);
});

test('walls block ranged targeting', () => {
  const game = createGame([{ ...player, heroClass: 'ranger' }], options);
  const hero = game.actors[0], enemy = game.actors.find(a => a.enemy)!;
  enemy.x = hero.x + 3; enemy.y = hero.y;
  assert.ok(getValidTargets(game, hero).some(a => a.id === enemy.id));
  game.tiles[hero.y * game.width + hero.x + 1].kind = 'wall';
  assert.ok(!getValidTargets(game, hero).some(a => a.id === enemy.id));
});

test('objective requires clear encounter, adjacency, shard, and three completed scenes', () => {
  let game = newGame();
  assert.throws(() => applyAction(game, player.id, { type: 'interact' }), /guardians/);
  assert.throws(() => applyAction(game, player.id, { type: 'advance' }), /Collect/);
  for (let scene = 0; scene < 3; scene++) {
    clearEnemies(game);
    assert.ok(encounterCleared(game));
    assert.throws(() => applyAction(game, player.id, { type: 'interact' }), /next to the chest/);
    active(game).x = game.chest.x - 1; active(game).y = game.chest.y;
    game = applyAction(game, player.id, { type: 'interact' });
    assert.equal(game.relics, scene + 1);
    assert.throws(() => applyAction(game, player.id, { type: 'advance' }), /gateway/);
    active(game).x = game.exit.x - 1; active(game).y = game.exit.y;
    game = runBots(applyAction(game, player.id, { type: 'advance' }));
  }
  assert.equal(game.status, 'victory');
  assert.throws(() => applyAction(game, player.id, { type: 'end' }), /over/);
});

test('a defeated party has a terminal state instead of an infinite bot turn', () => {
  const game = newGame();
  for (const hero of game.actors.filter(a => !a.enemy)) hero.hp = 0;
  const result = runBots(game);
  assert.equal(result.status, 'defeat');
  assert.match(result.events.at(-1)!.text, /party falls/);
});

test('quest guidance agrees with accepted chest and gateway actions across both rule modes', () => {
  for (const rules of ['simple', 'classic'] as const) {
    let game = createGame([player], {...options, rules});
    game.activeActorId = game.actors[0].id;
    assert.equal(getQuestAction(game, active(game)), null);
    clearEnemies(game);
    const before = structuredClone(game);
    const distant = getQuestAction(game, active(game))!;
    assert.deepEqual(distant, {type:'interact', label:'Loot chest', available:false, hint:'Move beside the chest to loot it.'});
    assert.deepEqual(game, before, 'reading guidance must not mutate the game');
    assert.throws(() => applyAction(game, player.id, {type:distant.type}), /next to the chest/);
    const hero = active(game);
    hero.x = game.chest.x - 1; hero.y = game.chest.y;
    hero.actionUsed = true; hero.movement = 0;
    const loot = getQuestAction(game, hero)!;
    assert.equal(loot.available, true, 'looting requires neither an action nor movement');
    game = applyAction(game, player.id, {type:loot.type});
    assert.equal(game.chest.opened, true);
    assert.equal(active(game).actionUsed, true);
    assert.equal(getQuestAction(game, active(game))!.type, 'advance');
    assert.equal(getQuestAction(game, active(game))!.available, false);
    assert.equal(getQuestAction(game, active(game))!.hint, 'Move beside the gateway to continue.');
    assert.throws(() => applyAction(game, player.id, {type:'interact'}), /shard is collected/);
    assert.throws(() => applyAction(game, player.id, {type:'advance'}), /next to the glowing gateway/);
    active(game).x = game.exit.x - 1; active(game).y = game.exit.y;
    assert.equal(getQuestAction(game, active(game))!.available, true);
    assert.equal(getQuestAction(game, active(game))!.label, 'Next chapter');
    assert.equal(applyAction(game, player.id, {type:'advance'}).scene, 1);
  }
});

test('quest availability rejects inactive and downed heroes and missing or terminal games', () => {
  const game = createGame([player, {...player, id:'p2', name:'Rowan'}], options);
  clearEnemies(game);
  const hero = game.actors[0]; game.activeActorId = hero.id;
  hero.x = game.chest.x - 1; hero.y = game.chest.y;
  assert.equal(getQuestAction(game, undefined), null);
  assert.equal(getQuestAction(game, null), null);
  assert.equal(getQuestAction(game, hero)!.available, true);
  game.activeActorId = game.actors[1].id;
  assert.equal(getQuestAction(game, hero)!.available, false);
  assert.throws(() => applyAction(game, player.id, {type:'interact'}), /not your turn/);
  game.activeActorId = hero.id;
  hero.hp = 0;
  assert.equal(getQuestAction(game, hero)!.available, false);
  assert.throws(() => applyAction(game, player.id, {type:'interact'}), /down and cannot act/);
  hero.hp = 1; hero.defeated = true;
  assert.equal(getQuestAction(game, hero)!.available, false);
  assert.throws(() => applyAction(game, player.id, {type:'interact'}), /down and cannot act/);
  hero.defeated = false;
  for (const status of ['victory', 'defeat'] as const) {
    game.status = status;
    assert.equal(getQuestAction(game, hero), null);
  }
});

test('quest proximity is cardinal and permits an occupied objective without walking onto it', () => {
  const game = createGame([player, {...player, id:'p2', name:'Rowan'}], options);
  clearEnemies(game);
  const [hero, ally] = game.actors; game.activeActorId = hero.id;
  ally.x = game.chest.x; ally.y = game.chest.y;
  hero.x = game.chest.x - 1; hero.y = game.chest.y - 1;
  assert.equal(getQuestAction(game, hero)!.available, false, 'diagonal proximity is not adjacency');
  hero.y = game.chest.y;
  assert.equal(getQuestAction(game, hero)!.available, true);
  assert.equal(applyAction(game, player.id, {type:'interact'}).chest.opened, true);
});

test('the final gateway is labeled Finish adventure and uses the unchanged victory action', () => {
  const game = newGame(); clearEnemies(game);
  game.scene = 2; game.chest.opened = true; game.relics = 3;
  assert.equal(getQuestAction(game, active(game))!.label, 'Finish adventure');
  assert.equal(getQuestAction(game, active(game))!.hint, 'Move beside the gateway to finish the adventure.');
  const hero = active(game); hero.x = game.exit.x; hero.y = game.exit.y;
  hero.actionUsed = true; hero.movement = 0;
  const quest = getQuestAction(game, hero)!;
  assert.equal(quest.type, 'advance'); assert.equal(quest.available, true);
  const next = applyAction(game, player.id, {type:quest.type});
  assert.equal(next.status, 'victory'); assert.equal(getQuestAction(next, active(next)), null);
});

test('classic natural 1 misses even low AC; natural 20 hits even high AC', () => {
  const game = createGame([player], { ...options, rules: 'classic' });
  game.activeActorId = game.actors[0].id;
  const hero = game.actors[0], enemy = game.actors.find(a => a.enemy)!;
  enemy.x = hero.x + 1; enemy.y = hero.y; enemy.hp = 100; enemy.maxHp = 100; enemy.ac = 1;
  game.rng = 1; // Reproducible natural-1 test fixture.
  const miss = applyAction(game, player.id, { type: 'attack', targetId: enemy.id });
  assert.equal(miss.actors.find(a => a.id === enemy.id)!.hp, 100);
  assert.equal(miss.events.at(-1)!.roll, 1);
  enemy.ac = 99;
  game.rng = 15360; // Reproducible natural-20 test fixture.
  const critical = applyAction(game, player.id, { type: 'attack', targetId: enemy.id });
  assert.ok(critical.actors.find(a => a.id === enemy.id)!.hp < 100);
  assert.equal(critical.events.at(-1)!.roll, 20);
  assert.match(critical.events.at(-1)!.text, /critical/);
});

test('classic death-save natural 1 adds two failures; natural 20 restores a turn', () => {
  const game = createGame([player, { ...player, id: 'p2', name: 'Rowan' }], { ...options, rules: 'classic' });
  const [first, downed] = game.actors;
  game.activeActorId = first.id;
  game.turnOrder = [first.id, downed.id, ...game.actors.filter(a => a.enemy).map(a => a.id)];
  downed.hp = 0;
  game.rng = 1;
  const failed = applyAction(game, player.id, { type: 'end' });
  assert.equal(failed.actors[1].deathFailures, 2);
  assert.equal(failed.actors[1].hp, 0);
  game.rng = 15360;
  const revived = applyAction(game, player.id, { type: 'end' });
  assert.equal(revived.actors[1].hp, 1);
  assert.equal(revived.activeActorId, downed.id);
  assert.equal(revived.actors[1].deathFailures, 0);
});

test('ten-player party has unique spawn squares and bounded enemies/events', () => {
  const players = Array.from({ length: 10 }, (_, i) => ({ ...player, id: `p${i}`, name: `Hero ${i}` }));
  const game = createGame(players, options);
  assert.equal(game.actors.filter(a => !a.enemy).length, 10);
  assert.ok(game.actors.filter(a => a.enemy).length <= 8);
  assert.equal(new Set(game.actors.map(a => `${a.x},${a.y}`)).size, game.actors.length);
  assert.throws(() => createGame([...players, { ...player, id: 'p11' }], options), /1–10/);
});

test('scripted companions can complete adventures without deadlock across both rules modes', () => {
  const heroes: PlayerSpec[] = [
    { ...player, bot: true },
    { ...player, id: 'p2', name: 'Mallow', heroClass: 'cleric', bot: true },
    { ...player, id: 'p3', name: 'Juniper', heroClass: 'ranger', bot: true },
  ];
  let wins = 0;
  for (const rules of ['simple', 'classic'] as const) for (let i = 0; i < 5; i++) {
    let game = createGame(heroes, { ...options, rules, seed: `auto-${i}` });
    for (let n = 0; n < 5 && game.status === 'playing'; n++) game = runBots(game);
    assert.notEqual(game.status, 'playing', `bot deadlock: ${rules}, seed ${i}, scene ${game.scene}, actor ${active(game).name}`);
    assert.ok(game.events.length <= 180);
    if (game.status === 'victory') wins++;
  }
  assert.ok(wins >= 8, `Expected forgiving playable tuning; won ${wins}/10 runs.`);
});
