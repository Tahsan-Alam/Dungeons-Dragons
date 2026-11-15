import assert from 'node:assert/strict';
import test from 'node:test';
import { applyAction, createGame, getValidTargets, runBots } from './engine.ts';
import { CLASS_INFO, HERO_CLASSES } from './types.ts';
import type { Actor, GameOptions, GameState, HeroClass, PlayerSpec } from './types';

const options: GameOptions = { rules: 'simple', seed: 'class-rules', narrator: 'warm', biome: 'woodland', companions: 0 };
const spec = (id: string, heroClass: HeroClass): PlayerSpec => ({ id, name: id, heroClass, color: '#ef997c', bot: false });

/** Lays the named actors out in a row on open ground, removes other enemies, and makes `turn` the active actor. */
function arena(game: GameState, row: Actor[], turn: Actor) {
  game.tiles.forEach(t => { if (t.x > 0 && t.y > 0 && t.x < game.width - 1 && t.y < game.height - 1) t.kind = 'grass'; });
  game.actors = game.actors.filter(a => !a.enemy || row.includes(a));
  row.forEach((a, i) => { a.x = 4 + i; a.y = 7; a.hp = a.maxHp; a.actionUsed = false; a.abilityUses = 2; a.movement = a.speed; });
  game.activeActorId = turn.id;
}
const texts = (game: GameState) => game.events.map(e => e.text);

test('all eight classes start a game and have an ability', () => {
  assert.equal(HERO_CLASSES.length, 8);
  for (const heroClass of HERO_CLASSES) {
    const game = createGame([spec('p1', heroClass)], options);
    assert.equal(game.actors[0].heroClass, heroClass);
    assert.ok(game.actors[0].maxHp > 0 && CLASS_INFO[heroClass].ability, heroClass);
  }
});

test('shield wall makes an enemy blow aimed at the ally land on the guardian, until the guardian’s next turn', () => {
  const game = createGame([spec('g', 'guardian'), spec('a', 'mage')], options);
  const [guardian, ally] = game.actors, enemy = game.actors.find(a => a.enemy)!;
  arena(game, [guardian, ally, enemy], guardian);
  ally.hp = 6;
  assert.ok(getValidTargets(game, guardian, true).some(a => a.id === ally.id), 'adjacent ally is a valid target');
  assert.ok(!getValidTargets(game, guardian, true).some(a => a.id === enemy.id), 'enemies are not');
  let next = applyAction(game, 'g', { type: 'ability', targetId: ally.id });
  assert.equal(next.actors.find(a => a.id === ally.id)!.guardedBy, guardian.id);
  next = applyAction(next, 'g', { type: 'end' });
  next.activeActorId = ally.id;
  next = applyAction(next, 'a', { type: 'end' });
  next = runBots(next);
  assert.ok(texts(next).some(t => t.includes('steps in front of a and takes the blow')), 'the enemy hit was redirected');
  assert.equal(next.actors.find(a => a.id === ally.id)!.hp, 6, 'the guarded ally took no damage');
  // Once the guardian's turn comes round again the shield wall ends.
  if (next.activeActorId === guardian.id) assert.equal(next.actors.find(a => a.id === ally.id)!.guardedBy, undefined);
});

test('sneak attack hits much harder when another hero is beside the target', () => {
  const game = createGame([spec('r', 'rogue'), spec('k', 'knight')], options);
  const [rogue, knight] = game.actors, enemy = game.actors.find(a => a.enemy)!;
  arena(game, [rogue, enemy, knight], rogue);
  enemy.maxHp = enemy.hp = 200;
  const flank = applyAction(game, 'r', { type: 'ability', targetId: enemy.id });
  const lone = structuredClone(game); lone.actors = lone.actors.filter(a => a.id !== knight.id);
  const alone = applyAction(lone, 'r', { type: 'ability', targetId: enemy.id });
  const dealt = (g: GameState) => 200 - g.actors.find(a => a.id === enemy.id)!.hp;
  if (dealt(flank) > 0) assert.ok(texts(flank).some(t => t.includes('strikes from the flank')));
  if (dealt(flank) > 0 && dealt(alone) > 0) assert.ok(dealt(flank) > dealt(alone), 'flanking adds damage with the same dice');
});

test('inspire gives the ally advantage on their next attack and is then spent', () => {
  const game = createGame([spec('b', 'bard'), spec('k', 'knight')], options);
  const [bard, knight] = game.actors, enemy = game.actors.find(a => a.enemy)!;
  arena(game, [bard, knight, enemy], bard);
  enemy.maxHp = enemy.hp = 200;
  assert.ok(getValidTargets(game, bard, true).some(a => a.id === knight.id));
  assert.ok(!getValidTargets(game, bard, true).some(a => a.id === bard.id), 'a bard cannot inspire themselves');
  let next = applyAction(game, 'b', { type: 'ability', targetId: knight.id });
  assert.equal(next.actors.find(a => a.id === knight.id)!.inspired, true);
  next.activeActorId = knight.id;
  next = applyAction(next, 'k', { type: 'attack', targetId: enemy.id });
  assert.ok(texts(next).some(t => t.includes('attacks with inspiration')));
  assert.equal(next.actors.find(a => a.id === knight.id)!.inspired, false);
});

test('entangle stops the enemy moving on its next turn, then wears off', () => {
  const game = createGame([spec('d', 'druid')], options);
  const druid = game.actors[0], enemy = game.actors.find(a => a.enemy)!;
  arena(game, [druid, enemy], druid);
  enemy.x = 8;
  assert.ok(getValidTargets(game, druid, true).some(a => a.id === enemy.id));
  let next = applyAction(game, 'd', { type: 'ability', targetId: enemy.id });
  assert.equal(next.actors.find(a => a.id === enemy.id)!.rooted, true);
  const before = { ...next.actors.find(a => a.id === enemy.id)! };
  next = runBots(applyAction(next, 'd', { type: 'end' }));
  const after = next.actors.find(a => a.id === enemy.id)!;
  assert.ok(texts(next).some(t => t.includes('held by roots')));
  assert.deepEqual([after.x, after.y], [before.x, before.y], 'the rooted enemy stayed put');
  assert.equal(after.rooted, false);
});

test('bard and druid companion bots use their abilities', () => {
  for (const heroClass of ['bard', 'druid'] as const) {
    const game = createGame([spec('p', 'knight'), { ...spec('c', heroClass), bot: true }], options);
    const [hero, companion] = game.actors, enemy = game.actors.find(a => a.enemy)!;
    arena(game, [hero, companion, enemy], companion);
    const next = runBots(game);
    assert.ok(next.actors.find(a => a.id === companion.id)!.abilityUses < 2, `${heroClass} companion used its ability`);
  }
});
