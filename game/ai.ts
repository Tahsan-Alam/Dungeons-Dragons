import type { Biome, GameAction, GameEvent, GameState, HeroClass, Narrator } from './types';

/** Local integration boundaries. Nothing in this module connects to an AI service. */
export const AI_CAPABILITIES = ['narration', 'decisions', 'art', 'speech'] as const;
export const NARRATION_LIMITS = { recentEvents: 6, eventText: 240, caption: 1200, summary: 900 } as const;
export const DECISION_TYPES = ['move', 'attack', 'ability', 'guard', 'potion', 'end', 'interact', 'advance', 'clarify'] as const;
export type DecisionType = typeof DECISION_TYPES[number];
type ActionType = GameAction['type'];

export interface NarrationRequest {
  eventId: number;
  narrator: Narrator;
  scene: { number: number; name: string; biome: Biome; objective: string };
  recentEvents: Pick<GameEvent, 'id' | 'kind' | 'text'>[];
  summary: string;
  caption: string;
}

export interface NarrationResult {
  eventId: number;
  caption: string;
  beats: { id: string; text: string }[];
}

export interface DecisionRequest {
  text: string;
  /** These are supplied by the caller; a classified action still needs engine validation. */
  allowed: readonly ActionType[];
}
export interface DecisionResult {
  decision: DecisionType;
  reason: string;
  /** A fixture match, not a model probability or a guarantee that an action is legal. */
  matched: boolean;
}

export const ART_PROPS = ['tree', 'rock', 'flower', 'mushroom', 'ruin', 'lantern', 'chest', 'portal'] as const;
export const ART_POSES = ['idle', 'attack', 'guard', 'celebrate'] as const;
export interface SceneProp {
  asset: typeof ART_PROPS[number];
  x: number;
  y: number;
  scale: number;
}
export type ArtSpec =
  | { kind: 'character'; heroClass: HeroClass; palette: string[]; pose: typeof ART_POSES[number] }
  | { kind: 'scene'; biome: Biome; props: SceneProp[] };
export type ArtRequest =
  | { kind: 'character'; heroClass: HeroClass; color: string }
  | { kind: 'scene'; biome: Biome };
export interface SpeechRequest { caption: string; narrator: Narrator; eventId: number; }
export interface SpeechResult extends SpeechRequest { playback: 'browser-speech'; }

export interface ProviderResult<T> {
  data: T;
  provider: string;
  model: string | null;
  costUsd: number;
  externalRequest: boolean;
}

export interface FixtureResult<T> extends ProviderResult<T> {
  data: T;
  provider: 'scripted';
  model: null;
  costUsd: 0;
  externalRequest: false;
}

export interface StoryProvider {
  narrate(request: NarrationRequest): Promise<ProviderResult<NarrationResult>>;
  decide(request: DecisionRequest): Promise<ProviderResult<DecisionResult>>;
  describeArt(request: ArtRequest): Promise<ProviderResult<ArtSpec>>;
  speak(request: SpeechRequest): Promise<ProviderResult<SpeechResult>>;
}

const HERO_CLASSES: readonly HeroClass[] = ['knight', 'ranger', 'mage', 'cleric'];
const BIOMES: readonly Biome[] = ['woodland', 'ruins', 'coast'];
const COLOR = /^#[\da-f]{6}$/i;
const fixture = <T>(data: T): FixtureResult<T> => ({ data, provider: 'scripted', model: null, costUsd: 0, externalRequest: false });
const boundedText = (text: string, limit: number) => text.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);

/** Shared caption for the story panel and optional speech; uses committed story events. */
export function currentNarration(game: GameState): string {
  const accepted=game.story?.narrations.find(n=>n.eventId===game.eventSequence);
  if(accepted)return accepted.caption;
  const story = [...game.events].reverse().find(event => event.kind === 'story');
  return boundedText(story?.text ?? `${game.sceneName}. ${game.objective}`, NARRATION_LIMITS.caption);
}

/** Deliberately omits the full map, random-generator state, player credentials and history. */
export function buildNarrationRequest(game: GameState): NarrationRequest {
  const recentEvents = game.events.slice(-NARRATION_LIMITS.recentEvents).map(event => ({
    id: event.id,
    kind: event.kind,
    text: boundedText(event.text, NARRATION_LIMITS.eventText),
  }));
  return {
    eventId: game.eventSequence,
    narrator: game.options.narrator,
    scene: { number: game.scene, name: boundedText(game.sceneName, 100), biome: game.options.biome, objective: boundedText(game.objective, 240) },
    recentEvents,
    summary: boundedText(recentEvents.map(event => event.text).join(' '), NARRATION_LIMITS.summary),
    caption: currentNarration(game),
  };
}

const INTENT_PATTERNS: Record<ActionType, RegExp> = {
  move: /\b(move|walk|run|rush|step)\b/i,
  attack: /\b(attack|strike|hit|shoot)\b/i,
  ability: /\b(ability|spell|cast|heal|power strike|aimed shot|arcane burst|healing light)\b/i,
  guard: /\b(guard|defend|dodge|protect)\b/i,
  potion: /\b(potion|drink)\b/i,
  end: /\b(end|finish|pass)(?:\s+(?:my|the))?\s+turn\b/i,
  interact: /\b(interact|open|collect|loot)\b/i,
  advance: /\b(advance|gateway|portal|next scene)\b/i,
};

