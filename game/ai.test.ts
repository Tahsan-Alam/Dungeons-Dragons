import assert from 'node:assert/strict';
import test from 'node:test';
import { buildNarrationRequest, classifyFixtureIntent, currentNarration, MockStoryProvider, NARRATION_LIMITS, parseArtSpec } from './ai.ts';
import { createGame } from './engine.ts';
import type { GameState } from './types';

const makeGame = (): GameState => createGame([{ id: 'test-player', name: 'Clover', heroClass: 'knight', color: '#ef997c', bot: false }],
  { rules: 'simple', seed: 'fixture-test', narrator: 'warm', biome: 'woodland', companions: 0 });

test('narration context is bounded, contains only six recent event copies, and omits full state', () => {
  const game = makeGame();
  game.events = Array.from({ length: 30 }, (_, i) => ({ id: i, kind: i === 0 ? 'story' as const : 'action' as const, text: 'A'.repeat(2000) }));
  game.sceneName = 'B'.repeat(1000);
  game.objective = 'C'.repeat(1000);
  const before = structuredClone(game);
  const request = buildNarrationRequest(game);
  assert.equal(request.recentEvents.length, 6);
  assert.equal(request.recentEvents[0].id, 24);
  assert.ok(request.recentEvents.every(event => event.text.length <= 240));
  assert.equal(request.caption.length, NARRATION_LIMITS.caption);
  assert.equal(request.summary.length, NARRATION_LIMITS.summary);
  assert.ok(JSON.stringify(request).length < 4500);
  assert.ok(!('actors' in request) && !('rng' in request) && !('tiles' in request));
  request.recentEvents[0].text = 'Edited copy';
  assert.deepEqual(game, before);
});

test('story and speech use the same committed caption and do not mutate the game', async () => {
  const game = makeGame(), provider = new MockStoryProvider(), before = structuredClone(game);
  const narration = await provider.narrate(buildNarrationRequest(game));
  assert.equal(narration.data.caption, currentNarration(game));
  assert.equal(narration.data.beats.map(beat => beat.text).join(' '), narration.data.caption);
  const speech = await provider.speak({ eventId: narration.data.eventId, caption: narration.data.caption, narrator: game.options.narrator });
  assert.equal(speech.data.caption, narration.data.caption);
  assert.equal(speech.costUsd, 0);
  assert.equal(speech.externalRequest, false);
  assert.equal(speech.provider, 'scripted');
  assert.deepEqual(game, before);
  await assert.rejects(() => provider.speak({ eventId: 1, caption: 'x'.repeat(1201), narrator: 'warm' }), /limit/);
});

test('fixture intent never selects a disallowed, ambiguous or negated action', () => {
  assert.equal(classifyFixtureIntent({ text: 'Attack the imp', allowed: ['attack', 'move'] }).decision, 'attack');
  assert.equal(classifyFixtureIntent({ text: 'Power strike', allowed: ['ability'] }).decision, 'ability');
  for (const text of ['Attack the imp', 'Move and attack', "Don't attack", 'Invent a new spell', '']) {
    assert.equal(classifyFixtureIntent({ text, allowed: ['move'] }).decision, 'clarify');
  }
});

test('art parser rejects executable markup, arbitrary fields and unsafe geometry', () => {
  const good = { kind: 'character', heroClass: 'mage', palette: ['#a3bbf0'], pose: 'idle' };
  assert.deepEqual(parseArtSpec(good), good);
  assert.equal(parseArtSpec({ ...good, svg: '<svg onload="alert(1)"/>' }), null);
  assert.equal(parseArtSpec({ ...good, palette: ['url(https://example.com)'] }), null);
  assert.equal(parseArtSpec({ ...good, pose: 'run-script' }), null);
  assert.equal(parseArtSpec({ kind: 'scene', biome: 'woodland', props: [{ asset: 'tree', x: Infinity, y: 0.5, scale: 1 }] }), null);
  assert.equal(parseArtSpec({ kind: 'scene', biome: 'woodland', props: Array(25).fill({ asset: 'tree', x: 0.5, y: 0.5, scale: 1 }) }), null);
  const parsed = parseArtSpec(good);
  if (parsed?.kind === 'character') parsed.palette[0] = '#000000';
  assert.equal(good.palette[0], '#a3bbf0');
});

test('every fixture artwork result passes the renderer data schema', async () => {
  const provider = new MockStoryProvider();
  for (const heroClass of ['knight', 'ranger', 'mage', 'cleric'] as const) {
    const result = await provider.describeArt({ kind: 'character', heroClass, color: 'invalid' });
    assert.deepEqual(parseArtSpec(result.data), result.data);
  }
  for (const biome of ['woodland', 'ruins', 'coast'] as const) {
    const result = await provider.describeArt({ kind: 'scene', biome });
    assert.deepEqual(parseArtSpec(result.data), result.data);
  }
});