/** Conservative demo classifier. It returns an intent only, never a game action. */
export function classifyFixtureIntent(request: DecisionRequest): DecisionResult {
  const text = boundedText(request.text, 600);
  const clarify = (reason: string): DecisionResult => ({ decision: 'clarify', reason, matched: false });
  if (!text || /\b(not|never|don't|do not|rather than|without)\b/i.test(text)) return clarify('Choose an action button to make your intention clear.');
  const matches = (Object.keys(INTENT_PATTERNS) as ActionType[]).filter(type => INTENT_PATTERNS[type].test(text));
  // Named abilities include words such as "strike"; the full ability name is more specific.
  if (matches.includes('ability') && /\b(power strike|aimed shot|arcane burst|healing light)\b/i.test(text)) {
    const attack = matches.indexOf('attack');
    if (attack !== -1) matches.splice(attack, 1);
  }
  if (matches.length !== 1) return clarify('This demo needs one clear action at a time.');
  const decision = matches[0];
  if (!request.allowed.includes(decision)) return clarify('That action is not available in this context.');
  return { decision, reason: 'Matched a scripted phrase; choose any required target before acting.', matched: true };
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}
const keysAre = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).length === keys.length && Object.keys(value).every(key => keys.includes(key));
const inRange = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

/** Accept only known SVG component data. Extra fields, markup and executable code fail. */
export function parseArtSpec(value: unknown): ArtSpec | null {
  if (!record(value)) return null;
  if (value.kind === 'character') {
    if (!keysAre(value, ['kind', 'heroClass', 'palette', 'pose']) || !HERO_CLASSES.includes(value.heroClass as HeroClass)
      || !ART_POSES.includes(value.pose as typeof ART_POSES[number]) || !Array.isArray(value.palette)
      || value.palette.length < 1 || value.palette.length > 4 || !value.palette.every(color => typeof color === 'string' && COLOR.test(color))) return null;
    return { kind: 'character', heroClass: value.heroClass as HeroClass, palette: [...value.palette], pose: value.pose as typeof ART_POSES[number] };
  }
  if (value.kind === 'scene') {
    if (!keysAre(value, ['kind', 'biome', 'props']) || !BIOMES.includes(value.biome as Biome) || !Array.isArray(value.props) || value.props.length > 24) return null;
    const props: SceneProp[] = [];
    for (const prop of value.props) {
      if (!record(prop) || !keysAre(prop, ['asset', 'x', 'y', 'scale']) || !ART_PROPS.includes(prop.asset as typeof ART_PROPS[number])
        || !inRange(prop.x, 0, 1) || !inRange(prop.y, 0, 1) || !inRange(prop.scale, 0.25, 2)) return null;
      props.push({ asset: prop.asset as typeof ART_PROPS[number], x: prop.x, y: prop.y, scale: prop.scale });
    }
    return { kind: 'scene', biome: value.biome as Biome, props };
  }
  return null;
}

/** Async shape lets a later server provider replace fixtures without changing the game engine. */
export class MockStoryProvider implements StoryProvider {
  async narrate(request: NarrationRequest): Promise<FixtureResult<NarrationResult>> {
    const caption = boundedText(request.caption, NARRATION_LIMITS.caption);
    const sentences = caption.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g)?.map(text => text.trim()).filter(Boolean) ?? [caption];
    const beats = sentences.slice(0, 7);
    if (sentences.length > 7) beats.push(sentences.slice(7).join(' '));
    return fixture({ eventId: request.eventId, caption, beats: beats.map((text, index) => ({ id: `${request.eventId}:${index}`, text })) });
  }

  async decide(request: DecisionRequest): Promise<FixtureResult<DecisionResult>> {
    return fixture(classifyFixtureIntent(request));
  }

  async describeArt(request: ArtRequest): Promise<FixtureResult<ArtSpec>> {
    if (request.kind === 'character') {
      const spec = parseArtSpec({ kind: 'character', heroClass: request.heroClass, palette: [COLOR.test(request.color) ? request.color : '#ef997c', '#29372d'], pose: 'idle' });
      if (!spec) throw new Error('Choose a supported character class.');
      return fixture(spec);
    }
    const asset = request.biome === 'woodland' ? 'tree' : request.biome === 'ruins' ? 'ruin' : 'rock';
    const spec = parseArtSpec({ kind: 'scene', biome: request.biome, props: [{ asset, x: 0.15, y: 0.4, scale: 1 }, { asset: 'lantern', x: 0.75, y: 0.5, scale: 0.75 }] });
    if (!spec) throw new Error('Choose a supported scene.');
    return fixture(spec);
  }

  async speak(request: SpeechRequest): Promise<FixtureResult<SpeechResult>> {
    // No audio generation here: the client may read this exact caption with browser speech.
    // Reject rather than silently truncate, so voice and the displayed caption remain identical.
    if (request.caption.length > NARRATION_LIMITS.caption) throw new Error('Narration exceeds the speech caption limit.');
    return fixture({ caption: request.caption, narrator: request.narrator, eventId: request.eventId, playback: 'browser-speech' });
  }
}
